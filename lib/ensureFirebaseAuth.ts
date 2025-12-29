"use client";

import { app } from "@/lib/firebase";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function ensureFirebaseAuth(currentUser: {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}) {
  const auth = getAuth(app);
  if (auth.currentUser) return auth.currentUser;

  const res = await fetch("/api/firebase/custom-token", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to get custom token");
  const { token } = await res.json();
  const cred = await signInWithCustomToken(auth, token);

  // Ensure Firestore users doc exists / updated
  const userDoc = doc(db, "users", currentUser.id);
  const fcmToken = typeof window !== "undefined" ? localStorage.getItem("fcmToken") : null;
  await setDoc(
    userDoc,
    {
      userId: currentUser.id,
      name: currentUser.name || null,
      email: currentUser.email || null,
      role: currentUser.role || null,
      updatedAt: serverTimestamp(),
      ...(fcmToken ? { fcmTokens: { [fcmToken]: true } } : {}),
    },
    { merge: true },
  );

  return cred.user;
}
