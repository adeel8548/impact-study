import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cron Job: Auto mark teacher out time at 7 PM
 * Runs daily at 7 PM (19:00)
 * Finds all teachers marked present today without out_time and sets it to 7 PM
 * 
 * Schedule: "0 19 * * *" (Every day at 7 PM / 19:00 UTC)
 */
export async function GET(request: NextRequest) {
  try {
    // Security: Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "your-secret-key";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    const adminClient = await createAdminClient();
    
    // Get today's date in YYYY-MM-DD format (local)
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    
    // Set out time to 7 PM today
    const sevenPM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0);
    const outTime = sevenPM.toISOString();

    console.log(`[Auto Teacher Out] Running for date: ${today}`);
    console.log(`[Auto Teacher Out] Setting out_time to: ${outTime}`);

    // Find all teacher attendance records for today that are:
    // 1. Status = "present"
    // 2. out_time is null
    const { data: records, error: fetchError } = await adminClient
      .from("teacher_attendance")
      .select("id, teacher_id, date, status, out_time")
      .eq("date", today)
      .eq("status", "present")
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
    
    const { error: updateError, count } = await adminClient
      .from("teacher_attendance")
      .update({ out_time: outTime })
      .in("id", recordIds);

    if (updateError) {
      console.error("[Auto Teacher Out] Update error:", updateError);
      throw updateError;
    }

    console.log(`[Auto Teacher Out] Successfully updated ${count || records.length} records`);

    return NextResponse.json({
      success: true,
      message: `Auto-marked out time for ${count || records.length} teachers`,
      updated: count || records.length,
      date: today,
      outTime: outTime,
    });

  } catch (error) {
    console.error("[Auto Teacher Out] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to auto-mark out time",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
