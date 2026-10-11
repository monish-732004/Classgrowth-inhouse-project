import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTHDOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECTID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGEBUCKET,
  messagingSenderId: "261993748709",
  appId: import.meta.env.VITE_FIREBASE_APPID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENTID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging: Messaging | null = null;

const initMessaging = async (): Promise<Messaging | null> => {
  if (!isBrowser) {
    console.log('[FCM] Not in browser environment, skipping initialization');
    return null;
  }

  try {
    console.log('[FCM] Checking browser support...');
    const isFcmSupported = await isSupported();
    console.log(`[FCM] Firebase Messaging supported: ${isFcmSupported}`);
    
    if (!isFcmSupported) {
      console.error('[FCM] Firebase Messaging is not supported in this browser');
      return null;
    }

    if (!('serviceWorker' in navigator)) {
      console.error('[FCM] Service Worker is required for Firebase Cloud Messaging');
      return null;
    }

    console.log('[FCM] Initializing Firebase Messaging...');
    messaging = getMessaging(app);
    
    // Log service worker registration
    const registration = await navigator.serviceWorker.ready;
    console.log('[FCM] Service Worker registered with scope:', registration.scope);
    
    return messaging;
  } catch (error) {
    console.error('[FCM] Error initializing Firebase Messaging:', error);
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!isBrowser) {
    console.log('[FCM] Not in browser environment, cannot request permission');
    return null;
  }

  if (!('Notification' in window)) {
    console.error('[FCM] This browser does not support notifications');
    return null;
  }

  try {
    console.log('[FCM] Requesting notification permission...');
    
    // Ensure messaging is initialized
    if (!messaging) {
      console.log('[FCM] Initializing messaging...');
      messaging = await initMessaging();
      if (!messaging) {
        throw new Error('Failed to initialize Firebase Messaging');
      }
    }

    // Request permission to show notifications
    const permission = await Notification.requestPermission();
    console.log(`[FCM] Notification permission: ${permission}`);
    
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission not granted');
      return null;
    }

    // Get FCM token
    console.log('[FCM] Getting FCM token...');
    const registration = await navigator.serviceWorker.ready;
    
    const token = await getToken(messaging, {
      vapidKey: 'BBopa38FrSZ9P_KdJ51BvpHeYWYt_P05Zz4cE7w13PMiHSfeyAMf8d_LScITfEq3lfDw2zPscYR3X-OAoEV-Czw',
      serviceWorkerRegistration: registration
    });
    
    if (!token) {
      throw new Error('No token received from FCM');
    }
    
    console.log('[FCM] Successfully obtained FCM token');
    // TODO: Send this token to your backend
    return token;
    
  } catch (error) {
    console.error('[FCM] Error in requestNotificationPermission:', error);
    throw error; // Re-throw to allow error handling in the component
  }
};

export const onMessageListener = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!isBrowser) {
      console.log('[FCM] Not in browser environment, cannot set up message listener');
      return resolve(null);
    }

    if (!messaging) {
      console.error('[FCM] Messaging not initialized, cannot set up listener');
      return reject(new Error('Messaging not initialized'));
    }

    console.log('[FCM] Setting up foreground message listener...');
    
    // This will be called when a message is received while the app is in the foreground
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      resolve(payload);
    });

    // Cleanup function
    return () => {
      console.log('[FCM] Unsubscribing from message listener');
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  });
};

export { messaging };
