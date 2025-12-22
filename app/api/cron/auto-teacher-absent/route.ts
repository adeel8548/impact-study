import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cron Job: Auto mark teacher absent at 7 PM PKT
 * Runs daily at 7 PM Pakistan time (UTC+5)
 * Finds all teachers with no attendance record for today and marks them absent
 * This ensures teachers who don't mark attendance are automatically marked absent
 *
 * Schedule (Vercel, UTC): "0 14 * * *" → 19:00 PKT (7:00 PM)
 */
export async function GET(request: NextRequest) {
  try {
    // Log for debugging
    console.log("[Auto Teacher Absent] Cron job started");

    // Optional: Verify secret if provided
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;
    
    if (secret && secret !== cronSecret) {
      console.log("[Auto Teacher Absent] Invalid secret provided");
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    const adminClient = await createAdminClient();
    
    // Get today's date in YYYY-MM-DD format
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    
    console.log(`[Auto Teacher Absent] Running for date: ${today}`);

    // Get all teachers from profiles table (role = teacher)
    const { data: teachers, error: teachersError } = await adminClient
      .from("profiles")
      .select("id, name")
      .eq("role", "teacher");

    if (teachersError) {
      console.error("[Auto Teacher Absent] Error fetching teachers:", teachersError);
      throw teachersError;
    }

    if (!teachers || teachers.length === 0) {
      console.log("[Auto Teacher Absent] No active teachers found");
      return NextResponse.json({
        success: true,
        message: "No active teachers",
        marked: 0,
        date: today,
      });
    }

    console.log(`[Auto Teacher Absent] Found ${teachers.length} active teachers`);

    // Get all teachers who already have attendance marked for today
    const { data: existingAttendance, error: fetchError } = await adminClient
      .from("teacher_attendance")
      .select("teacher_id")
      .eq("date", today);

    if (fetchError) {
      console.error("[Auto Teacher Absent] Error fetching existing attendance:", fetchError);
      throw fetchError;
    }

    const markedTeacherIds = new Set(
      (existingAttendance || []).map((a) => a.teacher_id)
    );

    // Find teachers with no attendance marked for today
    const teachersWithoutAttendance = teachers.filter(
      (t) => !markedTeacherIds.has(t.id)
    );

    if (teachersWithoutAttendance.length === 0) {
      console.log("[Auto Teacher Absent] All teachers have attendance marked");
      return NextResponse.json({
        success: true,
        message: "All teachers have attendance marked",
        marked: 0,
        date: today,
      });
    }

    console.log(
      `[Auto Teacher Absent] Found ${teachersWithoutAttendance.length} teachers without attendance marked`
    );

    // Mark these teachers as absent (schema-aligned: no in_time/out_time/approval_status)
    const absenceRecords = teachersWithoutAttendance.map((teacher) => ({
      teacher_id: teacher.id,
      date: today,
      status: "absent",
      remarks: "auto_marked",
    }));

    const { data: insertedRecords, error: insertError } = await adminClient
      .from("teacher_attendance")
      .insert(absenceRecords)
      .select();

    if (insertError) {
      console.error("[Auto Teacher Absent] Insert error:", insertError);
      throw insertError;
    }

    console.log(
      `[Auto Teacher Absent] Successfully marked ${insertedRecords?.length || 0} teachers as absent`
    );

    return NextResponse.json({
      success: true,
      message: `Auto-marked ${teachersWithoutAttendance.length} teachers as absent`,
      marked: teachersWithoutAttendance.length,
      teachers: teachersWithoutAttendance.map((t) => ({ id: t.id, name: t.name })),
      date: today,
    });

  } catch (error) {
    console.error("[Auto Teacher Absent] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to auto-mark absent",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
