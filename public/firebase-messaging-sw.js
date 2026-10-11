// Import and configure Firebase in the service worker
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

console.log('[Service Worker] Firebase Messaging Service Worker loaded');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA30VylbmuXfslVKVeXXft00xQTGtCBmJc",
  authDomain: "classgrowth-73185.firebaseapp.com",
  projectId: "classgrowth-73185",
  storageBucket: "classgrowth-73185.appspot.com",
  messagingSenderId: "261993748709",
  appId: "1:261993748709:web:0817f7d40c911eed1f1c0c"
};

console.log('[Service Worker] Initializing Firebase...');

// Initialize Firebase
console.log('[Service Worker] Initializing Firebase app...');
firebase.initializeApp(firebaseConfig);

console.log('[Service Worker] Getting Firebase Messaging instance...');
const messaging = firebase.messaging();

console.log('[Service Worker] Firebase Messaging initialized');

// Set up background message handler
console.log('[Service Worker] Setting up background message handler...');

// This will be called when a message is received while the app is in the background
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Received background message:', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: payload.data || {},
    // Add actions if needed
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  console.log('[Service Worker] Showing notification:', notificationTitle);
  
  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('[Service Worker] Notification shown successfully');
    })
    .catch(error => {
      console.error('[Service Worker] Error showing notification:', error);
    });
});

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/logo192.png', // Replace with your app icon
    badge: '/logo192.png', // Badge for mobile
    data: payload.data || {}
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  // Close the notification popup
  event.notification.close();
  
  // Get the URL from the notification data or use a default
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;
  
  // Handle action buttons
  if (event.action === 'view') {
    console.log('[Service Worker] View action clicked');
    // Handle view action
  } else if (event.action === 'dismiss') {
    console.log('[Service Worker] Dismiss action clicked');
    // Handle dismiss action
    return;
  }

  // This looks to see if the current tab is already open and focuses it if it is
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true
    })
    .then((windowClients) => {
      console.log('[Service Worker] Found window clients:', windowClients);
      
      // Check if there's already a window/tab open with the target URL
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          console.log('[Service Worker] Focusing existing window:', client.url);
          return client.focus();
        }
      }
      
      // If no matching tab is open, open a new tab
      if (clients.openWindow) {
        console.log('[Service Worker] Opening new window:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
    .catch(error => {
      console.error('[Service Worker] Error in notification click handler:', error);
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);
});
