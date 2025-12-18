import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Combined Cron Job: Auto mark teacher out time + auto-absent at 7 PM PKT
 * Runs daily at 7 PM Pakistan time (UTC+5)
 * 1. Finds all teachers marked present today without out_time and sets it to 7 PM
 * 2. Finds all teachers with NO attendance record for today and marks them ABSENT
 *
 * Schedule (Vercel, UTC): "0 14 * * *" → 19:00 PKT
 */
export async function GET(request: NextRequest) {
  try {
    // Log all headers for debugging
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log("[Auto Teacher Out] Request headers:", headers);
    console.log("[Auto Teacher Out] User-Agent:", request.headers.get("user-agent"));

    // For now, allow Vercel Cron to call without auth (Vercel doesn't send expected headers on all plans)
    // TODO: Tighten security once we identify the correct header pattern
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;
    
    // Only block if secret is provided but wrong
    if (secret && secret !== cronSecret) {
      console.log("[Auto Teacher Out] Invalid secret provided");
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    const adminClient = await createAdminClient();
    
    // Get today's date in YYYY-MM-DD format
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    
    // Set out_time to exactly 19:00 PKT = 14:00 UTC for today
    const outTime = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        14, // 14:00 UTC = 19:00 PKT
        0,
        0
      )
    ).toISOString();

    console.log(`[Auto Teacher Out] Running for date: ${today}`);
    console.log(`[Auto Teacher Out] Setting out_time to: ${outTime}`);

    // Find all teacher attendance records for today that are:
    // 1. Status = "present" OR "late"
    // 2. out_time is null
    const { data: records, error: fetchError } = await adminClient
      .from("teacher_attendance")
      .select("id, teacher_id, date, status, out_time")
      .eq("date", today)
      .in("status", ["present", "late"])
      .is("out_time", null);

    if (fetchError) {
      console.error("[Auto Teacher Out] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!records || records.length === 0) {
      console.log("[Auto Teacher Out] No teachers found without out_time");
      return NextResponse.json({
        success: true,
        message: "No teachers to update",
        updated: 0,
        date: today,
      });
    }

    console.log(`[Auto Teacher Out] Found ${records.length} teachers without out_time`);

    // Update all records to set out_time to 7 PM
    const recordIds = records.map(r => r.id);
    const { error: updateError } = await adminClient
      .from("teacher_attendance")
      .update({ out_time: outTime })
      .in("id", recordIds);

    if (updateError) {
      console.error("[Auto Teacher Out] Update error:", updateError);
      throw updateError;
    }

    console.log(`[Auto Teacher Out] Successfully updated ${records.length} records`);

    // ========================================
    // PART 2: Auto-mark absent for teachers with NO attendance record
    // ========================================
    console.log("[Auto Teacher Out] Starting auto-absent check...");

    // Get all active teachers from profiles table
    const { data: teachers, error: teachersError } = await adminClient
      .from("profiles")
      .select("id, name")
      .eq("role", "teacher")
      .eq("is_active", true);

    if (teachersError) {
      console.error("[Auto Teacher Out] Error fetching teachers:", teachersError);
      throw teachersError;
    }

    if (!teachers || teachers.length === 0) {
      console.log("[Auto Teacher Out] No active teachers found");
      return NextResponse.json({
        success: true,
        message: `Auto-marked out time for ${records.length} teachers, no teachers to mark absent`,
        outTimeUpdated: records.length,
        absenceMarked: 0,
        date: today,
        outTime: outTime,
      });
    }

    // Get all teachers who already have attendance marked for today
    const { data: existingAttendance, error: attendanceError } = await adminClient
      .from("teacher_attendance")
      .select("teacher_id")
      .eq("date", today);

    if (attendanceError) {
      console.error("[Auto Teacher Out] Error fetching existing attendance:", attendanceError);
      throw attendanceError;
    }

    const markedTeacherIds = new Set(
      (existingAttendance || []).map((a) => a.teacher_id)
    );

    // Find teachers with no attendance marked for today
    const teachersWithoutAttendance = teachers.filter(
      (t) => !markedTeacherIds.has(t.id)
    );

    if (teachersWithoutAttendance.length === 0) {
      console.log("[Auto Teacher Out] All teachers have attendance marked");
      return NextResponse.json({
        success: true,
        message: `Auto-marked out time for ${records.length} teachers, all others have attendance`,
        outTimeUpdated: records.length,
        absenceMarked: 0,
        date: today,
        outTime: outTime,
      });
    }

    console.log(
      `[Auto Teacher Out] Found ${teachersWithoutAttendance.length} teachers without any attendance marked`
    );

    // Mark these teachers as absent
    const absenceRecords = teachersWithoutAttendance.map((teacher) => ({
      teacher_id: teacher.id,
      date: today,
      status: "absent",
      in_time: null,
      out_time: null,
      approval_status: "auto_marked", // Track that this was auto-marked
    }));

    const { data: insertedRecords, error: insertError } = await adminClient
      .from("teacher_attendance")
      .insert(absenceRecords)
      .select();

    if (insertError) {
      console.error("[Auto Teacher Out] Insert error:", insertError);
      throw insertError;
    }

    const absenceCount = insertedRecords?.length || 0;
    console.log(
      `[Auto Teacher Out] Successfully marked ${absenceCount} teachers as absent`
    );

    return NextResponse.json({
      success: true,
      message: `Auto-marked out time for ${records.length} teachers and ${absenceCount} as absent`,
      outTimeUpdated: records.length,
      absenceMarked: absenceCount,
      absentTeachers: teachersWithoutAttendance.map((t) => ({ id: t.id, name: t.name })),
      date: today,
      outTime: outTime,
    });

  } catch (error) {
    console.error("[Auto Teacher Out] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process auto-attendance",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
