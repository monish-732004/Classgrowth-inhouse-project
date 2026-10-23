import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../db/client.js';
import { embedText } from '../services/embedding.js';

export const profileRouter = Router();

const ProfileBody = z.object({
  branch:        z.string().min(1),
  year:          z.number().int().min(1).max(5),
  cgpa_band:     z.string(),
  career_tracks: z.array(z.string()),
});

// PUT /profile — upsert student profile + generate embedding
profileRouter.put('/', requireAuth, async (req, res) => {
  const user = (req as any).user as { id: string };
  const parsed = ProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { branch, year, cgpa_band, career_tracks } = parsed.data;

  // Try to generate an embedding — non-fatal if the embedding service is down
  let embeddingLiteral: string | undefined;
  try {
    const profileText = `${branch} year ${year} CGPA ${cgpa_band} interested in ${career_tracks.join(', ')}`;
    const embedding = await embedText(profileText);
    embeddingLiteral = `[${embedding.join(',')}]`;
  } catch {
    // Profile saves successfully without an embedding; search quality degrades gracefully
  }

  const row: Record<string, unknown> = {
    user_id: user.id, branch, year, cgpa_band, career_tracks,
    updated_at: new Date().toISOString(),
  };
  if (embeddingLiteral) row.profile_embedding = embeddingLiteral;

  const { error: upsertError } = await supabase
    .from('student_profiles')
    .upsert(row, { onConflict: 'user_id' });

  if (upsertError) {
    console.error('[profile PUT] upsert error:', upsertError);
    res.status(500).json({ error: upsertError.message });
    return;
  }

  res.json({ ok: true });
});

// GET /profile — fetch student profile
profileRouter.get('/', requireAuth, async (req, res) => {
  const user = (req as any).user as { id: string };
  const { data } = await supabase
    .from('student_profiles')
    .select('branch, year, cgpa_band, career_tracks, active_hours_json, updated_at')
    .eq('user_id', user.id)
    .single();
  res.json(data ?? null);
});
