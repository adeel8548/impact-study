import { NextRequest, NextResponse } from "next/server";
import { upsertTeacherSalary } from "@/lib/server/teacher-salary";

export async function POST(request: NextRequest) {
  const { teacherId, amount } = await request.json();

  if (!teacherId) {
    return NextResponse.json(
      { success: false, error: "teacherId is required" },
      { status: 400 },
    );
  }

  const result = await upsertTeacherSalary({
    teacherId,
    amount: Number(amount) || 0,
    toggle: true,
  });

  if (result.error) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, status: result.status });
}

