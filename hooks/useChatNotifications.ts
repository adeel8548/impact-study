"use client";

import { useEffect, useRef, useCallback } from "react";
import { messaging, onMessage, VAPID_KEY } from "@/lib/firebase";
import { getToken } from "firebase/messaging";
import { toast } from "sonner";
import { subscribeMessages, storeFcmToken } from "@/lib/firestore-chat";

interface ChatNotificationOptions {
  onNewMessage?: (payload: any) => void;
  soundEnabled?: boolean;
  userId?: string; // explicit user id to store FCM token and suppress self-message sounds
}

export function useChatNotifications(
  conversationId: string,
  options: ChatNotificationOptions = {}
) {
  const { onNewMessage, soundEnabled = true, userId } = options;
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);
  const lastMessageIdRef = useRef<string>("");

  // Initialize audio context on user interaction
  const initAudioContext = useCallback(() => {
    if (isInitializedRef.current) return;
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      // Resume if suspended
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }

      isInitializedRef.current = true;
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
    }
  }, []);

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      initAudioContext();
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
  }, [initAudioContext]);

  // Request notification permission and get FCM token
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted" && messaging) {
            // Get FCM token for web push
            getToken(messaging, { vapidKey: VAPID_KEY })
              .then((currentToken) => {
                if (currentToken) {
                  console.log("FCM Token:", currentToken);
                  // Store token in localStorage or send to backend
                  localStorage.setItem("fcmToken", currentToken);
                  const uid = userId || localStorage.getItem("currentUserId");
                  if (uid) {
                    storeFcmToken(uid, currentToken);
                  }
                } else {
                  console.log("No registration token available.");
                }
              })
              .catch((err) => {
                console.log("An error occurred while retrieving token:", err);
              });
          }
        });
      } else if (Notification.permission === "granted" && messaging) {
        // Permission already granted, get token
        getToken(messaging, { vapidKey: VAPID_KEY })
          .then((currentToken) => {
            if (currentToken) {
              console.log("FCM Token:", currentToken);
              localStorage.setItem("fcmToken", currentToken);
              const uid = userId || localStorage.getItem("currentUserId");
              if (uid) {
                storeFcmToken(uid, currentToken);
              }
            }
          })
          .catch((err) => {
            console.log("Error getting token:", err);
          });
      }
    }
  }, []);

  // Register service worker
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((registration) => {
          console.log(
            "Service Worker registered successfully:",
            registration
          );
        })
        .catch((error) => {
          console.log("Service Worker registration failed:", error);
        });
    }
  }, []);

  // Listen to foreground messages from FCM
  useEffect(() => {
    if (!messaging || !conversationId) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Message received in foreground:", payload);

      // Check if message is for this conversation
      const messageConversationId =
        payload.data?.conversation_id || payload.notification?.tag;

      // Play sound notification
      if (soundEnabled) {
        playNotificationSound();
      }

      // Show toast notification
      if (payload.notification) {
        toast.success(
          `${payload.notification.title}: ${payload.notification.body}`
        );
      }

      // Trigger callback
      if (onNewMessage && messageConversationId === conversationId) {
        onNewMessage(payload);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId, onNewMessage, soundEnabled]);

  // Listen to Firestore messages (v2)
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeMessages(conversationId, (items) => {
      const last = items[items.length - 1];
      if (!last) return;
      if (lastMessageIdRef.current === last.id) return;
      lastMessageIdRef.current = last.id;

      const uid = userId || localStorage.getItem("currentUserId");
      if (soundEnabled && last.senderId !== uid) {
        playNotificationSound();
        const text = (last as any).text || "New message";
        const sender = (last as any).senderName || "Message";
        toast.info(`${sender}: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId, soundEnabled]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      // Initialize if not done yet
      if (!isInitializedRef.current) {
        initAudioContext();
      }

      if (!audioContextRef.current) {
        console.warn("Audio context not available");
        return;
      }

      const audioContext = audioContextRef.current;

      // Resume if suspended
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
  }, [initAudioContext]);

  return {
    playNotificationSound,
  };
}
