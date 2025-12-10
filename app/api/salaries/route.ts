import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  try {
    const searchParams = new URL(request.url).searchParams;
    const teacherId = searchParams.get("teacherId");
    const allMonths = searchParams.get("allMonths") === "true";

    // Return salaries for current month by default. Support both new month key (YYYY-MM)
    // and legacy numeric month + year columns.
    const now = new Date();
    const currentMonthNum = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(
      2,
      "0",
    )}`;

    let query = supabase
      .from("teacher_salary")
      .select("*")
      .order("created_at", { ascending: false, nullsLast: true });

    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    } else {
      query = query.in("month", [currentMonthKey, String(currentMonthNum)]);
    }

    const { data, error } = await query;

    if (error) throw error;

    let salaries = data || [];

    // For default calls (no teacherId) or when allMonths is false, filter to the current month
    if (!teacherId || !allMonths) {
      salaries = salaries.filter((r: any) => {
        if (!r) return false;
        if (String(r.month) === currentMonthKey) return true;
        if (
          Number(r.month) === currentMonthNum &&
          Number(r.year) === currentYear
        )
          return true;
        return false;
      });
    }

    return NextResponse.json({ salaries: salaries || [], success: true });
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
