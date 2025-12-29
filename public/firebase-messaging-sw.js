// Firebase Cloud Messaging Service Worker
importScripts(
  "https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.5.0/firebase-messaging-compat.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyA1GdcX9hNLvPh2URPG7cTA9Su3l_fG98g",
  authDomain: "school-web-system.firebaseapp.com",
  projectId: "school-web-system",
  storageBucket: "school-web-system.firebasestorage.app",
  messagingSenderId: "761240561042",
  appId: "1:761240561042:web:19ac045eb939443d648d4b",
  measurementId: "G-04D1VKP0FH",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  // Show notification with sound
  const notificationTitle = payload.notification.title || "New Message";
  const notificationOptions = {
    body: payload.notification.body || "You have a new message",
    icon: "/logo.png",
    badge: "/badge.png",
    tag: "chat-notification",
    requireInteraction: false,
    silent: false,
  };

  // Try to play sound
  playNotificationSound();

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Function to play notification sound
function playNotificationSound() {
  try {
    // Create audio context to play sound
    const audioContext = new (self.AudioContext || self.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set frequency and duration for notification sound
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (err) {
    console.warn("Failed to play notification sound:", err);
    // Fallback: notification visual is already shown
  }
}

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Open chat window
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (let client of clientList) {
        if (client.url.includes("/admin/chat") || client.url.includes("/teacher/chat")) {
          return client.focus();
        }
      }
      // If no chat window is open, open one
      return clients.openWindow("/admin/chat");
    })
  );
});
