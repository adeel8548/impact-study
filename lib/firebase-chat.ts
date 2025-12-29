import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Query,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  timestamp?: number;
}

/**
 * Save message to Firestore
 */
export async function saveMessageToFirebase(
  conversationId: string,
  senderId: string,
  senderName: string,
  message: string
): Promise<{ id: string; error?: string }> {
  try {
    console.log("Firebase: Saving message to conversation:", conversationId, {
      senderId,
      senderName,
      message,
    });
    const docRef = await addDoc(collection(db, "messages"), {
      conversationId,
      senderId,
      senderName,
      message,
      isRead: false,
      createdAt: new Date(),
      timestamp: Date.now(),
    });
    console.log("Firebase: Message saved with ID:", docRef.id);
    return { id: docRef.id };
  } catch (error) {
    console.error("Error saving message to Firebase:", error);
    return { id: "", error: (error as Error).message };
  }
}

/**
 * Fetch all messages for a conversation from Firestore
 */
export async function fetchMessagesFromFirebase(
  conversationId: string
): Promise<ChatMessage[]> {
  try {
    console.log("Firebase: Fetching messages for conversation:", conversationId);
    const q = query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "asc")
    );

    // Get docs once
    const { getDocs } = await import("firebase/firestore");
    const snapshot = await getDocs(q);
    
    console.log("Firebase: Found", snapshot.docs.length, "messages");
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log("Firebase message:", doc.id, data);
      return {
        id: doc.id,
        conversationId: data.conversationId,
        senderId: data.senderId,
        senderName: data.senderName,
        message: data.message,
        isRead: data.isRead || false,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        timestamp: data.timestamp,
      };
    });
  } catch (error) {
    console.error("Error fetching messages from Firebase:", error);
    return [];
  }
}

/**
 * Subscribe to real-time messages for a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: ChatMessage) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const q = query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const message: ChatMessage = {
              id: change.doc.id,
              conversationId: data.conversationId,
              senderId: data.senderId,
              senderName: data.senderName,
              message: data.message,
              isRead: data.isRead || false,
              createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
              timestamp: data.timestamp,
            };
            onNewMessage(message);
          }
        });
      },
      (error) => {
        console.error("Error in message subscription:", error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error subscribing to messages:", error);
    return () => {};
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  try {
    const { updateDoc, doc } = await import("firebase/firestore");
    await updateDoc(doc(db, "messages", messageId), {
      isRead: true,
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
  }
}

/**
 * Mark all messages in conversation as read
 */
export async function markConversationAsRead(
  conversationId: string,
  currentUserId: string
): Promise<void> {
  try {
    const { getDocs, updateDoc, doc } = await import("firebase/firestore");
    const q = query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId),
      where("senderId", "!=", currentUserId),
      where("isRead", "==", false)
    );

    const snapshot = await getDocs(q);
    const batch = await import("firebase/firestore").then((m) => m.writeBatch(db));

    snapshot.docs.forEach((document) => {
      batch.update(document.ref, { isRead: true });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error marking conversation as read:", error);
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(
  currentUserId: string,
  conversationIds: string[]
): Promise<number> {
  try {
    if (conversationIds.length === 0) return 0;

    const { getDocs } = await import("firebase/firestore");
    const q = query(
      collection(db, "messages"),
      where("conversationId", "in", conversationIds),
      where("senderId", "!=", currentUserId),
      where("isRead", "==", false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}
