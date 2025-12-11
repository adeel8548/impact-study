import { createAdminClient } from "@/lib/supabase/server";

type SalaryStatus = "paid" | "unpaid";

interface UpsertTeacherSalaryOptions {
  teacherId: string;
  amount: number;
  status?: SalaryStatus;
  month?: number;
  year?: number;
  toggle?: boolean;
}

const now = () => new Date();

export async function upsertTeacherSalary({
  teacherId,
  amount,
  status,
  month,
  year,
  toggle = false,
}: UpsertTeacherSalaryOptions) {
  const adminClient = await createAdminClient();
  const targetMonthNum = month ?? now().getMonth() + 1;
  const targetYear = year ?? now().getFullYear();

  console.log("[upsertTeacherSalary] Input:", {
    teacherId,
    targetMonthNum,
    targetYear,
    toggle,
  });

  // Find existing salary row for this teacher and month
  const { data: possibleRows, error: fetchError } = await adminClient
    .from("teacher_salary")
    .select("id, month, year, status")
    .eq("teacher_id", teacherId)
    .eq("month", targetMonthNum)
    .eq("year", targetYear);

  if (fetchError) {
    return { error: fetchError.message };
  }

  console.log("[upsertTeacherSalary] Found rows:", possibleRows);

  const existing = possibleRows && possibleRows.length > 0 ? possibleRows[0] : undefined;

  console.log("[upsertTeacherSalary] Existing record:", existing);

  let nextStatus: SalaryStatus = status ?? existing?.status ?? "unpaid";
  if (toggle && existing) {
    nextStatus = existing.status === "paid" ? "unpaid" : "paid";
  }

  console.log("[upsertTeacherSalary] Next status:", nextStatus);

  let error;

  if (existing && existing.id) {
    // Update existing record
    console.log("[upsertTeacherSalary] Updating existing record:", {
      id: existing.id,
      newStatus: nextStatus,
    });

    const updateResult = await adminClient
      .from("teacher_salary")
      .update({
        amount,
        status: nextStatus,
        paid_date: nextStatus === "paid" ? now().toISOString() : null,
      })
      .eq("id", existing.id);

    error = updateResult.error;
    if (!error) {
      console.log("[upsertTeacherSalary] Update successful");
    }
  } else {
    // Insert new record
    console.log("[upsertTeacherSalary] Creating new record:", {
      month: targetMonthNum,
      status: nextStatus,
    });

    const insertResult = await adminClient.from("teacher_salary").insert({
      teacher_id: teacherId,
      amount,
      status: nextStatus,
      paid_date: nextStatus === "paid" ? now().toISOString() : null,
      month: targetMonthNum,
      year: targetYear,
    });

    error = insertResult.error;
    if (!error) {
      console.log("[upsertTeacherSalary] Insert successful");
    }
  }

  if (error) {
    console.error(
      `[upsertTeacherSalary] Error for teacher ${teacherId}:`,
      error.message,
    );
    return { error: error.message };
  }

  return { error: null, status: nextStatus };
}

export async function resetTeacherSalariesToUnpaid(
  month = now().getMonth() + 1,
  year = now().getFullYear(),
) {
  const adminClient = await createAdminClient();

  // Find rows that match this month/year
  const { data: rows, error: fetchErr } = await adminClient
    .from("teacher_salary")
    .select("id, status")
    .eq("month", month)
    .eq("year", year)
    .eq("status", "paid");

  if (fetchErr) {
    return { error: fetchErr.message };
  }

  const idsToReset: string[] = [];
  if (rows && rows.length > 0) {
    for (const r of rows) {
      if (!r) continue;
      idsToReset.push(r.id);
    }
  }

  if (idsToReset.length === 0) {
    return { error: null };
  }

  const { error } = await adminClient
    .from("teacher_salary")
    .update({
      status: "unpaid",
      reset_at: now().toISOString(),
      paid_date: null,
    })
    .in("id", idsToReset);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
