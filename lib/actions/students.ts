"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getStudents(classId?: string) {
  const supabase = await createClient();

  let query = supabase.from("students").select("*");

  if (classId) {
    query = query.eq("class_id", classId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching students:", error);
    return { students: [], error: error.message };
  }

  return { students: data || [], error: null };
}

export async function createStudent(studentData: {
  name: string;
  roll_number: string;
  class_id: string;
  email?: string;
  phone?: string;
  guardian_name?: string;
  fees?: string | number;
  joining_date?: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .insert({
      name: studentData.name,
      roll_number: studentData.roll_number,
      class_id: studentData.class_id,
      school_id: "00000000-0000-0000-0000-000000000000",
      email: studentData.email,
      phone: studentData.phone,
      guardian_name: studentData.guardian_name,
      joining_date: studentData.joining_date || null,
    })
    .select();

  if (error) {
    return { error: error.message, student: null };
  }

  const student = data?.[0];

  // Create student fees entry for current month if fees amount is provided
  if (student && studentData.fees && Number(studentData.fees) > 0) {
    const now = new Date();
    await supabase.from("student_fees").insert({
      student_id: student.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      amount: Number(studentData.fees),
      status: "unpaid",
      school_id: "00000000-0000-0000-0000-000000000000",
    });
  }

  revalidatePath("/admin/students");
  return { student, error: null };
}

export async function updateStudent(
  studentId: string,
  updates: Partial<{
    name: string;
    roll_number: string;
    email: string;
    phone: string;
    guardian_name: string;
    fees: string;
    joining_date: string;
    class_id: string;
  }>,
) {
  const supabase = await createClient();

  const { fees, ...studentUpdates } = updates;

  // Fix: Convert empty joining_date to null to prevent date parsing error
  const sanitizedUpdates = {
    ...studentUpdates,
    joining_date: studentUpdates.joining_date || null,
  };

  const { data, error } = await supabase
    .from("students")
    .update(sanitizedUpdates)
    .eq("id", studentId)
    .select();

  if (error) {
    return { error: error.message, student: null };
  }

  // Update fees if provided
  if (fees && Number(fees) > 0) {
    const now = new Date();
    const { data: existingFees } = await supabase
      .from("student_fees")
      .select("id")
      .eq("student_id", studentId)
      .eq("month", now.getMonth() + 1)
      .eq("year", now.getFullYear())
      .single();

    if (existingFees) {
      await supabase
        .from("student_fees")
        .update({ amount: Number(fees) })
        .eq("id", existingFees.id);
    } else {
      await supabase.from("student_fees").insert({
        student_id: studentId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        amount: Number(fees),
        status: "unpaid",
        school_id: "00000000-0000-0000-0000-000000000000",
      });
    }
  }

  revalidatePath("/admin/students");
  return { student: data?.[0], error: null };
}

export async function deleteStudent(studentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/students");
  return { error: null };
}
