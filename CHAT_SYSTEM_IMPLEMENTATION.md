# Real-Time Chat System - Complete Implementation Guide

## Overview
This guide provides the complete implementation for a real-time chat system with:
- **Supabase Auth** for authentication
- **Firebase Firestore** for chat data storage and real-time messaging
- **Multi-select broadcast** capability for admins
- **Web Push Notifications** via FCM
- **Real-time conversation updates**

## 1. Architecture

### Authentication Flow
```
User Login → Supabase Auth → Get Supabase UID → Exchange for Firebase Custom Token → Chat Operations
```

### Database Structure (Firebase Firestore)

#### Collections
- **users** - User profiles with role and FCM token
- **conversations** - Chat sessions between admin and teacher
  - adminId: string
  - teacherId: string
  - lastMessage: string (optional)
  - updatedAt: timestamp
  - **messages** (subcollection) - Individual messages
    - senderId: string
    - text: string
    - createdAt: timestamp
    - isRead: boolean

## 2. Required Files

### Already Created
- `/lib/firestore-helpers.ts` - Firebase Firestore helpers for all CRUD operations
- `/lib/firebase.ts` - Firebase initialization
- `/components/chat/ChatWindow.tsx` - Updated chat component with real-time messaging
- `/scripts/firestore-security-rules.txt` - Firestore security rules
- `.env.local.example` - Environment template

### Still Need To Create
- `app/admin/chat/page.tsx` - Admin chat page with broadcast
- `app/teacher/chat/page.tsx` - Teacher chat page
- `lib/firebase-admin.ts` - Admin SDK for backend operations
- `app/api/firebase/custom-token/route.ts` - Custom token generation API
- `public/firebase-messaging-sw.js` - Service worker for notifications
- `hooks/useFirebaseNotifications.ts` - Notifications hook

## 3. Admin Chat Page Implementation

The admin page should:
1. Load all teachers from Supabase profiles
2. Display list of conversations from Firebase
3. Allow multi-select of teachers via checkboxes
4. Support broadcast messages to multiple teachers
5. Show active conversation with selected teacher

### Key Features
- **Teacher Search** - Filter teachers by name/email
- **Multi-Select** - Choose multiple teachers with checkboxes
- **Broadcast Messages** - Send same message to multiple teachers at once
- **Conversation List** - See all active conversations with last message preview
- **Real-time Updates** - Messages appear instantly via Firestore onSnapshot

## 4. Teacher Chat Page Implementation

The teacher page should:
1. Load all conversations with admins from Firebase
2. Display admin name from Firebase users collection
3. Show real-time messages
4. Mark messages as read
5. Send messages in real-time

## 5. Setup Steps

### Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com
2. Create a new project
3. Enable Firestore Database
4. Set location (e.g., us-central1)
5. Start in production mode

### Step 2: Configure Environment Variables
Copy `.env.local.example` to `.env.local` and fill:
```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Step 3: Apply Firestore Security Rules
1. Go to Firebase Console > Firestore Database > Rules
2. Copy rules from `/scripts/firestore-security-rules.txt`
3. Paste and Deploy

### Step 4: Create API Route for Custom Tokens
Create `app/api/firebase/custom-token/route.ts` with firebase-admin SDK initialization

## 6. Broadcast Logic Flow

When admin selects multiple teachers and sends broadcast:

```typescript
async function broadcastMessage(adminId, teacherIds, text) {
  for (const teacherId of teacherIds) {
    // Get or create conversation
    const conversationId = await getOrCreateConversation(adminId, teacherId);
    
    // Add message to messages subcollection
    await sendMessage(conversationId, adminId, text);
    
    // Firestore automatically updates lastMessage and updatedAt
  }
  
  // Teacher sees new message in real-time via onSnapshot
}
```

## 7. Real-Time Updates

### For Admins
```typescript
useEffect(() => {
  const unsubscribe = subscribeToAdminConversations(adminId, (conversations) => {
    setConversations(conversations);
  });
  return () => unsubscribe();
}, [adminId]);
```

### For Teachers
```typescript
useEffect(() => {
  const unsubscribe = subscribeToTeacherConversations(teacherId, (conversations) => {
    setConversations(conversations);
  });
  return () => unsubscribe();
}, [teacherId]);
```

### For Messages
```typescript
useEffect(() => {
  const unsubscribe = subscribeToMessages(conversationId, (messages) => {
    setMessages(messages);
  });
  return () => unsubscribe();
}, [conversationId]);
```

## 8. Push Notifications Setup

### Enable FCM in Firebase
1. Firebase Console > Cloud Messaging tab
2. Note your Server API Key
3. Create Web Push Credentials
4. Note your VAPID Key

### Register Service Worker
```typescript
// In layout.tsx or app.tsx
navigator.serviceWorker.register('/firebase-messaging-sw.js');
```

### Get FCM Token and Store
```typescript
import { getMessaging, getToken } from 'firebase/messaging';

