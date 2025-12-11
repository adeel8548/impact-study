import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET: Fetch teacher salaries
 * Query params:
 *   - teacherId: Get salaries for specific teacher
 *   - month: Filter by month (1-12)
 *   - year: Filter by year
 *   - allMonths: true to get all months (default: false for current month only)
 *   - status: Filter by status (paid/unpaid)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  try {
    const searchParams = new URL(request.url).searchParams;
    const teacherId = searchParams.get("teacherId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const allMonths = searchParams.get("allMonths") === "true";
    const status = searchParams.get("status");

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let query = supabase
      .from("teacher_salary")
      .select("*");

    // Filter by teacher if provided
    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }

    // Filter by specific month/year if provided
    if (month) {
      query = query.eq("month", parseInt(month));
    }
    if (year) {
      query = query.eq("year", parseInt(year));
    }

    // Filter by status if provided
    if (status) {
      query = query.eq("status", status);
    }

    // If neither month nor year provided and not allMonths, default to current month
    if (!month && !year && !allMonths) {
      query = query
        .eq("month", currentMonth)
        .eq("year", currentYear);
    }

    const { data, error } = await query.order("month", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ salaries: data || [], success: true });
  } catch (error) {
    console.error("Error fetching salaries:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch salaries",
        success: false,
      },
      { status: 500 },
    );
  }
}

/**
 * PUT: Update salary status and payment
 * Body:
 *   - id: Salary record ID
 *   - status: 'paid' or 'unpaid'
 *   - paid_date: Optional ISO timestamp for payment date
 *   - amount: Optional amount update
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  try {
    const { id, amount, status, paid_date } = await request.json();
    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 },
      );
    }

    const updateData: any = {};
    
    // Amount update does NOT change status
    if (typeof amount !== "undefined") updateData.amount = amount;

    // Only update status if explicitly provided
    if (typeof status !== "undefined") {
      updateData.status = status;
      if (status === "paid") {
        updateData.paid_date = paid_date ?? new Date().toISOString();
      } else if (status === "unpaid") {
        updateData.paid_date = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "Nothing to update" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("teacher_salary")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json({ salary: data?.[0], success: true });
  } catch (error) {
    console.error("Error updating salary:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update salary",
        success: false,
      },
      { status: 500 },
    );
  }
}

/**
 * POST: Create or upsert teacher salary
 * Body:
 *   - teacher_id: Teacher UUID
 *   - month: Month number (1-12)
 *   - year: Year number
 *   - amount: Salary amount
 *   - school_id: School UUID
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { teacher_id, month, year, amount, school_id } = await request.json();

    if (!teacher_id || !month || !year || !school_id) {
      return NextResponse.json(
        { error: "Missing required fields", success: false },
        { status: 400 }
      );
    }

    // Check if salary already exists
    const { data: existing, error: checkError } = await supabase
      .from("teacher_salary")
      .select("id")
      .eq("teacher_id", teacher_id)
      .eq("month", month)
      .eq("year", year)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    // If exists, just return it
    if (existing) {
      return NextResponse.json({
        salary: existing,
        success: true,
        created: false,
      });
    }

    // Create new salary entry
    const { data, error } = await supabase
      .from("teacher_salary")
      .insert({
        teacher_id,
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
      salary: data?.[0],
      success: true,
      created: true,
    });
  } catch (error) {
    console.error("Error creating salary:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create salary",
        success: false,
      },
      { status: 500 },
    );
  }
}
