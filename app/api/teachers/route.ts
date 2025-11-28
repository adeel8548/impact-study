import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const adminClient = await createAdminClient();
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(
    2,
    "0",
  )}`;

  try {
    const [teachersRes, salariesRes] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, name, email, phone, class_ids, created_at")
        .eq("role", "teacher")
        .order("created_at", { ascending: false, nullsLast: true }),
      adminClient
        .from("teacher_salary")
        .select(
          "id, teacher_id, amount, status, month, year, updated_at, created_at",
        )
        .in("month", [currentMonthKey, String(currentMonthNum)]),
    ]);

    if (teachersRes.error) throw teachersRes.error;
    if (salariesRes.error) throw salariesRes.error;

    const currentMonthSalaries = (salariesRes.data ?? []).filter((row) => {
      if (!row) return false;
      if (String(row.month) === currentMonthKey) return true;
      if (
        Number(row.month) === currentMonthNum &&
        Number(row.year) === currentYear
      ) {
        return true;
      }
      return false;
    });

    const salaryMap = new Map(
      currentMonthSalaries.map((row) => [row.teacher_id, row]),
    );

    const teachersWithSalary = (teachersRes.data ?? []).map((teacher) => ({
      ...teacher,
      salary: salaryMap.get(teacher.id) ?? null,
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
