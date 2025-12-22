import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cron Job: Auto-mark teacher ABSENT at 7 PM PKT
 * Runs daily at 7 PM Pakistan time (UTC+5)
 * - Sets updated_at to 7 PM for teachers marked present/late (acts as out time)
 * - Finds all teachers with NO attendance record for today and marks them ABSENT
 *
 * Note: The current teacher_attendance schema does not include in_time/out_time,
 * so auto "out" marking is intentionally disabled to avoid schema mismatches.
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
    
    console.log(`[Auto Teacher Out] Running for date: ${today}`);

    // Compute 7:00 PM PKT (14:00 UTC) for today
    const outTime = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        14,
        0,
        0,
      ),
    ).toISOString();
    console.log(`[Auto Teacher Out] Target out timestamp (updated_at): ${outTime}`);

    // PART 1: Auto-mark OUT by setting updated_at to 7 PM for present/late
    const { data: presentLate, error: plErr } = await adminClient
      .from("teacher_attendance")
      .select("id")
      .eq("date", today)
      .in("status", ["present", "late"]);

    if (plErr) {
      console.error("[Auto Teacher Out] Error fetching present/late records:", plErr);
      throw plErr;
    }

    let outTimeUpdated = 0;
    if (presentLate && presentLate.length > 0) {
      const ids = presentLate.map((r: any) => r.id);
      const { error: updErr } = await adminClient
        .from("teacher_attendance")
        .update({ updated_at: outTime })
        .in("id", ids);

      if (updErr) {
        console.error("[Auto Teacher Out] Error updating updated_at:", updErr);
        throw updErr;
      }
      outTimeUpdated = ids.length;
      console.log(`[Auto Teacher Out] Auto-out updated for ${outTimeUpdated} records`);
    } else {
      console.log("[Auto Teacher Out] No present/late records found for today");
    }

    // ========================================
    // PART 2: Auto-mark absent for teachers with NO attendance record
    // ========================================
    console.log("[Auto Teacher Out] Starting auto-absent check...");

    // Get all teachers from profiles table (role = teacher)
    const { data: teachers, error: teachersError } = await adminClient
      .from("profiles")
      .select("id, name")
      .eq("role", "teacher");

    if (teachersError) {
      console.error("[Auto Teacher Out] Error fetching teachers:", teachersError);
      throw teachersError;
    }

    if (!teachers || teachers.length === 0) {
      console.log("[Auto Teacher Out] No active teachers found");
      return NextResponse.json({
        success: true,
        message: `No teachers to mark absent`,
        outTimeUpdated,
        absenceMarked: 0,
        date: today,
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
        message: `All teachers have attendance`,
        outTimeUpdated,
        absenceMarked: 0,
        date: today,
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
      remarks: "auto_marked",
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
      message: `Auto-out updated ${outTimeUpdated}, auto-absent ${absenceCount}`,
      outTimeUpdated,
      absenceMarked: absenceCount,
      absentTeachers: teachersWithoutAttendance.map((t) => ({ id: t.id, name: t.name })),
      date: today,
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
