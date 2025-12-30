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
  const playedMessageIdsRef = useRef<Set<string>>(new Set());

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
          console.log("Audio context created on user interaction");
        }

        if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume();
          console.log("Audio context resumed on user interaction");
        }

        isInitializedRef.current = true;
      } catch (error) {
        console.error("Failed to initialize audio context:", error);
      }

      // Keep listeners for mobile - user may interact multiple times
      // Remove listeners only on web after first interaction
      if (!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))) {
        document.removeEventListener("click", handleUserInteraction);
        document.removeEventListener("keydown", handleUserInteraction);
        document.removeEventListener("touchstart", handleUserInteraction);
      }
    };

    // Resume audio context when page becomes visible (important for background tabs)
    const handleVisibilityChange = () => {
      if (!document.hidden && audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(err => {
          console.warn("Failed to resume audio context on visibility change:", err);
        });
      }
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);
    document.addEventListener("touchstart", handleUserInteraction);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Play notification sound - primary method with fallbacks
  const playNotificationSound = useCallback(() => {
    console.log("playNotificationSound called");
    
    try {
      // Mobile vibration API
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]); // Vibrate pattern
        console.log("Vibration triggered");
      }

      // Try base64 encoded notification sound first (works in browsers)
      const audioData = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==";
      const audio = new Audio(audioData);
      audio.volume = 1.0;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Notification sound played via base64");
          })
          .catch((err) => {
            console.warn("Base64 audio playback failed:", err.message);
            // Fallback to mp3 file
            const audio2 = new Audio("/notification.mp3");
            audio2.volume = 1.0;
            audio2.play().catch((err2) => {
              console.warn("MP3 playback also failed:", err2.message);
              playWebAudioSound();
            });
          });
      } else {
        playWebAudioSound();
      }
    } catch (error) {
      console.error("Error playing notification sound:", error);
      playWebAudioSound();
    }
  }, []);

  // Force initialize audio context even without user interaction for other screens
  useEffect(() => {
    // Try to initialize audio context immediately
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext && !audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        isInitializedRef.current = true;
        console.log("Audio context initialized");
        
        // Resume if suspended
        if (audioContextRef.current.state === "suspended") {
          // Create an empty audio node to trigger context resume
          const silence = audioContextRef.current.createBufferSource();
          silence.connect(audioContextRef.current.destination);
          audioContextRef.current.resume().then(() => {
            console.log("Audio context resumed");
          });
        }
      }
    } catch (error) {
      console.warn("Could not initialize audio context:", error);
    }
  }, []);

  // Fallback: Play sound using Web Audio API with simpler approach
  const playWebAudioSound = useCallback(() => {
    try {
      console.log("Playing notification via Web Audio API, audioContext initialized:", isInitializedRef.current);
      
      // Try to create audio context if not already done
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
          console.warn("Web Audio API not available");
          return;
        }
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;

      // Resume context if needed
      if (audioContext.state === "suspended") {
        audioContext.resume().catch(err => console.warn("Could not resume audio context:", err));
      }

      // Create a simple notification sound
      const now = audioContext.currentTime;
      
      // First beep: 800Hz
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(800, now);
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Second beep: 1000Hz with delay
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1000, now + 0.2);
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      
      gain2.gain.setValueAtTime(0.3, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      
      osc2.start(now + 0.2);
      osc2.stop(now + 0.35);

      console.log("Web Audio notification sound queued");
    } catch (error) {
      console.error("Error playing Web Audio sound:", error);
    }
  }, []);

  // Subscribe to all conversations and play sound on new messages
  useEffect(() => {
    // Wait for Firebase to be ready and conversations to load
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

      console.log("GlobalNotificationProvider: Setting up for user:", userId);

      // Shorter delay for mobile responsiveness
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        // Ensure Firebase is initialized
        const { db } = await import("@/lib/firebase");
        const { collection, query, where, onSnapshot } = await import("firebase/firestore");

        console.log("GlobalNotificationProvider: Firebase ready, setting up listeners");

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
        let hasLoadedAny = false;

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
              console.log(`Messages snapshot for conversation ${convId}:`, msgsSnap.size, "docs");
              msgsSnap.docChanges().forEach((change) => {
                if (change.type === "added") {
                  const msgData = change.doc.data();
                  const msgId = change.doc.id;
                  const msgTimestamp = msgData.createdAt?.toMillis?.() || Date.now();

                  console.log(`Message added: ${msgId}, from: ${msgData.senderId}, timestamp: ${msgTimestamp}`);

                  // Deduplicate by message id
                  if (playedMessageIdsRef.current.has(msgId)) {
                    return;
                  }

                  // Only play sound for messages not from this user AND unread
                  if (msgData.senderId !== userId && msgData.isRead === false) {
                    const now = Date.now();
                    const messageAge = now - msgTimestamp;
                    const lastTimestamp = lastMessageTimestampRef.current[convId] || 0;

                    console.log(`Message age: ${messageAge}ms, userId: ${userId}, isRead: ${msgData.isRead}`);

                    // Play sound if:
                    // 1. Message is new (timestamp > last seen) OR
                    // 2. Message is less than 30 seconds old (to catch messages when switching tabs)
                    if (msgTimestamp > lastTimestamp || messageAge < 30000) {
                      // Update last seen timestamp
                      if (msgTimestamp > lastTimestamp) {
                        lastMessageTimestampRef.current[convId] = msgTimestamp;
                      }
                      
                      console.log("Triggering notification sound...");
                      playedMessageIdsRef.current.add(msgId);
                      
                      // Resume audio context if suspended (important for background tabs)
                      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
                        audioContextRef.current.resume().catch(err => {
                          console.warn("Failed to resume audio context:", err);
                        });
                      }
                      
                      playNotificationSound();
                    } else {
                      console.log(`Message too old (${messageAge}ms) or already seen, skipping sound`);
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
              console.log(`Messages snapshot for teacher conversation ${convId}:`, msgsSnap.size, "docs");
              msgsSnap.docChanges().forEach((change) => {
                if (change.type === "added") {
                  const msgData = change.doc.data();
                  const msgId = change.doc.id;
                  const msgTimestamp = msgData.createdAt?.toMillis?.() || Date.now();

                  console.log(`Teacher message added: ${msgId}, from: ${msgData.senderId}, timestamp: ${msgTimestamp}`);

                  // Deduplicate by message id
                  if (playedMessageIdsRef.current.has(msgId)) {
                    return;
                  }

                  // Only play sound for messages not from this user AND not too old
                  if (msgData.senderId !== userId) {
                    const now = Date.now();
                    const messageAge = now - msgTimestamp;

                    console.log(`Teacher message age: ${messageAge}ms, userId: ${userId}`);

                    if (messageAge < 5000) {
                      const lastTimestamp = lastMessageTimestampRef.current[convId] || 0;

                      if (msgTimestamp > lastTimestamp) {
                        lastMessageTimestampRef.current[convId] = msgTimestamp;
                        console.log("Triggering notification sound for teacher message...");
                        playedMessageIdsRef.current.add(msgId);
                        playNotificationSound();
                      }
                    } else {
                      console.log(`Teacher message too old (${messageAge}ms), skipping sound`);
                    }
                  }
                }
              });
            });
          });
        });

        return () => {
          console.log("GlobalNotificationProvider: Cleaning up listeners");
          unsubAdminConv();
          unsubTeacherConv();
          Object.values(convSubsRef).forEach((fn) => fn());
        };
      } catch (err) {
        console.error("GlobalNotificationProvider error:", err);
      }
    };

    let cleanup: (() => void) | undefined;
    checkAuthAndSetup().then((cleanupFn) => {
      cleanup = cleanupFn;
      console.log("GlobalNotificationProvider: Setup complete");
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [playNotificationSound]);

  // Component doesn't render anything, just listens
  return null;
}
