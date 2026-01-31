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
  full_fee?: string | number;
  joining_date?: string;
  ac_number?: string;
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
      full_fee: studentData.full_fee ? Number(studentData.full_fee) : 0,
      joining_date: studentData.joining_date || null,
      ac_number: studentData.ac_number || null,
    })
    .select();

  if (error) {
    return { error: error.message, student: null };
  }

  const student = data?.[0];

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
    full_fee: string | number;
    joining_date: string;
    class_id: string;
    ac_number: string;
  }>,
) {
  const supabase = await createClient();

  const { full_fee, ...studentUpdates } = updates;

  // Fix: Convert empty joining_date to null to prevent date parsing error
  const sanitizedUpdates: any = {
    ...studentUpdates,
    joining_date: studentUpdates.joining_date || null,
    ac_number: studentUpdates.ac_number || null,
  };

  // Always include full_fee in updates if provided (even if it's 0)
  if (full_fee !== undefined) {
    sanitizedUpdates.full_fee = Number(full_fee);
  }

  const { data, error } = await supabase
    .from("students")
    .update(sanitizedUpdates)
    .eq("id", studentId)
    .select();

  if (error) {
    return { error: error.message, student: null };
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