const messaging = getMessaging();
const token = await getToken(messaging, { 
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY 
});

// Store in Firebase users collection
await updateUserFcmToken(userId, token);
```

## 9. Message Flow Diagram

```
Admin Types Message
    ↓
Selects Teachers (Multi-select)
    ↓
Clicks Send Broadcast
    ↓
broadcastMessage() loops through teachers
    ↓
For each teacher:
  - getOrCreateConversation() → conversationId
  - sendMessage(conversationId, adminId, text)
  - Message added to conversations/{id}/messages/{messageId}
  - lastMessage + updatedAt updated in conversations/{id}
    ↓
Teacher opens chat page
    ↓
subscribeToTeacherConversations() listens for updates
    ↓
Real-time onSnapshot callback receives new conversation
    ↓
subscribeToMessages() listens for messages in conversation
    ↓
Real-time onSnapshot shows new message instantly
    ↓
Teacher reads message
    ↓
markConversationAsRead() updates isRead flag
```

## 10. Key Functions Reference

### From `/lib/firestore-helpers.ts`

```typescript
// Users
setFirebaseUser(user) // Create/update user
getFirebaseUser(uid) // Get user by UID
updateUserFcmToken(uid, token) // Update FCM token

// Conversations
getOrCreateConversation(adminId, teacherId) // Get or create conversation
subscribeToAdminConversations(adminId, callback) // Real-time conversations for admin
subscribeToTeacherConversations(teacherId, callback) // Real-time conversations for teacher

// Messages
sendMessage(conversationId, senderId, text) // Send message
subscribeToMessages(conversationId, callback) // Real-time messages
markConversationAsRead(conversationId, readerId) // Mark as read

// Broadcast
broadcastMessage(adminId, teacherIds, text) // Send to multiple teachers
```

## 11. Testing Checklist

- [ ] Admin can see list of teachers
- [ ] Admin can search and filter teachers
- [ ] Admin can select multiple teachers
- [ ] Admin can send broadcast message
- [ ] Each teacher sees new conversation in real-time
- [ ] Message appears in correct conversation
- [ ] Teacher can reply to message
- [ ] Admin sees reply in real-time
- [ ] Messages persist after page reload
- [ ] isRead status updates when teacher opens conversation
- [ ] Push notifications appear when message is received
- [ ] Unread badge shows correct count

## 12. Troubleshooting

### Messages not appearing
- Check Firestore rules in Firebase Console
- Verify userId matches across Supabase and Firebase
- Check browser console for errors
- Ensure onSnapshot subscriptions are active

### Broadcast not working
- Verify teacherIds exist in Firebase users collection
- Check that getOrCreateConversation completes before sendMessage
- Look for errors in sendMessage Firestore calls

### Notifications not working
- Verify VAPID key is correct
- Check FCM token is stored in users collection
- Ensure service worker is registered
- Verify browser notifications are enabled

## 13. Next Steps

1. Update `app/admin/chat/page.tsx` with new implementation
2. Update `app/teacher/chat/page.tsx` with new implementation
3. Create Firebase Admin SDK initialization file
4. Create custom token API route
5. Set up push notifications (service worker + FCM)
6. Test all features
7. Deploy to Vercel
