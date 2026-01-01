# Firebase Admin SDK Setup Guide

## Quick Setup (5 minutes)

### Step 1: Get Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **school-web-system**
3. Click **Settings** (⚙️) → **Project settings**
4. Navigate to **Service accounts** tab
5. Click **Generate new private key**
6. Click **Generate key** → Downloads a JSON file

### Step 2: Extract Credentials from JSON

The downloaded JSON file looks like this:
```json
{
  "type": "service_account",
  "project_id": "school-web-system",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xyz@school-web-system.iam.gserviceaccount.com",
  "client_id": "123456789",
  ...
}
```

### Step 3: Update .env.local

Copy these three values to `.env.local`:

```bash
FIREBASE_PROJECT_ID=school-web-system
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xyz@school-web-system.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

**Important:** 
- Keep the quotes around `FIREBASE_PRIVATE_KEY`
- Keep the `\n` characters as-is (don't replace with actual newlines)
- Don't commit this file to Git (already in .gitignore)

### Step 4: Restart Development Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 5: Test the Sync

After server restarts, try adding a new teacher. It should automatically sync to Firebase!

## Verification

Check if it's working:

1. **Add a teacher** via Admin UI
2. **Go to Firebase Console** → Firestore Database
3. **Check `chat_users` collection** → Should see new teacher document
4. **Document ID** should match Supabase teacher ID

## Troubleshooting

### Error: "Invalid service account"
- Check that `FIREBASE_PRIVATE_KEY` has quotes around it
- Verify `\n` characters are preserved
- Make sure email matches your project

### Error: "Permission denied"
- Go to Firebase Console → Firestore Database → Rules
- Temporarily set rules to allow server writes:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true; // Temporarily for testing
      }
    }
  }
  ```

### Teachers not syncing
- Check server logs for errors
- Verify `.env.local` file is in project root
- Restart dev server after changing `.env.local`

## Security Notes

⚠️ **NEVER commit `.env.local` to Git**
⚠️ **Keep service account key secure**
⚠️ **Rotate keys if accidentally exposed**

---

Once setup is complete, teachers will automatically sync to Firebase! 🎉
