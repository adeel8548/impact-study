# Firebase - Supabase Sync Setup Guide

## Overview
This setup syncs Supabase teachers with Firebase Firestore chat_users and conversations in real-time.

## Components

### 1. Database Triggers (Supabase SQL)
- **File**: `supabase/migrations/sync_teachers_to_firebase.sql`
- **What it does**: 
  - Triggers on teacher INSERT → logs sync action and notifies
  - Triggers on teacher DELETE → logs sync action and notifies
  - Creates `firebase_sync_log` table to track sync status

### 2. Edge Function (TypeScript - Deno)
- **File**: `supabase/functions/sync-teachers-firebase/index.ts`
- **What it does**:
  - Receives sync events from database triggers
  - Syncs teacher data to Firebase using Admin SDK
  - Deletes from Firebase when Supabase teacher is deleted
  - Archives conversations instead of deleting them

### 3. API Route (Next.js Backend)
- **File**: `app/api/sync/firebase-teachers/route.ts`
- **What it does**:
  - POST: Manually trigger sync or sync specific teacher
  - GET: Check pending syncs
  - Uses Firebase Admin SDK for safe backend operations

## Environment Setup

### 1. Firebase Service Account Key
```bash
# Get from Firebase Console → Project Settings → Service Accounts
# Copy the entire JSON and add to .env.local:

FIREBASE_SERVICE_ACCOUNT_KEY='{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}'

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SYNC_SECRET=your-secret-key-for-api-calls
```

### 2. Supabase Environment
```bash
# Already in .env.local (from Next.js):
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

### 3. Supabase Edge Function Secrets
Deploy the Edge Function with environment variables:
```bash
# Add these to Supabase Edge Function secrets
supabase secrets set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
supabase secrets set FIREBASE_PROJECT_ID=your-project-id
```

## Deployment Steps

### Step 1: Run SQL Migrations
```bash
# Apply the database schema
supabase migration up

# Or manually run the SQL in Supabase SQL Editor
```

### Step 2: Deploy Edge Function (Optional)
```bash
# Push to Supabase
supabase functions deploy sync-teachers-firebase

# Invoke to test
curl -X POST https://your-project.supabase.co/functions/v1/sync-teachers-firebase \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"event": "manual_sync"}'
```

### Step 3: Start Next.js Backend
```bash
# The API route will be available at:
# POST /api/sync/firebase-teachers
# GET /api/sync/firebase-teachers
```

## Usage

### Manual Full Sync (via API)
```bash
curl -X POST http://localhost:3000/api/sync/firebase-teachers \
  -H "x-sync-secret: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync_all"}'

# Response:
# {
#   "success": true,
#   "total": 15,
#   "synced": 15,
#   "failed": 0,
#   "timestamp": "2024-01-01T12:00:00Z"
# }
```

### Sync Specific Teacher
```bash
curl -X POST http://localhost:3000/api/sync/firebase-teachers \
  -H "x-sync-secret: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync_teacher", "teacherId": "uuid-here"}'
```

### Delete Teacher from Firebase
```bash
curl -X POST http://localhost:3000/api/sync/firebase-teachers \
  -H "x-sync-secret: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"action": "delete_teacher", "teacherId": "uuid-here"}'
```

### Check Sync Status
```bash
curl http://localhost:3000/api/sync/firebase-teachers

# Response:
# {
#   "status": "ok",
#   "pendingSyncs": [...],
#   "timestamp": "2024-01-01T12:00:00Z"
# }
```

## How It Works

### Flow 1: Teacher Added in Supabase
```
1. Admin adds teacher via UI → Supabase INSERT
2. Database trigger fires → logs sync action
3. Trigger sends pg_notify event
4. Edge Function (or API) receives event
5. Firebase Admin SDK creates chat_users doc
6. firebase_sync_log marked as SUCCESS
```

### Flow 2: Teacher Deleted from Supabase
```
1. Admin deletes teacher → Supabase DELETE
2. Database trigger fires → logs sync action
3. Trigger sends pg_notify event
4. Edge Function (or API) receives event
5. Firebase Admin SDK deletes chat_users doc
6. Firebase Admin SDK archives conversations
7. firebase_sync_log marked as SUCCESS
```

## Error Handling

### Retry Failed Syncs
```sql
-- Find failed syncs
SELECT * FROM firebase_sync_log WHERE status = 'FAILED';

-- View error details
SELECT teacher_id, error_message FROM firebase_sync_log 
WHERE status = 'FAILED' 
ORDER BY created_at DESC;
```

### Manual Recovery
```bash
# Retry specific teacher sync
curl -X POST http://localhost:3000/api/sync/firebase-teachers \
  -H "x-sync-secret: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync_teacher", "teacherId": "failed-teacher-id"}'
```

## Monitoring

### Check Sync Logs
```sql
-- View all sync activity
SELECT * FROM firebase_sync_log ORDER BY created_at DESC LIMIT 20;

-- Check success rate
SELECT 
  action,
  status,
  COUNT(*) as count
FROM firebase_sync_log
GROUP BY action, status;

-- Find recent failures
SELECT * FROM firebase_sync_log 
WHERE status = 'FAILED' 
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Firebase Console
- Navigate to Firestore → Collections
- Check `chat_users` collection for synced teachers
- Check `conversations` collection for archived chats

## Security Notes

1. **API Secret**: Set `FIREBASE_SYNC_SECRET` in .env.local
2. **Service Account**: Keep Firebase service account key secure (use .env.local, never commit)
3. **Database Triggers**: Only fire on teacher role changes
4. **Edge Functions**: Verify requests before processing
5. **Firestore Rules**: Restrict writes to server-only operations

## Firestore Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all client writes to chat_users
    match /chat_users/{userId} {
      allow read: if request.auth.uid != null;
      allow write: if false; // Server-only
    }
    
    // Allow user to read/write own conversations
    match /conversations/{conversationId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow write: if false; // Server-only for archiving
    }
  }
}
```

## Troubleshooting

### Sync not happening
1. Check `firebase_sync_log` for errors
2. Verify Firebase Service Account is valid
3. Check `FIREBASE_PROJECT_ID` is correct
4. Ensure Supabase Edge Function has Firebase secrets

### Teachers not appearing in chat
1. Check Firebase console → chat_users collection
2. Verify IDs match between Supabase and Firebase
3. Check Firestore rules allow reads for authenticated users
4. Run manual sync: `{"action": "sync_all"}`

### Conversations not archiving
1. Check conversations have `participants` array field
2. Verify Firestore batch operations succeed
3. Check error_message in firebase_sync_log

## Next Steps

1. ✅ Apply SQL migrations
2. ✅ Set environment variables
3. ✅ Deploy Edge Function or use API route
4. ✅ Test with new teacher creation/deletion
5. ✅ Monitor sync logs
6. ✅ Update Firestore security rules
