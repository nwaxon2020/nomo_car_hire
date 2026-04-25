import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Helper to format the private key correctly for Vercel/Linux environments
const formatPrivateKey = (key: string | undefined) => {
  if (!key) return undefined;
  // Replace escaped \\n with actual newlines, remove quotes, and trim
  return key.replace(/\\n/g, '\n').replace(/"/g, '').trim();
};

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
};

function createFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    credential: cert(firebaseAdminConfig),
  });
}

const adminApp = createFirebaseAdminApp();

export const authAdmin = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);