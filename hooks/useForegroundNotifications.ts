"use client";

import { useEffect, useRef } from "react";
import { getMessaging, onMessage } from "firebase/messaging";
import { app } from "@/lib/firebase";

// Notification sound
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    console.log("🔔 Notification sound played");
  } catch (error) {
    console.warn("Failed to play notification sound:", error);
  }
};

// Show browser notification
const showBrowserNotification = (title: string, body: string, icon?: string) => {
  if ("Notification" in window && Notification.permission === "granted") {
    const notification = new Notification(title, {
      body,
      icon: icon || "/logo.png",
      badge: "/badge.png",
      tag: "chat-notification",
      requireInteraction: false,
      silent: false, // Allow sound
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

/**
 * Hook to handle foreground Firebase notifications
 * Plays sound even when app is open but not on chat screen
 */
export function useForegroundNotifications() {
  const soundPlayedRef = useRef(new Set<string>());

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    // Request notification permission if not already granted
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }

    let unsubscribe: (() => void) | undefined;

    try {
      const messaging = getMessaging(app);

      // Listen to foreground messages
      unsubscribe = onMessage(messaging, (payload) => {
        console.log("[Foreground] Message received:", payload);

        const messageId =
          payload.messageId ||
          payload.data?.message_id ||
          payload.data?.id ||
          Date.now().toString();

        // Prevent duplicate sounds
        if (soundPlayedRef.current.has(messageId)) {
          console.log("Duplicate message, skipping sound:", messageId);
          return;
        }

        soundPlayedRef.current.add(messageId);

        // Clean up old message IDs (keep last 100)
        if (soundPlayedRef.current.size > 100) {
          const ids = Array.from(soundPlayedRef.current);
          ids.slice(0, ids.length - 100).forEach((id) => {
            soundPlayedRef.current.delete(id);
          });
        }

        // Play notification sound
        playNotificationSound();

        // Show browser notification
        const title = payload.notification?.title || "New Message";
        const body = payload.notification?.body || "You have a new message";
        const icon = payload.notification?.icon;

        showBrowserNotification(title, body, icon);
      });

      console.log("✅ Foreground notifications listener registered");
    } catch (error) {
      console.error("Failed to initialize foreground notifications:", error);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log("🔕 Foreground notifications listener unregistered");
      }
    };
  }, []);
}
