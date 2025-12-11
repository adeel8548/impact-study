import { createAdminClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Cron Job: Auto-create monthly fees and salaries
 * Runs on the first day of every month
 * Creates student_fees and teacher_salary entries if not already present
 * 
 * Call this endpoint: /api/cron/monthly-billing
 * Set up via Vercel Cron Job:
 * - Cron expression: "0 0 1 * *" (Every 1st of the month at 00:00)
 * - Add Authorization header with secret token for security
 */

export async function POST(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "your-secret-key";

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized", success: false },
      { status: 401 }
    );
  }

  const adminClient = await createAdminClient();

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    console.log(
      `[Cron] Starting monthly billing process for ${currentMonth}/${currentYear}`
    );

    // Get all students
    const { data: students, error: studentError } = await adminClient
      .from("students")
      .select("id, school_id")
      .order("id");

    if (studentError) throw studentError;

    if (!students || students.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No students found",
        studentsProcessed: 0,
        teachersProcessed: 0,
      });
    }

    // Create student fees for current month if not exists
    const studentFeesToInsert = students.map((student: any) => ({
      student_id: student.id,
      month: currentMonth,
      year: currentYear,
      amount: 0, // Default amount, should be set per student
      status: "unpaid",
      school_id: student.school_id,
      paid_date: null,
    }));

    // Insert only if not already exists
    const { error: upsertStudentError, data: upsertedStudents } =
      await adminClient
        .from("student_fees")
        .upsert(studentFeesToInsert, {
          onConflict: "student_id,month,year",
          ignoreDuplicates: true,
        })
        .select();

    if (upsertStudentError) {
      console.error("[Cron] Student fees upsert error:", upsertStudentError);
      throw upsertStudentError;
    }

    // Get all teachers
    const { data: teachers, error: teacherError } = await adminClient
      .from("profiles")
      .select("id, school_id")
      .eq("role", "teacher")
      .order("id");

    if (teacherError) throw teacherError;

    let teachersProcessed = 0;

    if (teachers && teachers.length > 0) {
      // Create teacher salaries for current month if not exists
      const teacherSalariesToInsert = teachers.map((teacher: any) => ({
        teacher_id: teacher.id,
        month: currentMonth,
        year: currentYear,
        amount: 0, // Default amount, should be set per teacher
        status: "unpaid",
        school_id: teacher.school_id,
        paid_date: null,
      }));

      const { error: upsertTeacherError, data: upsertedTeachers } =
        await adminClient
          .from("teacher_salary")
          .upsert(teacherSalariesToInsert, {
            onConflict: "teacher_id,month,year",
            ignoreDuplicates: true,
          })
          .select();

      if (upsertTeacherError) {
        console.error(
          "[Cron] Teacher salary upsert error:",
          upsertTeacherError
        );
        throw upsertTeacherError;
      }

      teachersProcessed = teachers.length;
    }

    console.log(
      `[Cron] Completed: ${students.length} students, ${teachersProcessed} teachers`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully created monthly fees and salaries for ${currentMonth}/${currentYear}`,
      studentsProcessed: students.length,
      teachersProcessed: teachersProcessed,
      month: currentMonth,
      year: currentYear,
    });
  } catch (error) {
    console.error("[Cron] Monthly billing error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process billing",
        success: false,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to manually trigger the cron job
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const secret = request.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET || "your-secret-key";

  if (secret !== cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized", success: false },
      { status: 401 }
    );
  }

  return POST(request);
}
