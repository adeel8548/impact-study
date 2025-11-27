"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function markStudentAttendance(
  studentId: string,
  classId: string,
  date: string,
  status: "present" | "absent" | "leave",
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single()

  const { error } = await supabase.from("student_attendance").upsert({
    student_id: studentId,
    class_id: classId,
    date,
    status,
    school_id: profile?.school_id,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/teacher")
  revalidatePath("/admin/attendance")
  return { error: null }
}

export async function getStudentAttendance(studentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.from("student_attendance").select("*").eq("student_id", studentId)

  if (error) {
    return { attendance: [], error: error.message }
  }

  return { attendance: data || [], error: null }
}
