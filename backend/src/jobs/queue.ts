import Bull from 'bull';
import { runDailyLinkHealthCheck } from '../services/linkCheck.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const linkHealthQueue = new Bull('link-health', redisUrl);
export const remindersQueue   = new Bull('reminders',    redisUrl);
export const activeHoursQueue = new Bull('active-hours', redisUrl);
export const digestQueue      = new Bull('digest',       redisUrl);

// ── Processors ──────────────────────────────────────────────

linkHealthQueue.process(async () => {
  await runDailyLinkHealthCheck();
});

remindersQueue.process(async (job) => {
  const { postId, userId, token, title, hoursLeft } = job.data as {
    postId: string; userId: string; token: string;
    title: string; hoursLeft: number;
  };
  const { sendPush } = await import('../services/notifications.js');
  const urgencyLabel =
    hoursLeft <= 2  ? 'Due in 2 hours!'  :
    hoursLeft <= 24 ? 'Due today!'        :
    hoursLeft <= 72 ? 'Due in 3 days'     : 'Coming up';

  await sendPush(token, `⏰ ${urgencyLabel}`, title, { postId, url: `/post/${postId}` });
});

activeHoursQueue.process(async () => {
  const { supabase } = await import('../db/client.js');

  // Compute active_hours_json for every student based on the last 90 days of sessions.
  // Each of the 168 buckets (0–167) = day_of_week * 24 + hour_of_day (UTC).
  const { data: users } = await supabase.from('profiles').select('id').eq('role', 'student');
  if (!users) return;

  for (const { id } of users) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('started_at')
      .eq('user_id', id)
      .gte('started_at', new Date(Date.now() - 90 * 86400 * 1000).toISOString());

    const buckets: Record<string, number> = {};
    for (const s of sessions ?? []) {
      const d = new Date(s.started_at);
      const bucket = String(d.getUTCDay() * 24 + d.getUTCHours());
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    }

    await supabase
      .from('student_profiles')
      .upsert({ user_id: id, active_hours_json: buckets }, { onConflict: 'user_id' });
  }
});

// ── Scheduler (cron-like recurring jobs) ─────────────────────

export function startJobQueues() {
  // Daily link health check — 2 AM UTC
  linkHealthQueue.add({}, { repeat: { cron: '0 2 * * *' }, removeOnComplete: 10 });

  // Weekly active-hours recompute — Sunday 3 AM UTC
  activeHoursQueue.add({}, { repeat: { cron: '0 3 * * 0' }, removeOnComplete: 5 });

  console.log('Job queues started');
}
