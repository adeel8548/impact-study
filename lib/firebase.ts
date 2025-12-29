import { initializeApp, getApps } from "firebase/app";
import { getMessaging, onMessage } from "firebase/messaging";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Check if Firebase is configured
const isFirebaseConfigured = !!(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

if (!isFirebaseConfigured) {
  console.warn(
    "⚠️  Firebase is not configured. Chat features will not work. " +
    "Please add Firebase environment variables to .env.local"
  );
}

// Initialize Firebase (only if configured)
const app = isFirebaseConfigured
  ? getApps().length
    ? getApps()[0]
    : initializeApp(firebaseConfig)
  : null;

// Initialize Firestore
const db = app ? getFirestore(app) : (null as any);

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging: ReturnType<typeof getMessaging> | null = null;

// VAPID Key for web push notifications
export const VAPID_KEY = "BHsd0CUQ2p_X4-IvqnCxJPgRw7RQRH1hB1rLuavtl1ZKYXSO1phzZSGhfW2WJvMwnmnmr4D2IunamTY_THGSFPg";

// Check if browser supports Service Workers and notifications
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.log("Firebase Messaging not available", error);
  }
}

export { app, messaging, db };
export { onMessage };

// Ensure we have a Firebase auth user (anonymous) so Firestore writes succeed under auth-required rules
export async function ensureFirebaseAuth(userInfo?: {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}) {
  if (!app) return null;
  const auth = getAuth(app);
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error("Failed to sign in anonymously to Firebase", err);
      return null;
    }
  }

  // Optionally upsert user profile to Firestore users collection using provided info
  if (userInfo && db) {
    try {
      await setDoc(
        doc(db, "users", userInfo.id),
        {
          userId: userInfo.id,
          name: userInfo.name || null,
          email: userInfo.email || null,
          role: userInfo.role || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Failed to upsert user profile in Firestore", err);
    }
  }

  return auth.currentUser;
}

export { getAuth };

