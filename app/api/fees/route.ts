import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET: Fetch student fees
 * Query params:
 *   - studentId: Get fees for specific student
 *   - month: Filter by month (1-12)
 *   - year: Filter by year
 *   - allMonths: true to get all months (default: false for current month only)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    const searchParams = new URL(request.url).searchParams;
    const studentId = searchParams.get("studentId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const allMonths = searchParams.get("allMonths") === "true";

    let query = supabase.from("student_fees").select("*");

    // Filter by student if provided
    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    // Filter by specific month/year if provided
    if (month) {
      query = query.eq("month", parseInt(month));
    }
    if (year) {
      query = query.eq("year", parseInt(year));
    }

    // If neither month nor year provided and not allMonths, default to current month
    if (!month && !year && !allMonths) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      query = query.eq("month", currentMonth).eq("year", currentYear);
    }

    const { data, error } = await query.order("month", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ fees: data || [], success: true });
  } catch (error) {
    console.error("Error fetching fees:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch fees",
        success: false,
      },
      { status: 500 },
    );
  }
}

/**
 * PUT: Update fee status and payment
 * Body:
 *   - id: Fee record ID
 *   - status: 'paid' or 'unpaid'
 *   - paid_date: Optional ISO timestamp for payment date
 *   - amount: Optional amount update
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { id, status, paid_date, amount } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "id is required", success: false },
        { status: 400 },
      );
    }

    const updateData: any = {};

    // Update status if provided
    if (status) {
      updateData.status = status;
      if (status === "paid") {
        updateData.paid_date = paid_date || new Date().toISOString();
      } else if (status === "unpaid") {
        updateData.paid_date = null;
      }
    }

    // Update amount if provided
    if (typeof amount !== "undefined") {
      updateData.amount = amount;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update", success: false },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("student_fees")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json({ fee: data?.[0], success: true });
  } catch (error) {
    console.error("Error updating fee:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update fee",
        success: false,
      },
      { status: 500 },
    );
  }
}

/**
 * POST: Create or upsert student fees
 * Body:
 *   - student_id: Student UUID
 *   - month: Month number (1-12)
 *   - year: Year number
 *   - amount: Fee amount
 *   - school_id: School UUID
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { student_id, month, year, amount, school_id } = await request.json();

    if (!student_id || !month || !year || !school_id) {
      return NextResponse.json(
        { error: "Missing required fields", success: false },
        { status: 400 },
      );
    }

    // Check if fee already exists
    const { data: existing, error: checkError } = await supabase
      .from("student_fees")
      .select("id")
      .eq("student_id", student_id)
      .eq("month", month)
      .eq("year", year)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    // If exists, just return it
    if (existing) {
      return NextResponse.json({
        fee: existing,
        success: true,
        created: false,
      });
    }

    // Create new fee entry
    const { data, error } = await supabase
      .from("student_fees")
      .insert({
        student_id,
        month,
        year,
        amount: amount || 0,
        status: "unpaid",
        school_id,
        paid_date: null,
      })
      .select();

    if (error) throw error;

    return NextResponse.json({
      fee: data?.[0],
      success: true,
      created: true,
    });
  } catch (error) {
    console.error("Error creating fee:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create fee",
        success: false,
      },
      { status: 500 },
    );
  }
}
