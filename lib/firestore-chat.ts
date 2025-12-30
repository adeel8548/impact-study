import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function ensureConversation(
  adminId: string, 
  teacherId: string,
  teacherName?: string,
  teacherEmail?: string
) {
  const convs = collection(db, "conversations");
  const q = query(
    convs,
    where("adminId", "==", adminId),
    where("teacherId", "==", teacherId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    // Update name/email if provided and missing
    const existingDoc = snap.docs[0];
    const existingData = existingDoc.data();
    if ((teacherName || teacherEmail) && (!existingData.teacherName || !existingData.teacherEmail)) {
      await updateDoc(existingDoc.ref, {
        ...(teacherName && !existingData.teacherName ? { teacherName } : {}),
        ...(teacherEmail && !existingData.teacherEmail ? { teacherEmail } : {}),
      });
    }
    return { id: snap.docs[0].id, exists: true };
  }
  const ref = await addDoc(convs, {
    adminId,
    teacherId,
    teacherName: teacherName || null,
    teacherEmail: teacherEmail || null,
    lastMessage: null,
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, exists: false };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
  senderName?: string,
) {
  try {
    console.log("sendMessage called with:", { conversationId, senderId, text, senderName });

    const msgCol = collection(db, "conversations", conversationId, "messages");
    const ref = await addDoc(msgCol, {
      senderId,
      text,
      senderName: senderName || null,
      createdAt: serverTimestamp(),
      isRead: false, // Messages are unread by default, recipient marks as read
    });

    console.log("Message added to Firestore:", ref.id);

    // Fire-and-forget conversation update to avoid UI hanging on slow writes
    updateDoc(doc(db, "conversations", conversationId), {
      lastMessage: text,
      updatedAt: serverTimestamp(),
    }).catch((e) => console.warn("Conversation update failed:", e));

    return ref.id;
  } catch (error) {
    console.error("Error in sendMessage:", error);
    throw error;
  }
}

export function subscribeMessages(
  conversationId: string,
  cb: (msgs: Array<{ id: string; senderId: string; text: string; createdAt: Date; senderName?: string; isRead?: boolean }>) => void,
) {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => {
      const data = d.data() as any;
      const ts = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
      return {
        id: d.id,
        senderId: data.senderId,
        text: data.text,
        createdAt: ts,
        senderName: data.senderName,
        isRead: data.isRead !== undefined ? data.isRead : true, // Default to true if not set
      };
    });
    cb(items);
  });
}

export async function markConversationAsRead(conversationId: string, userId: string) {
  // Mark all messages not from userId as read
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    where("isRead", "==", false)
  );
  const snap = await getDocs(q);
  // Filter client-side to exclude messages from userId
  const toUpdate = snap.docs.filter(d => d.data().senderId !== userId);
  await Promise.all(toUpdate.map((d) => updateDoc(d.ref, { isRead: true })));
}

export async function getUnreadCountForConversation(conversationId: string, userId: string) {
  // Get unread message count in a conversation (messages not from userId)
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    where("isRead", "==", false)
  );
  const snap = await getDocs(q);
  // Filter client-side to exclude messages from userId
  return snap.docs.filter(d => d.data().senderId !== userId).length;
}

export function subscribeUnreadCount(
  conversationId: string, 
  userId: string,
  cb: (count: number) => void
) {
  // Real-time subscription to unread count
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    where("isRead", "==", false)
  );
  return onSnapshot(q, (snap) => {
    // Filter client-side to exclude messages from userId
    const unreadFromOthers = snap.docs.filter(d => d.data().senderId !== userId);
    cb(unreadFromOthers.length);
  });
}

export async function getUnreadCountForUser(userId: string) {
  // Get all conversations where user is admin or teacher, then sum unread
  // For admins: get all teacher conversations (any admin can see all)
  // For teachers: get conversations where they are the teacher
  const convsQ = query(
    collection(db, "conversations"),
    orderBy("updatedAt", "desc")
  );
  const convsQ2 = query(
    collection(db, "conversations"),
    where("teacherId", "==", userId)
  );
  const [s1, s2] = await Promise.all([getDocs(convsQ), getDocs(convsQ2)]);
  
  // For admins: filter to only teacher conversations (teacherId exists)
  // For teachers: use their specific conversations
  const adminConvs = s1.docs.filter(d => {
    const data = d.data();
    return data.teacherId != null && data.teacherId !== "";
  });
  const teacherConvs = s2.docs;
  
  // Combine and deduplicate
  const allConvIds = new Set([
    ...adminConvs.map(d => d.id),
    ...teacherConvs.map(d => d.id)
  ]);
  
  let total = 0;
  for (const convId of allConvIds) {
    const msgsQ = query(
      collection(db, "conversations", convId, "messages"),
      where("isRead", "==", false)
    );
    const s = await getDocs(msgsQ);
    // Filter client-side to exclude messages from userId
    const unreadFromOthers = s.docs.filter(d => d.data().senderId !== userId);
    total += unreadFromOthers.length;
  }
  return total;
}

export async function storeFcmToken(userId: string, token: string) {
  await setDoc(
    doc(db, "users", userId),
    { fcmTokens: { [token]: true }, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
