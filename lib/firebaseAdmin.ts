// lib/firebaseAdmin.ts
import type { ServiceAccount } from "firebase-admin";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Firebase Admin configuration
const firebaseAdminConfig: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID as string,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
};

// Validate Firebase Admin environment variables
function validateFirebaseAdminConfig() {
  const errors: string[] = [];
  
  if (!firebaseAdminConfig.projectId) {
    errors.push("FIREBASE_PROJECT_ID is missing");
  }
  
  if (!firebaseAdminConfig.clientEmail) {
    errors.push("FIREBASE_CLIENT_EMAIL is missing");
  }
  
  if (!firebaseAdminConfig.privateKey) {
    errors.push("FIREBASE_PRIVATE_KEY is missing");
  }
  
  if (errors.length > 0) {
    console.error("Firebase Admin Configuration Errors:", errors);
    throw new Error(`Firebase Admin setup failed: ${errors.join(", ")}`);
  }
}

// Initialize Firebase Admin if not already initialized
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      // Validate configuration first
      validateFirebaseAdminConfig();
      
      // Initialize Firebase Admin
      const app = initializeApp({
        credential: cert(firebaseAdminConfig),
        databaseURL: `https://${firebaseAdminConfig.projectId}.firebaseio.com`,
      });
      
      console.log("✅ Firebase Admin initialized successfully");
      return app;
    } catch (error) {
      console.error("❌ Firebase Admin initialization failed:", error);
      throw error;
    }
  }
  
  console.log("ℹ️ Firebase Admin already initialized");
  return getApps()[0];
}

// Initialize Firebase Admin
try {
  initializeFirebaseAdmin();
} catch (error) {
  console.warn("⚠️ Firebase Admin initialization warning:", error);
  // Don't throw here to allow app to start without admin if not needed
}

// Export Firebase Admin services
export const authAdmin = getAuth();
export const adminDb = getFirestore();