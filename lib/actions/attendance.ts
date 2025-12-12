"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markStudentAttendance(
  studentId: string,
  classId: string,
  date: string,
  status: "present" | "absent" | "leave" | null,
  remarks?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Only allow teachers to mark attendance for classes they are incharge of.
  // Admins or other roles can bypass this check.
  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("role, incharge_class_ids, incharge_class_id, class_ids")
    .eq("id", user.id)
    .single();

  const role = requesterProfile?.role || null;
  if (role === "teacher") {
    const inchargeArr: string[] = Array.isArray(
      requesterProfile?.incharge_class_ids,
    )
      ? (requesterProfile?.incharge_class_ids as string[])
      : [];
    const legacySingle = requesterProfile?.incharge_class_id
      ? [String(requesterProfile.incharge_class_id)]
      : [];
    const legacyClassIds: string[] = Array.isArray(requesterProfile?.class_ids)
      ? (requesterProfile?.class_ids as string[])
      : [];

    const allowed = new Set<string>(
      [...inchargeArr, ...legacySingle, ...legacyClassIds].filter(Boolean),
    );

    if (!allowed.has(classId)) {
      return { error: "Not authorized to mark attendance for this class" };
    }
  }

  // If status is null, delete the record instead of upserting
  if (status === null) {
    const { error } = await supabase
      .from("student_attendance")
      .delete()
      .eq("student_id", studentId)
      .eq("date", date);

    if (error) {
      return { error: error.message };
    }
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    const { error } = await supabase.from("student_attendance").upsert({
      student_id: studentId,
      class_id: classId,
      date,
      status,
      remarks: remarks || null,
      school_id: profile?.school_id,
    });

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/teacher");
  revalidatePath("/admin/attendance");
  return { error: null };
}

export async function getStudentAttendance(studentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_attendance")
    .select("*")
    .eq("student_id", studentId);

  if (error) {
    return { attendance: [], error: error.message };
  }

  return { attendance: data || [], error: null };
}

export async function markTeacherAttendance(
  teacherId: string,
  date: string,
  status: "present" | "absent" | "leave" | null,
  remarks?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // If status is null, delete the record instead of upserting
  if (status === null) {
    const { error } = await supabase
      .from("teacher_attendance")
      .delete()
      .eq("teacher_id", teacherId)
      .eq("date", date);

    if (error) {
      return { error: error.message };
    }
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    const { error } = await supabase.from("teacher_attendance").upsert({
      teacher_id: teacherId,
      date,
      status,
      remarks: remarks || null,
      school_id: profile?.school_id,
    });

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/teacher");
  revalidatePath("/admin/attendance");
  revalidatePath("/teacher/my-attendance");
  return { error: null };
}

export async function updateAttendanceRemarks(
  recordId: string,
  table: "student_attendance" | "teacher_attendance",
  remarks: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Fetch role and existing record for teacher_attendance to enforce lock
  let role: string | null = null;
  if (table === "teacher_attendance") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role || null;

    const { data: existing } = await supabase
      .from("teacher_attendance")
      .select("reason_locked")
      .eq("id", recordId)
      .single();

    if (existing?.reason_locked && role === "teacher") {
      return { error: "Reason is locked after admin approval" };
    }
  }

  const { error } = await supabase
    .from(table)
    .update({ remarks })
    .eq("id", recordId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/teacher");
  revalidatePath("/admin/attendance");
  revalidatePath("/teacher/my-attendance");
  return { error: null };
}
