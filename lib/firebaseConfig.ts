// lib/firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging"; // Added Messaging

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// 🔑 SINGLE Firebase App (singleton)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase services
export const auth = getAuth(app);

// 🔒 Firestore with persistent local cache for offline resilience
// Uses IndexedDB so active bookings survive network drops, page reloads, and reboots
let firestoreDb;
if (typeof window !== "undefined") {
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (_e) {
    // Already initialized (HMR) – fall back to existing instance
    firestoreDb = getFirestore(app);
  }
} else {
  // SSR – no persistent cache needed
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;

export const storage = getStorage(app);

// Initialize Messaging (only on client side)
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

// Export VAPID Key for easy access in other files
export const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Google provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});