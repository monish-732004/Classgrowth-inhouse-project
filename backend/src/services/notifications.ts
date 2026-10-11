import admin from 'firebase-admin';

let initialized = false;

function getApp() {
  if (!initialized) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    initialized = true;
  }
  return admin;
}

export async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const app = getApp();
  await app.messaging().send({
    token,
    notification: { title, body },
    data,
    webpush: {
      notification: { icon: '/icon-192.png', badge: '/badge-72.png' },
      fcmOptions: { link: data?.url ?? '/' },
    },
  });
}

export async function sendPushMulticast(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (tokens.length === 0) return;
  const app = getApp();
  // FCM allows up to 500 tokens per multicast
  for (let i = 0; i < tokens.length; i += 500) {
    await app.messaging().sendEachForMulticast({
      tokens: tokens.slice(i, i + 500),
      notification: { title, body },
      data,
    });
  }
}
