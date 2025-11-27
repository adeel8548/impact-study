"use server";

import { createClient } from "@/lib/supabase/server";

export async function getStudentFees(studentId?: string) {
  const supabase = await createClient();

  let query = supabase.from("student_fees").select("*, student:students(name)");

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data, error } = await query;

  if (error) {
    return { fees: [], error: error.message };
  }

  return { fees: data || [], error: null };
}

export async function updateFeeStatus(
  feeId: string,
  status: "paid" | "unpaid",
  paidDate?: string,
) {
  const supabase = await createClient();

  const updateData: any = { status };
  if (status === "paid" && paidDate) {
    updateData.paid_date = paidDate;
  }

  const { error } = await supabase
    .from("student_fees")
    .update(updateData)
    .eq("id", feeId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function checkFeeExpiration() {
  const supabase = await createClient();

  // Get all paid fees that were marked as paid more than 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: expiredFees } = await supabase
    .from("student_fees")
    .select("id")
    .eq("status", "paid")
    .lt("paid_date", thirtyDaysAgo.toISOString());

  if (expiredFees && expiredFees.length > 0) {
    const ids = expiredFees.map((f) => f.id);
    await supabase
      .from("student_fees")
      .update({ status: "unpaid" })
      .in("id", ids);
  }

  return { error: null };
}

export async function getStudentFeeStatus(feeId: string) {
  const supabase = await createClient();

  const { data: fee } = await supabase
    .from("student_fees")
    .select("*")
    .eq("id", feeId)
    .single();

  if (!fee) return { fee: null, isPaidExpired: false };

  // Check if the fee was paid and is now expired (30 days passed)
  if (fee.status === "paid" && fee.paid_date) {
    const paidDate = new Date(fee.paid_date);
    const thirtyDaysLater = new Date(paidDate);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const isPaidExpired = new Date() >= thirtyDaysLater;

    if (isPaidExpired) {
      // Update status back to unpaid if expired
      await supabase
        .from("student_fees")
        .update({ status: "unpaid" })
        .eq("id", feeId);
      return { fee: { ...fee, status: "unpaid" }, isPaidExpired: true };
    }
  }

  return { fee, isPaidExpired: false };
}
