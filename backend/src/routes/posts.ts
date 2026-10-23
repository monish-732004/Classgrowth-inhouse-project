import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { supabase } from '../db/client.js';
import { embedText } from '../services/embedding.js';
import { checkPostLink } from '../services/linkCheck.js';
import { remindersQueue } from '../jobs/queue.js';

export const postsRouter = Router();

// POST /posts/:id/embed — called after FA publishes a post
postsRouter.post(
  '/:id/embed',
  requireAuth,
  requireRole('fa', 'co_fa', 'cr', 'admin'),
  async (req, res) => {
    const { id } = req.params;

    const { data: post } = await supabase
      .from('posts')
      .select('title, summary, category, link, deadline')
      .eq('id', id)
      .single();

    if (!post) { res.status(404).json({ error: 'Post not found' }); return; }

    const text = `${post.title} ${post.summary} ${post.category}`;
    const embedding = await embedText(text);

    // Link health check
    const linkStatus = post.link ? await checkPostLink(id, post.link) : 'ok';

    // Store embedding as a formatted Postgres literal
    const embeddingLiteral = `[${embedding.join(',')}]`;
    await supabase
      .from('posts')
      .update({
        post_embedding: embeddingLiteral,
        link_status: linkStatus,
        link_checked_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Schedule deadline reminders for all section members who have FCM tokens
    if (post.deadline) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, fcm_token')
        .not('fcm_token', 'is', null);

      for (const profile of profiles ?? []) {
        const deadlineMs = new Date(post.deadline).getTime();
        const now = Date.now();
        const OFFSETS_MS = [7 * 86400000, 3 * 86400000, 86400000, 2 * 3600000];
        for (const offset of OFFSETS_MS) {
          const fireAt = deadlineMs - offset;
          if (fireAt > now) {
            await remindersQueue?.add(
              { postId: id, userId: profile.id, token: profile.fcm_token, title: post.title, hoursLeft: offset / 3600000 },
              { delay: fireAt - now, attempts: 3 }
            );
          }
        }
      }
    }

    res.json({ ok: true, linkStatus });
  }
);

// GET /posts/for-you — personalized feed using pgvector cosine similarity
postsRouter.get('/for-you', requireAuth, async (req, res) => {
  const user = (req as any).user as { id: string };

  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('profile_embedding, career_tracks')
    .eq('user_id', user.id)
    .single();

  if (!studentProfile?.profile_embedding) {
    // Fall back to recency if no profile embedding yet
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(30);
    res.json({ posts: posts ?? [], source: 'recency' });
    return;
  }

  // Raw pgvector similarity query via rpc
  const embeddingVec = studentProfile.profile_embedding as unknown as number[];
  const { data: posts, error } = await supabase.rpc('for_you_feed', {
    p_user_id: user.id,
    p_embedding: `[${embeddingVec.join(',')}]`,
    p_limit: 30,
  });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ posts: posts ?? [], source: 'personalized' });
});

// GET /posts/search?q=... — semantic + full-text search
postsRouter.get('/search', requireAuth, async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) { res.json({ posts: [], source: 'fts' }); return; }

  // Try semantic search for longer queries; fall back to FTS if embedding service is down
  if (q.split(/\s+/).length > 2) {
    try {
      const embedding = await embedText(q);
      const { data: posts, error } = await supabase.rpc('semantic_search', {
        p_embedding: `[${embedding.join(',')}]`,
        p_limit: 20,
      });
      if (!error) {
        res.json({ posts: posts ?? [], source: 'semantic' });
        return;
      }
    } catch {
      // Embedding service unavailable — fall through to FTS
    }
  }

  // Full-text search (always works)
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .textSearch('fts', q, { type: 'websearch', config: 'english' })
    .eq('is_archived', false)
    .limit(20);

  res.json({ posts: posts ?? [], source: 'fts' });
});
