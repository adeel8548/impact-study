import { NextResponse } from "next/server";
import { resetTeacherSalariesToUnpaid } from "@/lib/server/teacher-salary";

export async function POST() {
  const { error } = await resetTeacherSalariesToUnpaid();

  if (error) {
    console.error("[cron] Failed to reset teacher salaries:", error);
    return NextResponse.json(
      { success: false, error },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

