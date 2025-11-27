"use server";

import { createClient } from "@/lib/supabase/server";

export async function getTeacherSalaries(teacherId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("teacher_salary")
    .select("*, teacher:profiles(name)");

  if (teacherId) {
    query = query.eq("teacher_id", teacherId);
  }

  const { data, error } = await query;

  if (error) {
    return { salaries: [], error: error.message };
  }

  return { salaries: data || [], error: null };
}

export async function updateSalaryStatus(
  salaryId: string,
  status: "paid" | "unpaid",
  paidDate?: string,
) {
  const supabase = await createClient();

  const updateData: any = { status };
  if (status === "paid" && paidDate) {
    updateData.paid_date = paidDate;
  }

  const { error } = await supabase
    .from("teacher_salary")
    .update(updateData)
    .eq("id", salaryId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
