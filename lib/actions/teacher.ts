"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { upsertTeacherSalary } from "@/lib/server/teacher-salary";
import { syncTeacherToFirebase, deleteTeacherFromFirebase } from "@/lib/actions/sync-teachers-to-firebase";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTeachers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "teacher")
    .order("created_at", { ascending: false });
  console.log("Fetched teachers:", data);
  if (error) {
    console.error("Error fetching teachers:", error);
    return { teachers: [], error: error.message };
  }

  return { teachers: data || [], error: null };
}

export async function createTeacher(teacherData: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  class_ids: string[];
  salary?: number;
  incharge_class_ids?: string[] | null;
  assign_subjects?: Array<{ class_id: string; subject_id: string }>;
  joining_date?: string;
  expected_time?: string | null;
}) {
  const adminClient = await createAdminClient();
  const supabase = await createClient();

  // 1. Create user in Supabase Auth using admin client
  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email: teacherData.email,
      password: teacherData.password,
      email_confirm: true,
      user_metadata: { name: teacherData.name, role: "teacher" },
    });

  if (authError) {
    console.error("Auth error:", authError);
    return { error: authError.message, teacher: null };
  }

  const teacherId = authData.user?.id;
  console.log("Created auth user:", teacherId);
  console.log("class_ids payload:", teacherData.class_ids);

  // 2. Insert in profiles table using admin client (bypasses RLS)
  const { data, error } = await adminClient
    .from("profiles")
    .insert({
      id: teacherId,
      name: teacherData.name,
      email: teacherData.email,
      phone: teacherData.phone,
      role: "teacher",
      school_id: "00000000-0000-0000-0000-000000000000",
      class_ids: teacherData.class_ids || [],
      incharge_class_ids: teacherData.incharge_class_ids || null,
      joining_date: teacherData.joining_date || null,
      expected_time: teacherData.expected_time || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Profile insert error:", error);
    // Rollback Auth user if profile insert fails
    await adminClient.auth.admin.deleteUser(teacherId!);
    return { error: error.message, teacher: null };
  }
  console.log("Profile created:", data);
  console.log("Profile.class_ids after insert:", (data as any)?.class_ids);
  await persistTeacherClasses(adminClient, teacherId!, teacherData.class_ids);

  if (teacherData.salary && Number(teacherData.salary) > 0 && teacherId) {
    await upsertTeacherSalary({
      teacherId,
      amount: Number(teacherData.salary),
      status: "unpaid",
    });
  }

  // Persist assigned subjects if provided
  if (
    Array.isArray(teacherData.assign_subjects) &&
    teacherData.assign_subjects.length > 0
  ) {
    const insertRows = teacherData.assign_subjects.map((s) => ({
      teacher_id: teacherId,
      class_id: s.class_id,
      subject_id: s.subject_id,
    }));

    const { error: assignErr } = await adminClient
      .from("assign_subjects")
      .insert(insertRows);

    if (assignErr) {
      console.error("Failed to insert assign_subjects:", assignErr);
    }
  }

  // Sync teacher to Firebase chat_users
  try {
    await syncTeacherToFirebase(teacherId!);
  } catch (error) {
    console.error("Failed to sync teacher to Firebase:", error);
    // Don't fail the whole operation, just log the error
  }

  revalidatePath("/admin/teachers");
  console.log("Returning teacher:", data);
  return { teacher: data, error: null };
}

