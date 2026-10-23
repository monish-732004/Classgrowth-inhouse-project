import { supabase } from '@/integrations/supabase/client';

const isBrowser = typeof window !== 'undefined';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!isBrowser) return null;
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.error('[WebPush] VITE_VAPID_PUBLIC_KEY is not set');
    return null;
  }

  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      subscription: JSON.stringify(subscription),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }

  // Return a token-like string so callers can treat it the same as an FCM token
  return subscription.endpoint;
};

// Uses Supabase Realtime to surface new posts as foreground notifications
export const onMessageListener = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!isBrowser) return resolve(null);

    const channel = supabase
      .channel('posts-foreground')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          resolve({
            notification: {
              title: (payload.new as any)?.title ?? 'New post',
              body: (payload.new as any)?.summary ?? '',
            },
            data: payload.new,
          });
          supabase.removeChannel(channel);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') reject(new Error('Realtime channel error'));
      });
  });
};
