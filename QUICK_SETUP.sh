#!/bin/bash

# QUICK SETUP SCRIPT
# Run this to copy all implementation files to their correct locations

echo "🚀 Real-Time Chat System - Quick Setup"
echo "======================================"
echo ""

# Check if files exist
if [ ! -f "ADMIN_CHAT_IMPLEMENTATION.tsx" ]; then
    echo "❌ Error: ADMIN_CHAT_IMPLEMENTATION.tsx not found"
    exit 1
fi

if [ ! -f "TEACHER_CHAT_IMPLEMENTATION.tsx" ]; then
    echo "❌ Error: TEACHER_CHAT_IMPLEMENTATION.tsx not found"
    exit 1
fi

echo "📋 Copying implementation files..."

# Backup existing files
if [ -f "app/admin/chat/page.tsx" ]; then
    echo "  📦 Backing up app/admin/chat/page.tsx"
    cp app/admin/chat/page.tsx app/admin/chat/page.tsx.backup
fi

if [ -f "app/teacher/chat/page.tsx" ]; then
    echo "  📦 Backing up app/teacher/chat/page.tsx"
    cp app/teacher/chat/page.tsx app/teacher/chat/page.tsx.backup
fi

# Copy implementation files to actual locations
echo "  ✅ Copying admin chat page..."
cp ADMIN_CHAT_IMPLEMENTATION.tsx app/admin/chat/page.tsx

echo "  ✅ Copying teacher chat page..."
cp TEACHER_CHAT_IMPLEMENTATION.tsx app/teacher/chat/page.tsx

echo ""
echo "✅ Files copied successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Configure .env.local with Firebase credentials"
echo "2. Apply Firestore security rules from scripts/firestore-security-rules.txt"
echo "3. Restart your dev server (npm run dev)"
echo "4. Test by logging in and opening /admin/chat and /teacher/chat"
echo ""
echo "📚 For detailed info, read: IMPLEMENTATION_READY.md"
