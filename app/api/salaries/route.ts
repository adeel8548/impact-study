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

    let query = supabase.from("teacher_salary").select("*");

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
      query = query.eq("month", currentMonth).eq("year", currentYear);
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
 *   - id: Salary record ID (preferred)
 *   - status: 'paid' or 'unpaid'
 *   - paid_date: Optional ISO timestamp for payment date
 *   - amount: Optional amount update
 *   - teacher_id, month, year, school_id: optional fallback fields to upsert if id not found
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  try {
    const { id, amount, status, paid_date, teacher_id, month, year, school_id } =
      await request.json();

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
      .select()
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;

    if (data) {
      return NextResponse.json({ salary: data, success: true });
    }

    // No row matched this id. Attempt fallback upsert if details provided.
    if (!teacher_id || !month || !year) {
      return NextResponse.json(
        {
          error: "Salary record not found for this id",
          success: false,
          hint: "Provide teacher_id, month, and year to create missing salary row",
        },
        { status: 404 },
      );
    }

    // See if a row exists for teacher/month/year; if so, update it instead.
    const { data: existingRow, error: existingErr } = await supabase
      .from("teacher_salary")
      .select("id, school_id")
      .eq("teacher_id", teacher_id)
      .eq("month", Number(month))
      .eq("year", Number(year))
      .maybeSingle();

    if (existingErr && existingErr.code !== "PGRST116") throw existingErr;

    const targetId = existingRow?.id ?? id;
    let targetSchoolId = existingRow?.school_id ?? school_id;

    if (!targetSchoolId) {
      // Try to derive school_id from teacher profile first
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", teacher_id)
        .maybeSingle();
      if (profileErr) throw profileErr;
      targetSchoolId = profile?.school_id ?? targetSchoolId;
    }

    if (!targetSchoolId) {
      // Fallback: use the acting admin's school_id (current auth user)
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (user?.id) {
        const { data: adminProfile, error: adminErr } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("id", user.id)
          .maybeSingle();
        if (adminErr) throw adminErr;
        targetSchoolId = adminProfile?.school_id ?? targetSchoolId;
      }
    }

    // If still missing, allow null; RLS admin policy permits admin users regardless of school_id.
    updateData.school_id = targetSchoolId ?? null;

    // If an existing row was found by teacher/month/year, update it; else insert.
    if (existingRow?.id) {
        const { data: updated, error: updErr } = await supabase
          .from("teacher_salary")
          .update(updateData)
          .eq("id", existingRow.id)
          .select()
          .maybeSingle();

        if (updErr && updErr.code !== "PGRST116") throw updErr;
        if (updated) {
          return NextResponse.json({ salary: updated, success: true, created: false });
        }
        // If no row returned even though id existed, continue to insert path to self-heal.
    }

    const insertPayload = {
      id: targetId, // keep client id if provided
      teacher_id,
      month: Number(month),
      year: Number(year),
      amount: typeof amount !== "undefined" ? amount : 0,
      status: updateData.status ?? "paid",
      paid_date: updateData.paid_date ?? paid_date ?? new Date().toISOString(),
      school_id: updateData.school_id ?? null,
    } as any;

    const { data: inserted, error: insErr } = await supabase
      .from("teacher_salary")
      .insert(insertPayload)
      .select()
      .single();

    if (insErr) throw insErr;

    return NextResponse.json({ salary: inserted, success: true, created: true });
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
        { status: 400 },
      );
    }

    // Check if salary already exists
    const { data: existing, error: checkError } = await supabase
      .from("teacher_salary")
      .select("id")
      .eq("teacher_id", teacher_id)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();

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
