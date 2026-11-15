
import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = Object.values(firebaseConfig).every(Boolean);
const app = isConfigured ? initializeApp(firebaseConfig) : null;

if (app) {
  console.info('[FCM CLIENT] Firebase Web app initialized.')
}

export const messagingPromise = app
  ? isSupported().then((supported) => {
    console.info('[FCM CLIENT] Browser messaging support detected.', {
      supported,
    })
    if (!supported) return null

    const messaging = getMessaging(app)
    console.info('[FCM CLIENT] Firebase Messaging initialized.')
    return messaging
  }).catch((error) => {
    console.error('[FCM CLIENT] Firebase Messaging initialization failed.', {
      name: error.name,
      code: error.code,
      message: error.message,
    })
    throw error
  })
  : Promise.resolve(null);

if (!isConfigured) {
  console.warn('[FCM CLIENT] Browser messaging configuration is incomplete.')
}

export default app;
