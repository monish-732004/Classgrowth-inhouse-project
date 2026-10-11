import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { supabase } from '../db/client.js';

export const analyticsRouter = Router();

const PostIdParam = z.object({ postId: z.string().uuid() });

// Per-post analytics: reach, click-through rate, action breakdown
analyticsRouter.get(
  '/post/:postId',
  requireAuth,
  requireRole('fa', 'co_fa', 'admin'),
  async (req, res) => {
    const parsed = PostIdParam.safeParse(req.params);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid postId' }); return; }

    const { postId } = parsed.data;

    // Total members in the section this post belongs to
    const { data: post } = await supabase
      .from('posts')
      .select('section_id')
      .eq('id', postId)
      .single();

    const { count: sectionSize } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', post?.section_id ?? '');

    const { count: views } = await supabase
      .from('post_views')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    const { count: clicks } = await supabase
      .from('post_views')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .not('clicked_at', 'is', null);

    // Action breakdown
    const { data: actions } = await supabase
      .from('post_actions')
      .select('status')
      .eq('post_id', postId);

    const breakdown = (actions ?? []).reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      postId,
      sectionSize: sectionSize ?? 0,
      views: views ?? 0,
      clicks: clicks ?? 0,
      reach:  sectionSize ? ((views ?? 0) / sectionSize) : 0,
      ctr:    (views ?? 0) > 0 ? ((clicks ?? 0) / (views ?? 0)) : 0,
      actions: breakdown,
    });
  }
);

// Section-level analytics: most engaged students, best categories, time heatmap
analyticsRouter.get(
  '/section',
  requireAuth,
  requireRole('fa', 'co_fa', 'admin'),
  async (req, res) => {
    const user = (req as any).user as { id: string };

    const { data: profile } = await supabase
      .from('profiles')
      .select('section_id')
      .eq('id', user.id)
      .single();

    if (!profile?.section_id) { res.status(400).json({ error: 'Not assigned to a section' }); return; }

    // Most engaged: students with highest view + click counts
    const { data: topStudents } = await supabase
      .from('post_views')
      .select('user_id, profiles(full_name)', { count: 'exact' })
      .in(
        'post_id',
        (await supabase.from('posts').select('id').eq('section_id', profile.section_id)).data?.map(p => p.id) ?? []
      )
      .limit(10);

    res.json({ sectionId: profile.section_id, topStudents: topStudents ?? [] });
  }
);
