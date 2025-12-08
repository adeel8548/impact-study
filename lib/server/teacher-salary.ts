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

const monthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

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
  const targetMonthKey = monthKey(targetYear, targetMonthNum);

  // Try to find existing salary row for this teacher and month.
  // Support both new format (month = "YYYY-MM") and older format (numeric month + year)
  const { data: possibleRows, error: fetchError } = await adminClient
    .from("teacher_salary")
    .select("id, month, year, status")
    .eq("teacher_id", teacherId)
    .in("month", [targetMonthKey, String(targetMonthNum)]);

  if (fetchError) {
    return { error: fetchError.message };
  }

  let existing = undefined as any | undefined;
  if (possibleRows && possibleRows.length > 0) {
    existing = possibleRows.find((r: any) => {
      if (!r) return false;
      if (String(r.month) === targetMonthKey) return true;
      if (Number(r.month) === targetMonthNum && Number(r.year) === targetYear)
        return true;
      return false;
    });
  }

  let nextStatus: SalaryStatus = status ?? existing?.status ?? "unpaid";
  if (toggle && existing) {
    nextStatus = existing.status === "paid" ? "unpaid" : "paid";
  }

  let error;

  if (existing && existing.id) {
    // Update existing record (only change amount/status)
    const updateResult = await adminClient
      .from("teacher_salary")
      .update({
        amount,
        status: nextStatus,
        paid_date: nextStatus === "paid" ? now().toISOString() : null,
      })
      .eq("id", existing.id);

    error = updateResult.error;
  } else {
    // Insert new record using month key (YYYY-MM)
    const insertResult = await adminClient.from("teacher_salary").insert({
      teacher_id: teacherId,
      amount,
      status: nextStatus,
      paid_date: nextStatus === "paid" ? now().toISOString() : null,
      month: targetMonthKey,
      year: targetYear,
    });

    error = insertResult.error;
  }

  if (error) {
    return { error: error.message };
  }

  return { error: null, status: nextStatus };
}

export async function resetTeacherSalariesToUnpaid(
  month = now().getMonth() + 1,
  year = now().getFullYear(),
) {
  const adminClient = await createAdminClient();
  const targetMonthKey = monthKey(year, month);

  // Find rows that match new month key or legacy numeric month+year
  const { data: rows, error: fetchErr } = await adminClient
    .from("teacher_salary")
    .select("id, month, year, status")
    .in("month", [targetMonthKey, String(month)])
    .eq("status", "paid");

  if (fetchErr) {
    return { error: fetchErr.message };
  }

  const idsToReset: string[] = [];
  if (rows && rows.length > 0) {
    for (const r of rows) {
      if (!r) continue;
      if (String(r.month) === targetMonthKey) {
        idsToReset.push(r.id);
      } else if (
        Number(r.month) === month &&
        Number(r.year) === year
      ) {
        idsToReset.push(r.id);
      }
    }
  }

  if (idsToReset.length === 0) {
    return { error: null };
  }

  const { error } = await adminClient
    .from("teacher_salary")
    .update({ status: "unpaid", reset_at: now().toISOString(), paid_date: null })
    .in("id", idsToReset);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

