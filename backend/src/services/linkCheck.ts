import { supabase } from '../db/client.js';

export async function checkPostLink(postId: string, url: string) {
  let status: 'ok' | 'dead' | 'redirect_login' = 'ok';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);

    if (res.status === 404 || res.status >= 500) {
      status = 'dead';
    } else {
      const finalUrl = res.url.toLowerCase();
      if (finalUrl.includes('login') || finalUrl.includes('signin')) status = 'redirect_login';
    }
  } catch {
    status = 'dead';
  }

  await supabase
    .from('posts')
    .update({ link_status: status, link_checked_at: new Date().toISOString() })
    .eq('id', postId);

  return status;
}

// Called by the daily cron job — checks all non-archived posts
export async function runDailyLinkHealthCheck() {
  const { data: posts } = await supabase
    .from('posts')
    .select('id, link')
    .eq('is_archived', false);

  if (!posts) return;

  // Run in batches of 10 to avoid hammering external servers
  for (let i = 0; i < posts.length; i += 10) {
    const batch = posts.slice(i, i + 10);
    await Promise.all(batch.map(p => checkPostLink(p.id, p.link)));
  }
}
