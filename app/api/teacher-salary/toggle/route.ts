import { NextRequest, NextResponse } from "next/server";
import { upsertTeacherSalary } from "@/lib/server/teacher-salary";

export async function POST(request: NextRequest) {
  const { teacherId, amount, month, year } = await request.json();

  if (!teacherId) {
    return NextResponse.json(
      { success: false, error: "teacherId is required" },
      { status: 400 },
    );
  }

  let targetMonth = new Date().getMonth() + 1;
  let targetYear = new Date().getFullYear();

  // Handle month parameter - could be numeric or "YYYY-MM" format
  if (month !== undefined) {
    const monthStr = String(month);
    if (monthStr.includes("-")) {
      // "YYYY-MM" format
      const parts = monthStr.split("-");
      targetYear = Number(parts[0]);
      targetMonth = Number(parts[1]);
    } else {
      targetMonth = Number(monthStr);
    }
  }

  // Handle year parameter
  if (year !== undefined) {
    targetYear = Number(year);
  }

  console.log("[teacher-salary/toggle] Request:", {
    teacherId,
    amount,
    targetMonth,
    targetYear,
  });

  const result = await upsertTeacherSalary({
    teacherId,
    amount: Number(amount) || 0,
    toggle: true,
    month: targetMonth,
    year: targetYear,
  });

  if (result.error) {
    console.error("[teacher-salary/toggle] Error:", result.error);
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 },
    );
  }

  console.log("[teacher-salary/toggle] Success:", {
    teacherId,
    status: result.status,
  });

  return NextResponse.json({ success: true, status: result.status });
}