export async function updateTeacher(
  teacherId: string,
  updates: Partial<{
    name: string;
    email: string;
    phone: string;
    class_ids: string[]; // new field for class assignment
    salary: number;
    incharge_class_ids?: string[] | null;
    assign_subjects?: Array<{ class_id: string; subject_id: string }>;
    joining_date?: string;
    expected_time?: string | null;
  }>,
) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  // Update profile
  const updatePayload: any = {};
  if (updates.name !== undefined) updatePayload.name = updates.name;
  if (updates.email !== undefined) updatePayload.email = updates.email;
  if (updates.phone !== undefined) updatePayload.phone = updates.phone;
  if (updates.joining_date !== undefined) updatePayload.joining_date = updates.joining_date || null;
  if (updates.expected_time !== undefined) updatePayload.expected_time = updates.expected_time || null;

  const { data, error } = await adminClient
    .from("profiles")
    .update(updatePayload)
    .eq("id", teacherId)
    .select()
    .maybeSingle();

  if (error) return { error: error.message, teacher: null };

  // Update Auth user metadata if name or email changed
  const updateData: any = {};
  if (updates.name) updateData.user_metadata = { name: updates.name };
  if (updates.email) updateData.email = updates.email;

  if (updates.name || updates.email) {
    await adminClient.auth.admin.updateUserById(teacherId, updateData);
  }

  // Update classes if provided
  if (updates.class_ids) {
    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({ class_ids: updates.class_ids })
      .eq("id", teacherId);

    if (profileUpdateError) {
      console.error("Failed to update profile.class_ids:", profileUpdateError);
    }

    await persistTeacherClasses(adminClient, teacherId, updates.class_ids);
  }

  // Update incharge classes array if provided
  if (Object.prototype.hasOwnProperty.call(updates, "incharge_class_ids")) {
    const { incharge_class_ids } = updates as any;
    const { error: inchargeErr } = await adminClient
      .from("profiles")
      .update({ incharge_class_ids: incharge_class_ids || [] })
      .eq("id", teacherId);
    if (inchargeErr) {
      console.error("Failed to update incharge_class_ids:", inchargeErr);
    }
  }

  // Replace assign_subjects if provided
  if (Array.isArray(updates.assign_subjects)) {
    // delete existing
    const { error: delErr } = await adminClient
      .from("assign_subjects")
      .delete()
      .eq("teacher_id", teacherId);
    if (delErr) {
      console.error("Failed to delete existing assign_subjects:", delErr);
    }

    if (updates.assign_subjects.length > 0) {
      const insertRows = updates.assign_subjects.map((s) => ({
        teacher_id: teacherId,
        class_id: s.class_id,
        subject_id: s.subject_id,
      }));

      const { error: insertErr } = await adminClient
        .from("assign_subjects")
        .insert(insertRows);
      if (insertErr) {
        console.error("Failed to insert assign_subjects:", insertErr);
      }
    }
  }

  if (typeof updates.salary === "number" && updates.salary > 0) {
    await upsertTeacherSalary({
      teacherId,
      amount: updates.salary,
    });
  }

  revalidatePath("/admin/teachers");
  return { teacher: data, error: null };
}

// export async function deleteTeacher(teacherId: string) {
//   const supabase = await createClient()
//   const adminClient = await createAdminClient()

//   // Delete class assignments first
//   const { error: classError } = await supabase
//     .from("teacher_classes")
//     .delete()
//     .eq("teacher_id", teacherId)
//   if (classError) return { error: classError.message }

//   // Delete profile
//   const { error: profileError } = await supabase
//     .from("profiles")
//     .delete()
//     .eq("id", teacherId)
//   if (profileError) return { error: profileError.message }

//   // Delete auth user using admin client
//   const { error: authError } = await adminClient.auth.admin.deleteUser(teacherId)
//   if (authError) return { error: authError.message }

//   revalidatePath("/admin/teachers")
//   return { error: null }
// }

