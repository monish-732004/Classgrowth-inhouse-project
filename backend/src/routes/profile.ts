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

  const profileText = `${branch} year ${year} CGPA ${cgpa_band} interested in ${career_tracks.join(', ')}`;
  const embedding = await embedText(profileText);
  const embeddingLiteral = `[${embedding.join(',')}]`;

  await supabase.from('student_profiles').upsert({
    user_id:           user.id,
    branch,
    year,
    cgpa_band,
    career_tracks,
    profile_embedding: embeddingLiteral,
    updated_at:        new Date().toISOString(),
  }, { onConflict: 'user_id' });

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
