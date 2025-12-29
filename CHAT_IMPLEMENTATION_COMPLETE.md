# Real-Time Chat System - Implementation Summary

## ✅ Complete Implementation: Supabase Auth + Firebase Firestore Chat

A production-ready real-time chat system for Admin ↔ Teacher messaging using Supabase for authentication and Firebase for all chat operations.

---

## Architecture Overview

```
User Login
    ↓
Supabase Auth (email/password)
    ↓
Firebase Custom Token API Route
    ↓
Firebase Auth Client-Side Sign-In
    ↓
Chat UI (Real-time via Firestore onSnapshot)
    ↓
FCM Push Notifications (Web + Service Worker)
```

---

## Key Components

### 1. Authentication Flow
- **Supabase**: Handles user registration, login, and role management
- **Firebase**: Custom token minted server-side using Supabase UID
- **Bridge**: `lib/ensureFirebaseAuth.ts` signs into Firebase client-side

### 2. Chat Storage (Firebase Only)
```
conversations/{id}
  ├── adminId: string
  ├── teacherId: string
  ├── lastMessage: string
  ├── updatedAt: Timestamp
  └── messages/{messageId}  (subcollection)
      ├── senderId: string
      ├── senderName: string
      ├── text: string
      ├── createdAt: Timestamp
      └── isRead: boolean
```

### 3. Real-Time Features
- **Conversation List**: Admin/Teacher pages list conversations from Firestore with live `updatedAt` ordering
- **Message Stream**: `subscribeMessages(conversationId)` uses Firestore `onSnapshot`
- **Unread Count**: Computed via `getUnreadCountForUser(userId)` (Firestore query)
- **Read Status**: Participants mark messages as read; unread count reflects this

### 4. Notifications
- **Foreground**: Sound + toast via `useChatNotifications` hook
- **Background**: Service worker (`firebase-messaging-sw.js`) handles FCM push
- **FCM Tokens**: Stored per user in Firestore `users/{uid}.fcmTokens`
- **Requirement**: HTTPS (Vercel) for web push to work

### 5. Security
- **Firestore Rules**: Only participants (adminId/teacherId) can read/write messages
- **Participant-Only Access**: `isRead` updates restricted to authorized users
- **Admin Creation**: Admins can create conversations with any teacher

---

## File Structure

### Pages
- `app/admin/chat/page.tsx` – Admin conversation list + chat UI
- `app/teacher/chat/page.tsx` – Teacher conversation list + chat UI

### Components
- `components/chat/ChatWindow.tsx` – Main chat component (messages + input)
- `components/chat/MessageList.tsx` – Message rendering (auto-scroll, timestamps)
- `components/chat/MessageInput.tsx` – Message input box

### Libraries
- `lib/firebase.ts` – Firebase client initialization
- `lib/firebaseAdmin.ts` – Firebase Admin SDK (server-side)
- `lib/firestore-chat.ts` – Firestore operations (v2 API)
- `lib/ensureFirebaseAuth.ts` – Firebase Auth bridge
- `lib/sync-conversation.ts` – Ensure Firestore doc for conversation

### Hooks
- `hooks/useChatNotifications.ts` – Notification sound + FCM token management

### Server
- `app/api/firebase/custom-token/route.ts` – Generate Firebase custom tokens
- `app/api/admin/migrate-users/route.ts` – Migrate Supabase users to Firestore

### Security
- `firebase.rules` – Firestore access control rules

---

## How to Use

### Start Chat (Admin)
1. Type teacher name/email in search box
2. Press **Enter** → opens/creates conversation with that teacher

### Start Chat (Teacher)
1. Click **"Start Chat with Admin"** button
2. Message list loads automatically
3. First admin from profiles becomes the chat partner

### Send Message
1. Type message in input field
2. Press **Enter** or click send icon
3. Message appears in Firestore → real-time sync to other participant

### Receive Notifications
1. **Foreground**: Sound plays + toast shows (if in chat)
2. **Background**: Service worker displays push notification
3. **Badge**: Unread count shows in sidebar

---

## Environment Variables

Create `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJx...

# Firebase (from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyx...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=my-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=my-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BNIF-xb...

# Firebase Admin (service account from Firebase Console)
FIREBASE_PROJECT_ID=my-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@my-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## Deployment

### Vercel
1. Add all `.env.*` variables in Vercel project settings
2. Deploy as normal (`git push`)
3. HTTPS will automatically enable for web push notifications

### Firestore Rules
```bash
npm install -g firebase-tools
firebase login
firebase use my-project-id
firebase deploy --only firestore:rules
```

---

## Testing Checklist

- [ ] Admin logs in → sees conversation list
- [ ] Admin types teacher name + Enter → new conversation created
- [ ] Teacher logs in → sees admin conversations automatically
- [ ] Admin sends message → appears instantly in both windows
- [ ] Unread badge updates in sidebar
- [ ] Click message → reads notification sound (if enabled)
- [ ] Close tab → return → messages still there
- [ ] Firestore console shows `conversations/{id}/messages/{mid}` documents
- [ ] Service worker registered: `navigator.serviceWorker.getRegistrations()`

---

## Optional Enhancements
- ✅ Last message preview in conversation list
- ✅ Auto-scroll to newest message
- ✅ Human-friendly timestamps
- ✅ Mobile-responsive design
- ⏳ Typing indicators (not yet)
- ⏳ Read receipts with timestamps (partial: `isRead` flag only)
- ⏳ Message reactions/emojis (not yet)
- ⏳ File attachments (not yet)

---

## Troubleshooting

### Messages not loading
- Ensure Firestore rules deployed
- Check Firebase credentials in `.env.local`
- Verify Supabase → Firebase custom token API is accessible

### Push notifications not working
- Must be HTTPS (local dev won't work; use Vercel)
- Allow notifications in browser settings
- Check FCM tokens stored in Firestore `users/{uid}.fcmTokens`

### Sound not playing
- Grant microphone permission (if browser asks)
- Test: Open DevTools → Console → `audioContext.state`
- Call `initAudioContext()` on user interaction first

### Unread count stuck
- Check Firestore `messages` have `isRead: false`
- Verify `markConversationAsRead` runs when conversation opens
- Check Firebase UID matches Supabase UID

---

## References
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
