import { createAdminClient } from "@/lib/supabase/server";

/**
 * Check if a teacher is incharge of a specific class
 */
export async function isTeacherInchargeOfClass(
  teacherId: string,
  classId: string
): Promise<boolean> {
  const adminClient = await createAdminClient();

  const { data, error } = await adminClient
    .from("profiles")
    .select("incharge_class_ids")
    .eq("id", teacherId)
    .single();

  if (error) {
    console.error("Error checking incharge status:", error);
    return false;
  }

  const inchargeClassIds = (data?.incharge_class_ids || []) as string[];
  return inchargeClassIds.includes(classId);
}

/**
 * Check if a teacher has a subject assigned in a specific class
 */
export async function isTeacherAssignedToSubjectInClass(
  teacherId: string,
  classId: string,
  subjectId: string
): Promise<boolean> {
  const adminClient = await createAdminClient();

  const { data, error } = await adminClient
    .from("assign_subjects")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "not found" error, which is ok
    console.error("Error checking subject assignment:", error);
    return false;
  }

  return !!data;
}

/**
 * Check if a teacher has a subject assigned (in any class)
 */
export async function isTeacherAssignedToSubject(
  teacherId: string,
  subjectId: string
): Promise<boolean> {
  const adminClient = await createAdminClient();

  const { data, error } = await adminClient
    .from("assign_subjects")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("subject_id", subjectId)
    .limit(1);

  if (error) {
    console.error("Error checking subject assignment:", error);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

/**
 * Get all classes a teacher is incharge of
 */
export async function getTeacherInchargeClasses(
  teacherId: string
): Promise<string[]> {
  const adminClient = await createAdminClient();

  const { data, error } = await adminClient
    .from("profiles")
    .select("incharge_class_ids")
    .eq("id", teacherId)
    .single();

  if (error) {
    console.error("Error fetching incharge classes:", error);
    return [];
  }

  return (data?.incharge_class_ids || []) as string[];
}

/**
 * Get all subjects a teacher is assigned to
 */
export async function getTeacherAssignedSubjects(
  teacherId: string
): Promise<string[]> {
  const adminClient = await createAdminClient();

  const { data, error } = await adminClient
    .from("assign_subjects")
    .select("subject_id")
    .eq("teacher_id", teacherId);

  if (error) {
    console.error("Error fetching assigned subjects:", error);
    return [];
  }

  return Array.from(
    new Set((data || []).map((d: any) => d.subject_id))
  );
}
