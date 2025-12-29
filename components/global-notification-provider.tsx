"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Global notification provider that plays sound for new messages
 * across all pages/screens, regardless of which conversation is active
 */
export function GlobalNotificationProvider() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);
  const lastMessageTimestampRef = useRef<Record<string, number>>({});

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume();
        }

        isInitializedRef.current = true;
      } catch (error) {
        console.error("Failed to initialize audio context:", error);
      }

      // Remove listeners after first interaction
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);
    document.addEventListener("touchstart", handleUserInteraction);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      if (!isInitializedRef.current) return;

      if (!audioContextRef.current) {
        console.warn("Audio context not available");
        return;
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === "suspended") {
        audioContext.resume().catch(err => console.error("Failed to resume audio context:", err));
      }

      const currentTime = audioContext.currentTime;

      // First beep
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();

      osc1.connect(gain1);
      gain1.connect(audioContext.destination);

      osc1.frequency.setValueAtTime(800, currentTime);
      osc1.type = "sine";

      gain1.gain.setValueAtTime(0.3, currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.2);

      osc1.start(currentTime);
      osc1.stop(currentTime + 0.2);

      // Second beep with delay
      setTimeout(() => {
        const newTime = audioContext.currentTime;
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();

        osc2.connect(gain2);
        gain2.connect(audioContext.destination);

        osc2.frequency.setValueAtTime(1000, newTime);
        osc2.type = "sine";

        gain2.gain.setValueAtTime(0.3, newTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, newTime + 0.2);

        osc2.start(newTime);
        osc2.stop(newTime + 0.2);
      }, 250);
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  // Subscribe to all conversations and play sound on new messages
  useEffect(() => {
    const user =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("currentUser") || "{}")
        : {};

    const userId = user?.id;
    if (!userId) return;

    const setupGlobalListener = async () => {
      try {
        const { collection, query, where, onSnapshot } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");

        // Get all conversations for this user (both admin and teacher)
        const adminConvQ = query(
          collection(db, "conversations"),
          where("adminId", "==", userId)
        );

        const teacherConvQ = query(
          collection(db, "conversations"),
          where("teacherId", "==", userId)
        );

        const convSubsRef: Record<string, () => void> = {};

        // Subscribe to admin conversations
        const unsubAdminConv = onSnapshot(adminConvQ, (snap) => {
          const convIds = snap.docs.map(doc => doc.id);

          // Clean up removed conversations
          Object.keys(convSubsRef).forEach((id) => {
            if (!convIds.includes(id)) {
              convSubsRef[id]();
              delete convSubsRef[id];
            }
          });

          // Subscribe to messages for each conversation
          convIds.forEach((convId) => {
            if (convSubsRef[convId]) return;

            const msgsQ = query(
              collection(db, "conversations", convId, "messages")
            );

            convSubsRef[convId] = onSnapshot(msgsQ, (msgsSnap) => {
              msgsSnap.docChanges().forEach((change) => {
                if (change.type === "added") {
                  const msgData = change.doc.data();
                  const msgId = change.doc.id;

                  // Only play sound for messages not from this user
                  if (msgData.senderId !== userId) {
                    // Avoid duplicate sounds for same message
                    const lastTimestamp = lastMessageTimestampRef.current[convId] || 0;
                    const msgTimestamp = msgData.createdAt?.toMillis?.() || Date.now();

                    if (msgTimestamp > lastTimestamp) {
                      lastMessageTimestampRef.current[convId] = msgTimestamp;
                      console.log("New message received, playing sound");
                      playNotificationSound();
                    }
                  }
                }
              });
            });
          });
        });

        // Subscribe to teacher conversations
        const unsubTeacherConv = onSnapshot(teacherConvQ, (snap) => {
          const convIds = snap.docs.map(doc => doc.id);

          convIds.forEach((convId) => {
            if (convSubsRef[convId]) return;

            const msgsQ = query(
              collection(db, "conversations", convId, "messages")
            );

            convSubsRef[convId] = onSnapshot(msgsQ, (msgsSnap) => {
              msgsSnap.docChanges().forEach((change) => {
                if (change.type === "added") {
                  const msgData = change.doc.data();

                  // Only play sound for messages not from this user
                  if (msgData.senderId !== userId) {
                    const lastTimestamp = lastMessageTimestampRef.current[convId] || 0;
                    const msgTimestamp = msgData.createdAt?.toMillis?.() || Date.now();

                    if (msgTimestamp > lastTimestamp) {
                      lastMessageTimestampRef.current[convId] = msgTimestamp;
                      console.log("New message received, playing sound");
                      playNotificationSound();
                    }
                  }
                }
              });
            });
          });
        });

        return () => {
          unsubAdminConv();
          unsubTeacherConv();
          Object.values(convSubsRef).forEach((fn) => fn());
        };
      } catch (err) {
        console.error("Error setting up global notification listener:", err);
      }
    };

    const unsubscribe = setupGlobalListener();

    return () => {
      unsubscribe?.then((fn) => fn?.());
    };
  }, [playNotificationSound]);

  // Component doesn't render anything, just listens
  return null;
}
