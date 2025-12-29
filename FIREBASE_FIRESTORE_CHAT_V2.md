# Admin ↔ Teacher Chat (Supabase Auth + Firebase Firestore)

This guide documents the real-time chat system using Supabase only for authentication/roles and Firebase for chat, unread counts, and push notifications.

Summary:
- Supabase: Auth, user profiles/roles (admin, teacher)
- Firebase: Firestore conversations/messages, users collection, FCM push notifications
- Next.js frontend with real-time listeners and web push via service worker

---

## 1) Authentication
- Login/signup via Supabase Auth (email/password or provider)
- After login, the app requests a Firebase Custom Token from `/api/firebase/custom-token`, then signs in to Firebase Auth client-side
- Claims mapped: `uid`, `name`, `email`, `role`

Files:
- API route: [app/api/firebase/custom-token/route.ts](app/api/firebase/custom-token/route.ts)
- Bridge helper: [lib/ensureFirebaseAuth.ts](lib/ensureFirebaseAuth.ts)
- Firebase client init: [lib/firebase.ts](lib/firebase.ts)
- Firebase Admin init: [lib/firebaseAdmin.ts](lib/firebaseAdmin.ts)

---

## 2) Database (Firebase only)
Collections:
- `users/{uid}`: `{ id, name, email, role, fcmTokens }`
- `conversations/{id}`: `{ adminId, teacherId, lastMessage, updatedAt }`
- `conversations/{id}/messages/{mid}`: `{ senderId, senderName, text, createdAt, isRead }`

Helpers:
- [lib/firestore-chat.ts](lib/firestore-chat.ts)
  - `ensureConversation(adminId, teacherId)` → returns `{ id }`
  - `sendMessage(conversationId, senderId, text, senderName)`
  - `subscribeMessages(conversationId, cb)`
  - `markConversationAsRead(conversationId, userId)`
  - `getUnreadCountForUser(userId)` (for badges)
  - `storeFcmToken(userId, token)`

Note: No chat content is stored in Supabase.

---

## 3) Chat Functionality
- Admin ↔ Teacher messages stream in real-time using Firestore `onSnapshot`
- `isRead` set when a participant opens the conversation
- Conversation list updates live ordered by `updatedAt`

UI Components:
- [components/chat/ChatWindow.tsx](components/chat/ChatWindow.tsx):
  - Auth bridge to Firebase
  - Realtime message subscription
  - Send input + auto-scroll behavior via `MessageList`

Pages:
- Admin: [app/admin/chat/page.tsx](app/admin/chat/page.tsx)
  - Lists admin’s conversations from Firestore
  - Start a new chat: type a teacher name/email and press Enter
- Teacher: [app/teacher/chat/page.tsx](app/teacher/chat/page.tsx)
  - Lists teacher’s conversations from Firestore
  - Button to start chat with admin (first admin profile)

---

## 4) Notifications (FCM)
- Foreground: `useChatNotifications` plays a sound and shows a toast
- Background: service worker handles FCM push events
- FCM tokens stored in Firestore under `users/{uid}.fcmTokens`

Files:
- Hook: [hooks/useChatNotifications.ts](hooks/useChatNotifications.ts)
- Service Worker: [public/firebase-messaging-sw.js](public/firebase-messaging-sw.js)

Requirements:
- HTTPS (Vercel) for push
- Visible browser permission prompt

---

## 5) Migrating Existing Users
- Migrates Supabase `profiles` (admins/teachers) into Firestore `users/{uid}`
- Route: [app/api/admin/migrate-users/route.ts](app/api/admin/migrate-users/route.ts)
- No chat content migration to Supabase (not used)

---

## 6) Frontend (Next.js)
- Conversation list + last message preview
- Real-time messages with auto-scroll and timestamp formatting (in `MessageList`)
- Mobile-friendly layout using shadcn/ui

Try it locally:
```bash
pnpm i
pnpm dev
```

---

## 7) Security (Firestore Rules)
- Only participants (adminId or teacherId) can read/write a conversation and its messages
- Participants can only update `isRead` on messages not sent by them
- Admins can create a conversation with any teacher

Rules file:
- [firebase.rules](firebase.rules)

Deploy rules:
```bash
# Install Firebase CLI
npm i -g firebase-tools

# Login and set project
firebase login
firebase use <your-project-id>

# Deploy rules
firebase deploy --only firestore:rules
```

---

## 8) Environment / Deployment
Create `.env.local` with:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Firebase client
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...

# Firebase Admin (service account JSON fields)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Deploy to Vercel:
- Add the same env vars in Vercel project settings
- Ensure `public/firebase-messaging-sw.js` is served at `/{file}`
- HTTPS will satisfy web push prerequisites

---

## 9) Bonus Features
- Auto-scroll to newest message (handled by `MessageList`)
- Human-friendly timestamps (client formatting)
- Mobile-friendly responsive layout
- Last message preview in conversation list (admin/teacher pages)

---

## Quick Reference
- Start chat (Admin): type teacher name/email into search and press Enter
- Start chat (Teacher): use "Start Chat with Admin" button
- Realtime: managed by Firestore `onSnapshot`
- Unread badge: computed from Firestore (see `getUnreadCountForUser`)
- Push: FCM via service worker + VAPID key
