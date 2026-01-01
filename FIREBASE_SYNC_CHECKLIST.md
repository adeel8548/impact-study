# Firebase-Supabase Sync Implementation Checklist

## ✅ Files Created

- [x] SQL Migrations: `supabase/migrations/sync_teachers_to_firebase.sql`
- [x] Edge Function: `supabase/functions/sync-teachers-firebase/index.ts`
- [x] API Route: `app/api/sync/firebase-teachers/route.ts`
- [x] Setup Guide: `FIREBASE_SUPABASE_SYNC_SETUP.md`

## 📋 Implementation Steps

### Phase 1: Configuration (15 minutes)

- [ ] Get Firebase Service Account JSON from Console
- [ ] Add `FIREBASE_SERVICE_ACCOUNT_KEY` to `.env.local`
- [ ] Add `FIREBASE_PROJECT_ID` to `.env.local`
- [ ] Generate and add `FIREBASE_SYNC_SECRET` to `.env.local`
- [ ] Verify Supabase URL and keys are in `.env.local`

### Phase 2: Database Setup (10 minutes)

- [ ] Run SQL migrations in Supabase SQL Editor
- [ ] Verify tables created: `firebase_sync_log`
- [ ] Verify triggers created: `sync_teacher_insert`, `sync_teacher_delete`
- [ ] Test triggers by manually inserting a test teacher

### Phase 3: Backend Deployment (5 minutes)

**Option A: Using API Route (Recommended for now)**
- [ ] Verify `app/api/sync/firebase-teachers/route.ts` exists
- [ ] Install firebase-admin: `npm install firebase-admin`
- [ ] Start dev server: `npm run dev`
- [ ] Test endpoint: `GET http://localhost:3000/api/sync/firebase-teachers`

**Option B: Using Edge Function (Advanced)**
- [ ] Install Supabase CLI: `brew install supabase/tap/supabase`
- [ ] Deploy Edge Function: `supabase functions deploy sync-teachers-firebase`
- [ ] Set secrets: `supabase secrets set FIREBASE_SERVICE_ACCOUNT_KEY="..."`
- [ ] Test function: `supabase functions invoke sync-teachers-firebase`

### Phase 4: Testing (20 minutes)

**Manual Sync All**
```bash
curl -X POST http://localhost:3000/api/sync/firebase-teachers \
  -H "x-sync-secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync_all"}'
```
Expected: All existing teachers synced to Firebase

**Add New Teacher**
- [ ] Add teacher via Admin UI
- [ ] Check `firebase_sync_log` table
- [ ] Check Firebase console → chat_users collection
- [ ] Verify teacher document exists with correct ID

**Delete Teacher**
- [ ] Delete teacher via Admin UI
- [ ] Check `firebase_sync_log` table
- [ ] Check Firebase console → chat_users collection
- [ ] Verify teacher document is deleted
- [ ] Verify conversations marked as archived

**Check Sync Status**
```bash
curl http://localhost:3000/api/sync/firebase-teachers
```
Expected: Shows pending syncs list

### Phase 5: Monitoring Setup (10 minutes)

**Supabase Monitoring**
- [ ] Create query for failed syncs:
  ```sql
  SELECT * FROM firebase_sync_log WHERE status = 'FAILED' ORDER BY created_at DESC;
  ```
- [ ] Set up alerts for failed syncs (if using Supabase dashboard)

**Firebase Monitoring**
- [ ] Check Firestore document count matches Supabase teachers count
- [ ] Monitor write operations in Firebase Analytics

### Phase 6: Security Hardening (10 minutes)

- [ ] Update Firestore rules to deny client writes to chat_users
- [ ] Add request validation in API route
- [ ] Rotate `FIREBASE_SYNC_SECRET` after deployment
- [ ] Set up error logging/alerting for failed syncs

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
npm install firebase-admin

# 2. Add environment variables to .env.local
FIREBASE_SERVICE_ACCOUNT_KEY='...'
FIREBASE_PROJECT_ID='...'
FIREBASE_SYNC_SECRET='...'

# 3. Run migrations
# (Via Supabase Dashboard → SQL Editor, paste content from sync_teachers_to_firebase.sql)

# 4. Start dev server
npm run dev

# 5. Test the sync API
curl -X POST http://localhost:3000/api/sync/firebase-teachers \
  -H "x-sync-secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync_all"}'
```

## 📊 Expected Results

### After Full Sync
- Firebase `chat_users` collection contains all Supabase teachers
- Each teacher has ID = Supabase teacher.id
- `firebase_sync_log` shows SUCCESS status

### After Adding Teacher
- Teacher appears in `chat_users` within seconds
- `firebase_sync_log` shows new INSERT entry with SUCCESS

### After Deleting Teacher
- Teacher removed from `chat_users` collection
- Conversations archived (not deleted)
- `firebase_sync_log` shows DELETE entry with SUCCESS

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on sync endpoint | Ensure `npm run dev` is running and route exists |
| "Unauthorized" error | Check `x-sync-secret` header matches `FIREBASE_SYNC_SECRET` |
| Firebase SDK error | Verify service account JSON is valid and PROJECT_ID matches |
| No syncs in log | Check database triggers are active in Supabase |
| Teachers not in Firebase | Run manual `sync_all` action via API |

## 📝 Notes

- IDs are automatically consistent (Supabase ID = Firebase Doc ID)
- Conversations are archived, not deleted (preserves chat history)
- All operations are backend-only (no client SDK Firebase access)
- Supabase is the single source of truth
- sync_log table can be used for auditing and monitoring

## 🎯 Success Criteria

- [ ] Teachers sync from Supabase to Firebase automatically
- [ ] New teachers appear in chat within seconds
- [ ] Deleted teachers are removed from chat
- [ ] Conversations archive when teacher is deleted
- [ ] All operations logged in firebase_sync_log
- [ ] No client-side Firebase writes possible
- [ ] IDs remain consistent across both databases
