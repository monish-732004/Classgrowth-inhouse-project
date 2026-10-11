import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../db/client.js';

export const actionsRouter = Router();

const ActionBody = z.object({
  post_id:           z.string().uuid(),
  status:            z.enum(['saved', 'interested', 'applied', 'shortlisted', 'selected']),
  is_shared_with_fa: z.boolean().optional().default(false),
});

// PUT /actions — upsert action for the logged-in student
actionsRouter.put('/', requireAuth, async (req, res) => {
  const user = (req as any).user as { id: string };
  const parsed = ActionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { post_id, status, is_shared_with_fa } = parsed.data;

  const { error } = await supabase.from('post_actions').upsert(
    { user_id: user.id, post_id, status, is_shared_with_fa, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,post_id' }
  );

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// DELETE /actions/:postId — remove action
actionsRouter.delete('/:postId', requireAuth, async (req, res) => {
  const user = (req as any).user as { id: string };
  const { error } = await supabase
    .from('post_actions')
    .delete()
    .eq('user_id', user.id)
    .eq('post_id', req.params.postId);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// GET /actions — fetch all actions for the logged-in student
actionsRouter.get('/', requireAuth, async (req, res) => {
  const user = (req as any).user as { id: string };
  const { data } = await supabase
    .from('post_actions')
    .select('post_id, status, is_shared_with_fa, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  res.json(data ?? []);
});
