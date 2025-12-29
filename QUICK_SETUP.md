# ⚡ Quick Setup: Firebase Configuration (5 minutes)

## Step 1: Create Firebase Project (if needed)
Go to https://console.firebase.google.com
- Click "Create Project"
- Name: "impact-chat" (or anything)
- Click Continue → Enable Google Analytics (optional) → Create

## Step 2: Get Credentials
1. In Firebase Console, click **⚙️ Settings** (bottom left)
2. Click **Project Settings**
3. Scroll down to "Your apps"
4. Click on the **Web app** (looks like `</>`)
5. Copy the `firebaseConfig` object

Example of what you'll see:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "impact-chat-abc123.firebaseapp.com",
  projectId: "impact-chat-abc123",
  storageBucket: "impact-chat-abc123.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcd1234ef56",
};
```

## Step 3: Create `.env.local` File
In your project root (`c:\Users\Adeel Tariq\Desktop\impact-study\`), create a new file called `.env.local`

Add these lines (replace values from Step 2):
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=impact-chat-abc123.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=impact-chat-abc123
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=impact-chat-abc123.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcd1234ef56
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BNIF_xbABCDEF123456789...
```

## Step 4: Get Admin SDK Keys (Optional but Recommended)
1. In Firebase Console, go to **Service Accounts** (left menu)
2. Click **Generate New Private Key** (downloads JSON file)
3. Open the JSON file and add to `.env.local`:

```bash
FIREBASE_PROJECT_ID=impact-chat-abc123
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@impact-chat-abc123.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n"
```

**Note**: Copy the entire `private_key` value exactly, keep the `\n` characters.

## Step 5: Restart Dev Server
```bash
# Stop current server (press Ctrl+C)
# Then restart:
npm run dev
```

## Step 6: Test
1. Open chat page (Admin or Teacher)
2. Should NOT see "Firebase Not Configured" error
3. Click "Start Chat with Admin" (teacher) or search teacher name (admin)
4. Conversation should appear!

---

## Troubleshooting

### Still seeing "Firebase Not Configured"?
- Check that `.env.local` file exists in project root
- Verify all values are filled (not empty)
- Restart dev server
- Clear browser cache (Ctrl+Shift+Delete)

### Getting permission errors?
- Go to [Firestore Security Rules](FIREBASE_FIRESTORE_CHAT_V2.md#7-security)
- Deploy rules: `firebase deploy --only firestore:rules`

### Messages not real-time?
- Firebase might have issues. Check browser console for errors
- System will fall back to Supabase (non-real-time)

---

## Files Provided as Reference
- `.env.local.example` – Template with all variable names
- `FIREBASE_SETUP_GUIDE.md` – Detailed guide
- `CHAT_ISSUE_RESOLVED.md` – What was fixed

---

## Next Steps (After Setup)
1. Create first conversation: Teacher clicks "Start Chat with Admin"
2. Send a message
3. Both UIs should update in real-time
4. Unread badge should show in admin sidebar

🎉 You're done! Chat system is ready to use.
