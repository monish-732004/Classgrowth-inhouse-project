// Service worker for Web Push notifications (no Firebase dependency)

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'ClassGrowth', body: event.data?.text() ?? 'New notification' };
  }

  const title = data.title || 'ClassGrowth';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    data: { url: data.url || '/dashboard' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

self.addEventListener('notificationclose', () => {});
