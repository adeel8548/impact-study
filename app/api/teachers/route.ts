import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const adminClient = await createAdminClient();
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  try {
    const [teachersRes, salariesRes] = await Promise.all([
      adminClient
        .from("profiles")
        .select(
          "id, name, email, phone, class_ids, incharge_class_id, incharge_class_ids, joining_date, created_at",
        )
        .eq("role", "teacher")
        .order("created_at", { ascending: false, nullsLast: true }),
      adminClient
        .from("teacher_salary")
        .select(
          "id, teacher_id, amount, status, month, year, updated_at, created_at",
        )
        .eq("month", currentMonthNum)
        .eq("year", currentYear),
    ]);

    if (teachersRes.error) throw teachersRes.error;
    if (salariesRes.error) throw salariesRes.error;

    const currentMonthSalaries = (salariesRes.data ?? []).filter((row) => {
      if (!row) return false;
      return (
        Number(row.month) === currentMonthNum &&
        Number(row.year) === currentYear
      );
    });

    const salaryMap = new Map(
      currentMonthSalaries.map((row) => [row.teacher_id, row]),
    );

    // Build fallback salaries from the most recent record per teacher
    const teachersWithoutCurrentSalary = (teachersRes.data ?? [])
      .map((t) => t.id)
      .filter((id) => !salaryMap.has(id));

    const fallbackSalaryMap = new Map();

    if (teachersWithoutCurrentSalary.length > 0) {
      const { data: previousSalaries, error: previousError } = await adminClient
        .from("teacher_salary")
        .select(
          "teacher_id, amount, status, month, year, paid_date, created_at, updated_at",
        )
        .in("teacher_id", teachersWithoutCurrentSalary)
        .order("created_at", { ascending: false, nullsLast: true });

      if (previousError) {
        throw previousError;
      }

      (previousSalaries ?? []).forEach((row) => {
        if (!row) return;
        if (fallbackSalaryMap.has(row.teacher_id)) return;
        // Use the latest known amount but reset status/paid date for the new month
        fallbackSalaryMap.set(row.teacher_id, {
          ...row,
          status: "unpaid",
          paid_date: null,
          month: currentMonthNum,
          year: currentYear,
        });
      });
    }

    const teachersWithSalary = (teachersRes.data ?? []).map((teacher) => ({
      ...teacher,
      salary:
        salaryMap.get(teacher.id) ?? fallbackSalaryMap.get(teacher.id) ?? null,
    }));

    return NextResponse.json({ success: true, teachers: teachersWithSalary });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch teachers",
      },
      { status: 500 },
    );
  }
}
