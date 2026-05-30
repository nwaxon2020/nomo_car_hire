import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Helper to format the private key correctly for Vercel/Linux environments
const formatPrivateKey = (key: string | undefined) => {
  if (!key) return undefined;
  
  let cleanKey = key.replace(/\\n/g, '\n').replace(/"/g, '').replace(/\r/g, '').trim();

  // If the key is incorrectly formatted as a single long string, inject newlines
  if (!cleanKey.includes('\n') || cleanKey.split('\n').length < 3) {
    cleanKey = cleanKey
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
      
    // Remove any accidental spaces or newlines from the base64 payload
    const parts = cleanKey.split('\n');
    if (parts.length >= 3) {
      const header = parts[0];
      const footer = parts[parts.length - 1];
      const base64 = parts.slice(1, -1).join('').replace(/\s+/g, '');
      
      // Node crypto accepts the base64 chunk unbroken as long as it's separated by newlines
      cleanKey = `${header}\n${base64}\n${footer}`;
    }
  }

  return cleanKey;
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