"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function ensureFirestoreConversation(
  conversationId: string,
  adminId: string,
  teacherId: string,
) {
  const ref = doc(db, "conversations", conversationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      adminId,
      teacherId,
      lastMessage: null,
      updatedAt: serverTimestamp(),
    });
  }
}
