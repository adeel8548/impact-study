import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { initializeApp, cert } from "https://esm.sh/firebase-admin@11.11.0/app";
import { getFirestore } from "https://esm.sh/firebase-admin@11.11.0/firestore";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Firebase Admin SDK
const firebaseServiceAccount = JSON.parse(
  Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}"
);

if (!firebaseServiceAccount.project_id) {
  throw new Error("Missing Firebase service account configuration");
}

const firebaseApp = initializeApp({
  credential: cert(firebaseServiceAccount),
  projectId: firebaseServiceAccount.project_id,
});

const firestore = getFirestore(firebaseApp);

interface TeacherData {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SyncEvent {
  event: "teacher_inserted" | "teacher_deleted" | "manual_sync";
  teacher_id: string;
  timestamp: string;
  teacher_name?: string;
  teacher_email?: string;
  role?: string;
}

/**
 * Create or update Firebase chat_users document
 */
async function syncTeacherToFirebase(teacher: TeacherData): Promise<void> {
  try {
    const chatUserRef = firestore.collection("chat_users").doc(teacher.id);

    const chatUserData = {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
      lastSyncedAt: new Date(),
      isActive: true,
    };

    await chatUserRef.set(chatUserData, { merge: true });

    console.log(`✅ Synced teacher ${teacher.id} (${teacher.name}) to Firebase`);
  } catch (error) {
    console.error(
      `❌ Failed to sync teacher ${teacher.id} to Firebase:`,
      error
    );
    throw error;
  }
}

/**
 * Delete Firebase chat_users document and related conversations
 */
async function deleteTeacherFromFirebase(teacherId: string): Promise<void> {
  try {
    const batch = firestore.batch();

    // Delete chat_users document
    const chatUserRef = firestore.collection("chat_users").doc(teacherId);
    batch.delete(chatUserRef);

    // Find and delete/deactivate conversations involving this teacher
    const conversationsRef = firestore.collection("conversations");

    // Query conversations where teacher is participant1 or participant2
    const snapshot = await conversationsRef
      .where("participants", "array-contains", teacherId)
      .get();

    snapshot.forEach((doc) => {
      // Option 1: Mark as archived instead of deleting (preserves history)
      batch.update(doc.ref, {
        isArchived: true,
        archivedAt: new Date(),
        archivedReason: "Teacher account deleted",
      });

      // Option 2: Delete completely (uncomment if preferred)
      // batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(
      `✅ Deleted teacher ${teacherId} from Firebase and archived conversations`
    );
  } catch (error) {
    console.error(
      `❌ Failed to delete teacher ${teacherId} from Firebase:`,
      error
    );
    throw error;
  }
}

/**
 * Sync all active teachers from Supabase to Firebase
 */
async function syncAllTeachers(): Promise<void> {
  try {
    const { data: teachers, error } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("role", "teacher");

    if (error) throw error;

    if (!teachers || teachers.length === 0) {
      console.log("No teachers found to sync");
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const teacher of teachers) {
      try {
        await syncTeacherToFirebase(teacher);
        successCount++;
      } catch {
        failureCount++;
      }
    }

    console.log(
      `Sync complete: ${successCount} successful, ${failureCount} failed`
    );
  } catch (error) {
    console.error("Failed to sync all teachers:", error);
    throw error;
  }
}

/**
 * Handle individual teacher sync event
 */
async function handleTeacherSync(syncEvent: SyncEvent): Promise<void> {
  try {
    if (syncEvent.event === "teacher_inserted") {
      // Fetch full teacher data from Supabase
      const { data: teacher, error } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .eq("id", syncEvent.teacher_id)
        .eq("role", "teacher")
        .single();

      if (error) throw error;
      if (!teacher) throw new Error("Teacher not found in Supabase");

      await syncTeacherToFirebase(teacher);
    } else if (syncEvent.event === "teacher_deleted") {
      await deleteTeacherFromFirebase(syncEvent.teacher_id);
    } else if (syncEvent.event === "manual_sync") {
      await syncAllTeachers();
    }
  } catch (error) {
    console.error(`Error handling sync event:`, error);
    throw error;
  }
}

/**
 * Main Edge Function handler
 */
Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    const { event, teacher_id, teacher_name, teacher_email, role } = await req.json() as Partial<SyncEvent>;

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Missing event field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const syncEvent: SyncEvent = {
      event: event as SyncEvent["event"],
      teacher_id: teacher_id || "",
      timestamp: new Date().toISOString(),
      teacher_name,
      teacher_email,
      role,
    };

    await handleTeacherSync(syncEvent);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced event: ${event}`,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge Function error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
