import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET: Fetch teacher salary for a specific month and year
 * Query params:
 *   - teacherId: Teacher UUID (required)
 *   - month: Month number 1-12 (required)
 *   - year: Year number (required)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    const searchParams = new URL(request.url).searchParams;
    const teacherId = searchParams.get("teacherId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!teacherId || !month || !year) {
      return NextResponse.json(
        { error: "teacherId, month, and year are required", success: false },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("teacher_salary")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("month", parseInt(month))
      .eq("year", parseInt(year))
      .single();

    // Handle case where salary doesn't exist yet (not an error)
    if (error && error.code === "PGRST116") {
      return NextResponse.json({
        salary: null,
        success: true,
        exists: false,
      });
    }

    if (error) throw error;

    return NextResponse.json({
      salary: data,
      success: true,
      exists: true,
    });
  } catch (error) {
    console.error("Error fetching monthly salary:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch salary",
        success: false,
      },
      { status: 500 },
    );
  }
}
