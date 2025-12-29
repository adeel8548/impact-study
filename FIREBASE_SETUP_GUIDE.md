# Chat Setup Guide - Firebase Configuration

## Problem
Teachers and conversations are not showing on the chat page because **Firebase environment variables are not configured**.

## Solution

### Step 1: Get Firebase Credentials
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create one)
3. Click **Settings** ⚙️ (bottom-left)
4. Go to **Project Settings**
5. Scroll to **Your apps** section
6. Under "Firebase SDK snippet", select **Config**
7. Copy all the configuration values

### Step 2: Create `.env.local` File
Create a new file at the root: `.env.local`

Add these values (replace with your actual Firebase config):
```bash
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcd1234
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BNIF_xb...  (if using push notifications)

# Firebase Admin SDK Configuration (for API routes)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Step 3: Get Admin SDK Keys (for server-side)
1. In Firebase Console, go to **Service Accounts**
2. Click **Generate New Private Key**
3. Copy the JSON content
4. Extract these fields:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters)

### Step 4: Restart Dev Server
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Test
- Refresh the chat page
- You should see conversations loading (or a message to create one)
- If you see an error about Firebase not being configured, double-check your `.env.local` file

---

## Fallback: Supabase Conversations

If Firebase is not configured OR has issues, the app will fall back to loading conversations from Supabase `conversations` table. This means:
- ✅ You can still see existing conversations
- ✅ Messages will be loaded from Supabase
- ❌ Real-time updates won't work
- ❌ Push notifications won't work

---

## Troubleshooting

### Chat page shows error about Firebase not configured
→ Add the `.env.local` file with Firebase credentials

### Chat page shows "No chats yet"
→ First admin/teacher needs to create a conversation using "Start Chat with Admin" button (teacher side) or search for teacher name (admin side)

### Messages not loading in real-time
→ Firebase might not be configured correctly. Check browser console for errors.

### FCM Push Notifications not working
→ Must be HTTPS (won't work on localhost). Deploy to Vercel first.

---

## Environment Variables Checklist

| Variable | Required | Where to find |
|----------|----------|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase Console → Project Settings |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase Console → Project Settings |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase Console → Project Settings |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase Console → Project Settings |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase Console → Project Settings |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Firebase Console → Project Settings |
| `FIREBASE_PROJECT_ID` | ✅ | Service Account JSON |
| `FIREBASE_CLIENT_EMAIL` | ✅ | Service Account JSON |
| `FIREBASE_PRIVATE_KEY` | ✅ | Service Account JSON |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | ❌ | For push notifications only |

---

## Copy `.env.local.example` as Template
A template file `.env.local.example` is provided. You can use it as reference:
```bash
cat .env.local.example
```

Then create `.env.local` with actual values.
