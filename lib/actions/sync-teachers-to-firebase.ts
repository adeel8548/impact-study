"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { db, isFirebaseAdminReady } from "@/lib/firebase-admin";

/**
 * Sync a single teacher to Firebase chat_users
 */
export async function syncTeacherToFirebase(teacherId: string) {
  // Check if Firebase Admin is configured
  if (!isFirebaseAdminReady() || !db) {
    console.warn("⚠️ Firebase Admin not configured, skipping teacher sync");
    return { success: true, message: "Firebase sync skipped (not configured)" };
  }

  try {
    const supabase = await createAdminClient();

    // Get teacher from Supabase
    const { data: teacher, error } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("id", teacherId)
      .eq("role", "teacher")
      .single();

    if (error || !teacher) {
      return { error: "Teacher not found" };
    }

    // Sync to Firebase
    const chatUserRef = db.collection("chat_users").doc(teacherId);
    await chatUserRef.set(
      {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        lastSyncedAt: new Date(),
        isActive: true,
      },
      { merge: true }
    );

    console.log(`✅ Synced teacher ${teacher.id} (${teacher.name}) to Firebase`);
    return { success: true, teacher: teacher.name };
  } catch (error) {
    console.error("Failed to sync teacher:", error);
    return { error: "Failed to sync teacher to Firebase" };
  }
}

/**
 * Sync all teachers from Supabase to Firebase
 */
export async function syncAllTeachersToFirebase() {
  // Check if Firebase Admin is configured
  if (!isFirebaseAdminReady() || !db) {
    console.warn("⚠️ Firebase Admin not configured, skipping sync");
    return { 
      success: false, 
      error: "Firebase Admin SDK not configured. Please follow FIREBASE_ADMIN_SETUP.md" 
    };
  }

  try {
    const supabase = await createAdminClient();

    // Get all teachers from Supabase
    const { data: teachers, error } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("role", "teacher");

    if (error) {
      return { error: "Failed to fetch teachers" };
    }

    if (!teachers || teachers.length === 0) {
      return { success: true, message: "No teachers to sync", count: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    // Sync each teacher to Firebase
    for (const teacher of teachers) {
      try {
        const chatUserRef = db.collection("chat_users").doc(teacher.id);
        await chatUserRef.set(
          {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            role: teacher.role,
            lastSyncedAt: new Date(),
            isActive: true,
          },
          { merge: true }
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to sync teacher ${teacher.id}:`, err);
        failedCount++;
      }
    }

    return {
      success: true,
      message: `Synced ${successCount} teachers, ${failedCount} failed`,
      total: teachers.length,
      synced: successCount,
      failed: failedCount,
    };
  } catch (error) {
    console.error("Failed to sync teachers:", error);
    return { error: "Failed to sync teachers to Firebase" };
  }
}

/**
 * Delete teacher from Firebase and archive conversations
 */
export async function deleteTeacherFromFirebase(teacherId: string) {
  // Check if Firebase Admin is configured
  if (!isFirebaseAdminReady() || !db) {
    console.warn("⚠️ Firebase Admin not configured, skipping teacher deletion");
    return { success: true, message: "Firebase delete skipped (not configured)" };
  }

  try {
    const batch = db.batch();

    // Delete from chat_users
    const chatUserRef = db.collection("chat_users").doc(teacherId);
    batch.delete(chatUserRef);

    // Archive conversations where this teacher is a participant
    const conversationsSnapshot = await db
      .collection("conversations")
      .where("participants", "array-contains", teacherId)
      .get();

    conversationsSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        isArchived: true,
        archivedAt: new Date(),
        archivedReason: "Teacher account deleted",
      });
    });

    await batch.commit();

    return {
      success: true,
      message: `Deleted teacher and archived ${conversationsSnapshot.size} conversations`,
    };
  } catch (error) {
    console.error("Failed to delete teacher from Firebase:", error);
    return { error: "Failed to delete teacher from Firebase" };
  }
}
