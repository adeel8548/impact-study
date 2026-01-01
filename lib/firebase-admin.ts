import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK (server-side only)
// Gracefully handle missing credentials
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "school-web-system";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Check if credentials are properly configured
const hasValidCredentials = 
  projectId && 
  clientEmail && 
  privateKey && 
  privateKey.includes("BEGIN PRIVATE KEY") &&
  clientEmail.includes("@");

let firebaseApp: any = null;
let firestoreDb: any = null;

if (hasValidCredentials) {
  try {
    const firebaseAdminConfig: ServiceAccount = {
      projectId,
      clientEmail: clientEmail!,
      privateKey: privateKey!,
    };

    // Check if app is already initialized
    const apps = getApps();
    firebaseApp = apps.length === 0 
      ? initializeApp({
          credential: cert(firebaseAdminConfig),
          projectId: firebaseAdminConfig.projectId,
        })
      : apps[0];

    firestoreDb = getFirestore(firebaseApp);
    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.warn("⚠️ Firebase Admin SDK initialization failed:", error);
    console.warn("Firebase sync features will be disabled until credentials are configured");
  }
} else {
  console.warn("⚠️ Firebase Admin credentials not configured");
  console.warn("Please follow FIREBASE_ADMIN_SETUP.md to configure Firebase Admin SDK");
  console.warn("Firebase sync features will be disabled until credentials are configured");
}

// Export Firestore database instance (may be null)
export const db = firestoreDb;

// Export app for other Firebase Admin services (may be null)
export const adminApp = firebaseApp;

// Helper function to check if Firebase Admin is ready
export const isFirebaseAdminReady = () => !!firestoreDb;

