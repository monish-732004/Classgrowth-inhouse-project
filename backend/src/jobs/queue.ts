import { runDailyLinkHealthCheck } from '../services/linkCheck.js';
import net from 'net';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Parse host/port from redis URL
function parseRedis(url: string): { host: string; port: number } {
  try {
    const u = new URL(url);
    return { host: u.hostname || '127.0.0.1', port: Number(u.port) || 6379 };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

// Probe Redis with a raw TCP connect — resolves true/false in <500 ms
function redisReachable(): Promise<boolean> {
  return new Promise(resolve => {
    const { host, port } = parseRedis(redisUrl);
    const sock = net.createConnection({ host, port });
    const done = (ok: boolean) => { sock.destroy(); resolve(ok); };
    sock.setTimeout(500);
    sock.on('connect', () => done(true));
    sock.on('error',   () => done(false));
    sock.on('timeout', () => done(false));
  });
}

// Null stubs — used when Redis is unavailable
export let remindersQueue:   { add: (...a: any[]) => Promise<any> } | null = null;
export let linkHealthQueue:  { add: (...a: any[]) => Promise<any> } | null = null;
export let activeHoursQueue: { add: (...a: any[]) => Promise<any> } | null = null;
export let digestQueue:      { add: (...a: any[]) => Promise<any> } | null = null;

export async function startJobQueues() {
  const ok = await redisReachable();
  if (!ok) {
    console.warn('Redis not reachable — job queues disabled (deadline reminders & link checks will not run).');
    return;
  }

  // Dynamically import Bull only when Redis is available
  const Bull = (await import('bull')).default;

  linkHealthQueue  = new Bull('link-health',  redisUrl);
  remindersQueue   = new Bull('reminders',    redisUrl);
  activeHoursQueue = new Bull('active-hours', redisUrl);
  digestQueue      = new Bull('digest',       redisUrl);

  (linkHealthQueue as any).process(async () => { await runDailyLinkHealthCheck(); });

  (remindersQueue as any).process(async (job: any) => {
    const { postId, token, title, hoursLeft } = job.data;
    const { sendPush } = await import('../services/notifications.js');
    const urgencyLabel =
      hoursLeft <= 2  ? 'Due in 2 hours!'  :
      hoursLeft <= 24 ? 'Due today!'        :
      hoursLeft <= 72 ? 'Due in 3 days'     : 'Coming up';
    await sendPush(token, `⏰ ${urgencyLabel}`, title, { postId, url: `/post/${postId}` });
  });

  (activeHoursQueue as any).process(async () => {
    const { supabase } = await import('../db/client.js');
    const { data: users } = await supabase.from('profiles').select('id').eq('role', 'student');
    for (const { id } of users ?? []) {
      const { data: sessions } = await supabase
        .from('sessions').select('started_at').eq('user_id', id)
        .gte('started_at', new Date(Date.now() - 90 * 86400 * 1000).toISOString());
      const buckets: Record<string, number> = {};
      for (const s of sessions ?? []) {
        const d = new Date(s.started_at);
        const key = String(d.getUTCDay() * 24 + d.getUTCHours());
        buckets[key] = (buckets[key] ?? 0) + 1;
      }
      await supabase.from('student_profiles')
        .upsert({ user_id: id, active_hours_json: buckets }, { onConflict: 'user_id' });
    }
  });

  linkHealthQueue.add({},  { repeat: { cron: '0 2 * * *' }, removeOnComplete: 10 });
  activeHoursQueue.add({}, { repeat: { cron: '0 3 * * 0' }, removeOnComplete: 5  });

  console.log('Job queues started');
}
