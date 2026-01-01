import { createAdminClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { resetTeacherSalariesToUnpaid } from "@/lib/server/teacher-salary";
import { checkFeeExpiration } from "@/lib/actions/fees";

/**
 * Combined Cron Job: Monthly billing + Reset fees/salaries
 * Runs on the first day of every month
 * 1. Creates student_fees and teacher_salary entries if not already present
 * 2. Resets teacher salaries to unpaid
 * 3. Checks and resets student fee expiration
 *
 * Call this endpoint: /api/cron/monthly-billing
 * Set up via Vercel Cron Job:
 * - Cron expression: "0 0 1 * *" (Every 1st of the month at 00:00)
 * - Add Authorization header with secret token for security
 */

export async function POST(request: NextRequest) {
  // Verify cron secret for security
  // For Vercel free plan: allow without auth header, but block if secret is provided but wrong
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET || "your-secret-key";

  // Only block if secret is explicitly provided but wrong
  if (secret && secret !== cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized", success: false },
      { status: 401 },
    );
  }
  
  // Allow if no secret provided (Vercel free plan) OR if authHeader matches
  if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized", success: false },
      { status: 401 },
    );
  }

  const adminClient = await createAdminClient();

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    console.log(
      `[Cron] Starting monthly billing process for ${currentMonth}/${currentYear}`,
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
    // First, get all students' fees from previous month to preserve amounts
    const { data: previousMonthFees } = await adminClient
      .from("student_fees")
      .select("student_id, amount")
      .eq("month", currentMonth === 1 ? 12 : currentMonth - 1)
      .eq("year", currentMonth === 1 ? currentYear - 1 : currentYear);

    const feeMap = new Map(
      (previousMonthFees || []).map((fee: any) => [fee.student_id, fee.amount])
    );

    const studentFeesToInsert = students.map((student: any) => ({
      student_id: student.id,
      month: currentMonth,
      year: currentYear,
      amount: feeMap.get(student.id) || 0, // Use previous month's amount or 0
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

    // STEP 2: Auto-create fee vouchers for all students
    console.log("[Cron] Creating fee vouchers for all students...");
    const vouchersToInsert = [];
    const issueDate = now.toISOString().split("T")[0];
    const dueDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-12`;
    
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[currentMonth - 1];

    // Get the latest serial number
    const { data: lastVoucher } = await adminClient
      .from("fee_vouchers")
      .select("serial_number")
      .order("serial_number", { ascending: false })
      .limit(1)
      .single();

    let nextSerialNumber = (lastVoucher?.serial_number || 0) + 1;

    for (const student of students) {
      // Get student fees for current month (which now has preserved amount from previous month)
      const { data: studentFees } = await adminClient
        .from("student_fees")
        .select("amount")
        .eq("student_id", student.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .single();

      // Get arrears (unpaid previous months)
      const { data: arrearsFees } = await adminClient
        .from("student_fees")
        .select("amount")
        .eq("student_id", student.id)
        .eq("status", "unpaid")
        .lt("year", currentYear)
        .or(`and(year.eq.${currentYear},month.lt.${currentMonth})`);

      // Use preserved amount from previous month (set via feeMap earlier)
      const monthlyFee = feeMap.get(student.id) || studentFees?.amount || 0;
      const arrears = (arrearsFees || []).reduce((sum, fee) => sum + fee.amount, 0);
      const totalAmount = monthlyFee + arrears;

      vouchersToInsert.push({
        serial_number: nextSerialNumber++,
        student_id: student.id,
        issue_date: issueDate,
        due_date: dueDate,
        monthly_fee: monthlyFee,
        arrears: arrears,
        fines: 0,
        annual_charges: 0,
        exam_fee: 0,
        other_charges: 0,
        total_amount: totalAmount,
        month: monthName,
      });
    }

    if (vouchersToInsert.length > 0) {
      const { error: voucherError } = await adminClient
        .from("fee_vouchers")
        .insert(vouchersToInsert);

      if (voucherError) {
        console.error("[Cron] Fee vouchers creation error:", voucherError);
        // Don't throw - continue with other operations even if vouchers fail
      } else {
        console.log(`[Cron] Created ${vouchersToInsert.length} fee vouchers`);
      }
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
      // First, get all teachers' salaries from previous month to preserve amounts
      const { data: previousTeacherSalaries } = await adminClient
        .from("teacher_salary")
        .select("teacher_id, amount")
        .eq("month", currentMonth === 1 ? 12 : currentMonth - 1)
        .eq("year", currentMonth === 1 ? currentYear - 1 : currentYear);

      const teacherSalaryMap = new Map(
        (previousTeacherSalaries || []).map((salary: any) => [salary.teacher_id, salary.amount])
      );

      const teacherSalariesToInsert = teachers.map((teacher: any) => ({
        teacher_id: teacher.id,
        month: currentMonth,
        year: currentYear,
        amount: teacherSalaryMap.get(teacher.id) || 0, // Use previous month's amount or 0
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
          upsertTeacherError,
        );
        throw upsertTeacherError;
      }

      teachersProcessed = teachers.length;
    }

    // STEP 3: Reset teacher salaries to unpaid
    console.log("[Cron] Resetting teacher salaries to unpaid...");
    const { error: resetSalaryError } = await resetTeacherSalariesToUnpaid();

    if (resetSalaryError) {
      console.error("[Cron] Reset teacher salaries error:", resetSalaryError);
    }

    // STEP 4: Check and reset student fee expiration
    console.log("[Cron] Checking student fee expiration...");
    const { error: feeExpirationError } = await checkFeeExpiration();

    if (feeExpirationError) {
      console.error("[Cron] Fee expiration check error:", feeExpirationError);
    }

    console.log(
      `[Cron] Completed: ${students.length} students, ${teachersProcessed} teachers`,
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
        error:
          error instanceof Error ? error.message : "Failed to process billing",
        success: false,
      },
      { status: 500 },
    );
  }
}

// GET endpoint to manually trigger the cron job
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  // For Vercel free plan: allow without secret, but block if secret is provided but wrong
  const secret = request.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET || "your-secret-key";

  // Only block if secret is explicitly provided but wrong
  if (secret && secret !== cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized", success: false },
      { status: 401 },
    );
  }

  return POST(request);
}
