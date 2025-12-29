#!/bin/bash

# Complete Chat System Setup Script

echo "🚀 Chat System Setup"
echo "===================="
echo ""

# Step 1: Install missing dependencies
echo "1️⃣  Installing dependencies..."
npm install firebase-admin --save

# Step 2: Verify files exist
echo "2️⃣  Verifying files..."
ls -la lib/firestore-helpers.ts
ls -la components/chat/ChatWindow.tsx
ls -la scripts/firestore-security-rules.txt

# Step 3: Instructions for manual steps
cat << 'EOF'

3️⃣  MANUAL STEPS REQUIRED:

📋 Part 1: Firebase Console Setup
1. Go to https://console.firebase.google.com
2. Create a new project (or use existing)
3. Enable Firestore Database (start in production mode)
4. Go to Project Settings > Service Accounts
5. Generate new private key (JSON)
6. Copy all Firebase config values

📋 Part 2: Environment Configuration
1. Copy .env.local.example to .env.local
2. Fill in all NEXT_PUBLIC_FIREBASE_* values from Firebase console
3. Fill in FIREBASE_* values from service account JSON

📋 Part 3: Firestore Security Rules
1. Firebase Console > Firestore Database > Rules tab
2. Copy entire content from scripts/firestore-security-rules.txt
3. Paste into Rules editor
4. Click Publish

📋 Part 4: Next Steps (After Config)
1. Admin Chat Page → app/admin/chat/page.tsx (needs broadcast implementation)
2. Teacher Chat Page → app/teacher/chat/page.tsx (needs teacher view)
3. API Route for tokens → app/api/firebase/custom-token/route.ts
4. Service Worker → public/firebase-messaging-sw.js (for notifications)

EOF

echo ""
echo "✅ Setup complete! Follow the manual steps above."
