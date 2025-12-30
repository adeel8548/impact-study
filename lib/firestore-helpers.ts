import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  addDoc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// Type definitions
export interface FirebaseUser {
  uid: string;
  name: string;
  email: string;
  role: "admin" | "teacher";
  fcmToken?: string;
}

export interface Conversation {
  id: string;
  adminId: string;
  teacherId: string;
  lastMessage?: string | null;
  updatedAt?: any;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt?: any;
  isRead: boolean;
}

// ===== User Functions =====

/**
 * Create or update user in Firebase users collection
 */
export async function setFirebaseUser(user: FirebaseUser) {
  const userRef = doc(db, "users", user.uid);
  await setDoc(
    userRef,
    {
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      fcmToken: user.fcmToken || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Get user from Firebase
 */
export async function getFirebaseUser(uid: string): Promise<FirebaseUser | null> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? (snap.data() as FirebaseUser) : null;
}

/**
 * Update FCM token for user
 */
export async function updateUserFcmToken(uid: string, fcmToken: string) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { fcmToken });
}

// ===== Conversation Functions =====

/**
 * Get or create conversation between admin and teacher
 */
export async function getOrCreateConversation(
  adminId: string,
  teacherId: string
): Promise<string> {
  // Query for existing conversation
  const q = query(
    collection(db, "conversations"),
    where("adminId", "==", adminId),
    where("teacherId", "==", teacherId)
  );
  const snapshots = await getDocs(q);

  if (snapshots.docs.length > 0) {
    return snapshots.docs[0].id;
  }

  // Create new conversation
  const conversationRef = await addDoc(collection(db, "conversations"), {
    adminId,
    teacherId,
    lastMessage: null,
    updatedAt: serverTimestamp(),
  });

  return conversationRef.id;
}

/**
 * Get all conversations for an admin
 * Now returns ALL teacher conversations (any admin can see all teacher conversations)
 */
export function subscribeToAdminConversations(
  adminId: string,
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  // Query all conversations and filter to only teacher conversations
  // This allows all admins to see all teacher conversations
  const q = query(
    collection(db, "conversations"),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, async (snapshot) => {
    const conversations: Conversation[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Only include conversations with teachers (teacherId exists)
      if (data.teacherId != null && data.teacherId !== "") {
        conversations.push({
          id: doc.id,
          adminId: data.adminId,
          teacherId: data.teacherId,
          lastMessage: data.lastMessage,
          updatedAt: data.updatedAt,
        });
      }
    }
    callback(conversations);
  });
}

/**
 * Get all conversations for a teacher
 */
export function subscribeToTeacherConversations(
  teacherId: string,
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "conversations"),
    where("teacherId", "==", teacherId),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, async (snapshot) => {
    const conversations: Conversation[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        adminId: data.adminId,
        teacherId: data.teacherId,
        lastMessage: data.lastMessage,
        updatedAt: data.updatedAt,
      });
    }
    callback(conversations);
  });
}

// ===== Message Functions =====

/**
 * Send a message to a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
) {
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );
  const messageRef = await addDoc(messagesRef, {
    senderId,
    text,
    createdAt: serverTimestamp(),
    isRead: false,
  });

  // Update conversation's lastMessage and updatedAt
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: text,
    updatedAt: serverTimestamp(),
  });

  return messageRef.id;
}

/**
 * Subscribe to messages in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      messages.push({
        id: doc.id,
        senderId: data.senderId,
        text: data.text,
        createdAt: data.createdAt,
        isRead: data.isRead,
      });
    }
    callback(messages);
  });
}

/**
 * Mark all messages as read in a conversation
 */
export async function markConversationAsRead(
  conversationId: string,
  readerId: string
) {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    where("isRead", "==", false),
    where("senderId", "!=", readerId)
  );

  const snapshots = await getDocs(q);
  for (const doc of snapshots.docs) {
    await updateDoc(doc.ref, { isRead: true });
  }
}

// ===== Broadcast Functions =====

/**
 * Send a message to multiple teachers
 */
export async function broadcastMessage(
  adminId: string,
  teacherIds: string[],
  messageText: string
) {
  for (const teacherId of teacherIds) {
    const conversationId = await getOrCreateConversation(adminId, teacherId);
    await sendMessage(conversationId, adminId, messageText);
  }
}
