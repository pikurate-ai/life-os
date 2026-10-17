import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Intentionally independent from the legacy email-based / permissive fallback client.
const preview = process.env.NEXT_PUBLIC_LIFE_OS_PREVIEW === 'true';
const config = preview
  ? null
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

export const firebaseConfigured =
  !preview &&
  config !== null &&
  Object.values(config).every((value) =>
    Boolean(value && !/your-|placeholder|example/i.test(value)),
  );
export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}
let services: FirebaseServices | null = null;
export function getLifeFirebase(): FirebaseServices | null {
  if (preview || !firebaseConfigured || !config || typeof window === 'undefined') return null;
  if (services) return services;
  const app =
    getApps().find((value) => value.name === 'life-os-v2') ?? initializeApp(config, 'life-os-v2');
  services = { app, auth: getAuth(app), db: getFirestore(app) };
  return services;
}
