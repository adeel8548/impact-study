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
      // Try to play audio file first (better compatibility)
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.8;
      audio.play().catch((err) => {
        console.warn("Audio file playback failed, falling back to Web Audio API:", err);
        // Fallback to Web Audio API
        playWebAudioSound();
      });
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  // Fallback: Play sound using Web Audio API
  const playWebAudioSound = useCallback(() => {
    try {
      if (!isInitializedRef.current) return;

      if (!audioContextRef.current) return;

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
      console.error("Error playing Web Audio:", error);
    }
  }, []);

  // Subscribe to all conversations and play sound on new messages
  useEffect(() => {
    // Wait for Firebase to be ready
    const checkAuthAndSetup = async () => {
      const user =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("currentUser") || "{}")
          : {};

      const userId = user?.id;
      if (!userId) {
        console.log("User not found in localStorage, skipping notification setup");
        return;
      }

      try {
        // Ensure Firebase is initialized
        const { db } = await import("@/lib/firebase");
        const { collection, query, where, onSnapshot } = await import("firebase/firestore");

        console.log("Setting up global notification listener for user:", userId);

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
          console.log("Admin conversations:", convIds.length);

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
                  const msgTimestamp = msgData.createdAt?.toMillis?.() || Date.now();

                  // Only play sound for messages not from this user AND not too old
                  // This prevents playing sound for old messages on first load
                  if (msgData.senderId !== userId) {
                    const now = Date.now();
                    const messageAge = now - msgTimestamp;

                    // Only play if message is less than 5 seconds old
                    if (messageAge < 5000) {
                      const lastTimestamp = lastMessageTimestampRef.current[convId] || 0;

                      if (msgTimestamp > lastTimestamp) {
                        lastMessageTimestampRef.current[convId] = msgTimestamp;
                        console.log("New message received, playing sound. Age:", messageAge, "ms");
                        playNotificationSound();
                      }
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
          console.log("Teacher conversations:", convIds.length);

          convIds.forEach((convId) => {
            if (convSubsRef[convId]) return;

            const msgsQ = query(
              collection(db, "conversations", convId, "messages")
            );

            convSubsRef[convId] = onSnapshot(msgsQ, (msgsSnap) => {
              msgsSnap.docChanges().forEach((change) => {
                if (change.type === "added") {
                  const msgData = change.doc.data();
                  const msgTimestamp = msgData.createdAt?.toMillis?.() || Date.now();

                  // Only play sound for messages not from this user AND not too old
                  if (msgData.senderId !== userId) {
                    const now = Date.now();
                    const messageAge = now - msgTimestamp;

                    if (messageAge < 5000) {
                      const lastTimestamp = lastMessageTimestampRef.current[convId] || 0;

                      if (msgTimestamp > lastTimestamp) {
                        lastMessageTimestampRef.current[convId] = msgTimestamp;
                        console.log("New message received, playing sound. Age:", messageAge, "ms");
                        playNotificationSound();
                      }
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

    checkAuthAndSetup();
  }, [playNotificationSound]);

  // Component doesn't render anything, just listens
  return null;
}
