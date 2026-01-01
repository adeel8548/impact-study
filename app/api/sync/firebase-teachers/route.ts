import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { db as firestore, isFirebaseAdminReady } from "@/lib/firebase-admin";

/**
 * Sync teacher to Firebase chat_users collection
 */
async function syncTeacherToFirebase(teacherId: string, teacherData: any) {
    if (!isFirebaseAdminReady()) {
      console.warn("⚠️ Firebase Admin not configured, skipping teacher sync");
      return { success: true, skipped: true };
    }

  try {
    const chatUserRef = firestore.collection("chat_users").doc(teacherId);

    const chatUserDoc = {
      id: teacherId,
      name: teacherData.name,
      email: teacherData.email,
      role: teacherData.role,
      lastSyncedAt: new Date(),
      isActive: true,
    };

    await chatUserRef.set(chatUserDoc, { merge: true });

    console.log(
      `✅ Synced teacher ${teacherId} (${teacherData.name}) to Firebase`
    );
    return { success: true, teacher: teacherId };
  } catch (error) {
    console.error(`❌ Failed to sync teacher ${teacherId}:`, error);
    throw error;
  }
}

/**
 * Delete teacher from Firebase and archive conversations
 */
async function deleteTeacherFromFirebase(teacherId: string) {
    if (!isFirebaseAdminReady()) {
      console.warn("⚠️ Firebase Admin not configured, skipping teacher deletion");
      return { success: true, skipped: true };
    }

  try {
    const batch = firestore.batch();

    // Delete chat_users document
    const chatUserRef = firestore.collection("chat_users").doc(teacherId);
    batch.delete(chatUserRef);

    // Find and archive conversations
    const conversationsRef = firestore.collection("conversations");
    const snapshot = await conversationsRef
      .where("participants", "array-contains", teacherId)
      .get();

    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        isArchived: true,
        archivedAt: new Date(),
        archivedReason: "Teacher account deleted",
      });
    });

    await batch.commit();

    console.log(
      `✅ Deleted teacher ${teacherId} from Firebase and archived conversations`
    );
    return { success: true, teacher: teacherId, conversationsArchived: snapshot.size };
  } catch (error) {
    console.error(`❌ Failed to delete teacher ${teacherId}:`, error);
    throw error;
  }
}

/**
 * Sync all teachers from Supabase to Firebase
 */
async function syncAllTeachers() {
    if (!isFirebaseAdminReady()) {
      console.warn("⚠️ Firebase Admin not configured, skipping bulk sync");
      return { success: true, skipped: true, count: 0 };
    }

  try {
    const supabase = await createAdminClient();

    const { data: teachers, error } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("role", "teacher");

    if (error) throw error;

    if (!teachers || teachers.length === 0) {
      console.log("No teachers found to sync");
      return { success: true, syncedCount: 0 };
    }

    let successCount = 0;
    let failureCount = 0;
    const failedTeachers: string[] = [];

    for (const teacher of teachers) {
      try {
        await syncTeacherToFirebase(teacher.id, teacher);
        successCount++;
      } catch (error) {
        failureCount++;
        failedTeachers.push(teacher.id);
      }
    }

    const result = {
      success: true,
      total: teachers.length,
      synced: successCount,
      failed: failureCount,
      failedTeachers,
      timestamp: new Date().toISOString(),
    };

    console.log(`Sync complete: ${successCount} successful, ${failureCount} failed`);
    return result;
  } catch (error) {
    console.error("Failed to sync all teachers:", error);
    throw error;
  }
}

/**
 * POST endpoint to manually trigger sync or sync specific teacher
 */
export async function POST(request: NextRequest) {
  // Verify secret for security
  const secret = request.headers.get("x-sync-secret");
  if (secret !== process.env.FIREBASE_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, teacherId } = body;

    if (action === "sync_all") {
      const result = await syncAllTeachers();
      return NextResponse.json(result);
    } else if (action === "sync_teacher" && teacherId) {
      const supabase = await createAdminClient();
      const { data: teacher, error } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .eq("id", teacherId)
        .single();

      if (error || !teacher) {
        return NextResponse.json(
          { error: "Teacher not found" },
          { status: 404 }
        );
      }

      const result = await syncTeacherToFirebase(teacherId, teacher);
      return NextResponse.json(result);
    } else if (action === "delete_teacher" && teacherId) {
      const result = await deleteTeacherFromFirebase(teacherId);
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: "Invalid action or missing teacherId" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check sync status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();

    // Get pending syncs
    const { data: pendingSyncs, error } = await supabase
      .from("firebase_sync_log")
      .select("*")
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({
      status: "ok",
      pendingSyncs: pendingSyncs || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
