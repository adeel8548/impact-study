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

  // Get all paid fees and mark those unpaid where the paid_date's month has passed
  const { data: paidFees } = await supabase
    .from("student_fees")
    .select("id, paid_date")
    .eq("status", "paid");

  if (paidFees && paidFees.length > 0) {
    const now = new Date();
    const expiredIds: string[] = [];

    for (const f of paidFees) {
      if (!f.paid_date) continue;
      const paidDate = new Date(f.paid_date);
      // Last moment of the paid month
      const lastOfMonth = new Date(
        paidDate.getFullYear(),
        paidDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      if (now > lastOfMonth) {
        expiredIds.push(f.id);
      }
    }

    if (expiredIds.length > 0) {
      await supabase
        .from("student_fees")
        .update({ status: "unpaid" })
        .in("id", expiredIds);
    }
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

  // Check if the fee was paid and is now expired (end of paid month passed)
  if (fee.status === "paid" && fee.paid_date) {
    const paidDate = new Date(fee.paid_date);
    // Last moment of the paid month
    const lastOfMonth = new Date(
      paidDate.getFullYear(),
      paidDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const isPaidExpired = new Date() > lastOfMonth;

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

export async function getFeeSummary() {
  const supabase = await createClient();

  const { data: allFees, error } = await supabase
    .from("student_fees")
    .select("amount, status");

  if (error) {
    return { totalFees: 0, paidFees: 0, unpaidFees: 0, error: error.message };
  }

  const fees = allFees || [];
  const totalFees = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
  const paidFees = fees
    .filter((fee) => fee.status === "paid")
    .reduce((sum, fee) => sum + (fee.amount || 0), 0);
  const unpaidFees = fees
    .filter((fee) => fee.status === "unpaid")
    .reduce((sum, fee) => sum + (fee.amount || 0), 0);

  return { totalFees, paidFees, unpaidFees, error: null };
}