export async function deleteTeacher(teacherId: string) {
  const adminClient = await createAdminClient();

  try {
    // 1. Clear class_ids and incharge_class_ids from profiles (no junction table)
    const { error: clearClassesErr } = await adminClient
      .from("profiles")
      .update({ class_ids: [], incharge_class_ids: [] })
      .eq("id", teacherId);
    if (clearClassesErr) {
      console.error("Error clearing assigned classes:", clearClassesErr);
      return { error: clearClassesErr.message };
    }

    const { error: salaryError } = await adminClient
      .from("teacher_salary")
      .delete()
      .eq("teacher_id", teacherId);
    if (salaryError) {
      console.error("Error deleting teacher salary records:", salaryError);
      return { error: salaryError.message };
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", teacherId);
    if (profileError) {
      console.error("Error deleting teacher profile:", profileError);
      return { error: profileError.message };
    }

    // 2. Delete Auth user to remove login access
    const { error: authError } =
      await adminClient.auth.admin.deleteUser(teacherId);
    if (authError) {
      console.error("Error deleting auth user:", authError);
      return { error: authError.message };
    }

    // 3. Delete teacher from Firebase chat_users and archive conversations
    try {
      await deleteTeacherFromFirebase(teacherId);
    } catch (error) {
      console.error("Failed to delete teacher from Firebase:", error);
      // Don't fail the whole operation, just log the error
    }

    // 4. Revalidate the admin teachers page
    revalidatePath("/admin/teachers");

    console.log(
      `Teacher ${teacherId} deleted successfully from auth and profiles.`,
    );
    return { error: null };
  } catch (err) {
    console.error("Unexpected error deleting teacher:", err);
    return { error: "Unexpected error occurred" };
  }
}

export async function assignTeacherToClass(teacherId: string, classId: string) {
  const adminClient = await createAdminClient();
  // Push classId into profiles.class_ids (unique)
  const { data: profile, error: fetchErr } = await adminClient
    .from("profiles")
    .select("class_ids")
    .eq("id", teacherId)
    .maybeSingle();
  if (fetchErr) return { error: fetchErr.message };

  const existing: string[] = ((profile?.class_ids as string[]) || []).slice();
  if (!existing.includes(classId)) existing.push(classId);

  const { error } = await adminClient
    .from("profiles")
    .update({ class_ids: existing })
    .eq("id", teacherId);

  if (error) return { error: error.message };

  revalidatePath("/admin/teachers");
  return { error: null };
}

export async function removeTeacherFromClass(
  teacherId: string,
  classId: string,
) {
  const adminClient = await createAdminClient();
  const { data: profile, error: fetchErr } = await adminClient
    .from("profiles")
    .select("class_ids")
    .eq("id", teacherId)
    .maybeSingle();
  if (fetchErr) return { error: fetchErr.message };

  const existing: string[] = ((profile?.class_ids as string[]) || []).slice();
  const updated = existing.filter((id) => id !== classId);

  const { error } = await adminClient
    .from("profiles")
    .update({ class_ids: updated })
    .eq("id", teacherId);

  if (error) return { error: error.message };

  revalidatePath("/admin/teachers");
  return { error: null };
}

export async function getTeacherClasses(teacherId: string) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("class_ids")
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    return { classes: [], error: error.message };
  }

  const classIds: string[] = (profile?.class_ids as string[]) || [];
  if (classIds.length === 0) {
    return { classes: [], error: null };
  }

  const { data: classesData, error: classesErr } = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds);

  if (classesErr) {
    return { classes: [], error: classesErr.message };
  }

  return { classes: classesData || [], error: null };
}

async function persistTeacherClasses(
  adminClient: SupabaseClient,
  teacherId: string,
  classIds: string[] = [],
) {
  const uniqueClassIds = Array.from(new Set(classIds || []));

  // Remove existing mappings for this teacher
  const { error: delErr } = await adminClient
    .from("teacher_classes")
    .delete()
    .eq("teacher_id", teacherId);
  if (delErr) {
    console.error("Failed to clear existing teacher_classes:", delErr);
    return;
  }

  if (uniqueClassIds.length === 0) return;

  const rows = uniqueClassIds.map((cid) => ({
    teacher_id: teacherId,
    class_id: cid,
  }));

  const { error: insErr } = await adminClient
    .from("teacher_classes")
    .insert(rows);

  if (insErr) {
    console.error("Failed to insert teacher_classes:", insErr);
  }
}
