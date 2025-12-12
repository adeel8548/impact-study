import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET: Fetch student fees for a specific month and year
 * Query params:
 *   - studentId: Student UUID (required)
 *   - month: Month number 1-12 (required)
 *   - year: Year number (required)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    const searchParams = new URL(request.url).searchParams;
    const studentId = searchParams.get("studentId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!studentId || !month || !year) {
      return NextResponse.json(
        { error: "studentId, month, and year are required", success: false },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("student_fees")
      .select("*")
      .eq("student_id", studentId)
      .eq("month", parseInt(month))
      .eq("year", parseInt(year))
      .single();

    // Handle case where fee doesn't exist yet (not an error)
    if (error && error.code === "PGRST116") {
      return NextResponse.json({
        fee: null,
        success: true,
        exists: false,
      });
    }

    if (error) throw error;

    return NextResponse.json({
      fee: data,
      success: true,
      exists: true,
    });
  } catch (error) {
    console.error("Error fetching monthly fee:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch fee",
        success: false,
      },
      { status: 500 },
    );
  }
}
