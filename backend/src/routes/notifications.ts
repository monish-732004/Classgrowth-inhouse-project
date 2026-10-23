import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../db/client.js';
import { remindersQueue } from '../jobs/queue.js';

export const notificationsRouter = Router();

// Register / update FCM token for the logged-in user
const TokenBody = z.object({ token: z.string().min(10) });

notificationsRouter.post('/token', requireAuth, async (req, res) => {
  const user = (req as any).user as { id: string };
  const parsed = TokenBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid token' }); return; }

  await supabase
    .from('profiles')
    .update({ fcm_token: parsed.data.token })
    .eq('id', user.id);

  res.json({ ok: true });
});

// Schedule a deadline reminder for a specific post + user (called at post publish)
const ScheduleBody = z.object({
  postId:   z.string().uuid(),
  deadline: z.string().datetime(),
  title:    z.string(),
});

notificationsRouter.post('/schedule', requireAuth, async (req, res) => {
  const user = (req as any).user as { id: string };
  const parsed = ScheduleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { postId, deadline, title } = parsed.data;
  const deadlineMs = new Date(deadline).getTime();
  const now = Date.now();

  const { data: profile } = await supabase
    .from('profiles')
    .select('fcm_token, role')
    .eq('id', user.id)
    .single();

  if (!profile?.fcm_token) { res.json({ ok: true, scheduled: 0 }); return; }

  // Schedule at T-7d, T-3d, T-1d, T-2h (skip if already past)
  const OFFSETS_MS = [7 * 86400000, 3 * 86400000, 86400000, 2 * 3600000];
  let scheduled = 0;
  for (const offset of OFFSETS_MS) {
    const fireAt = deadlineMs - offset;
    if (fireAt > now) {
      const hoursLeft = offset / 3600000;
      await remindersQueue?.add(
        { postId, userId: user.id, token: profile.fcm_token, title, hoursLeft },
        { delay: fireAt - now, attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      );
      scheduled++;
    }
  }

  res.json({ ok: true, scheduled });
});
