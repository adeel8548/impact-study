"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getTeachers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "teacher")
    .order("created_at", { ascending: false })
   console.log("Fetched teachers:", data)
  if (error) {
    console.error("Error fetching teachers:", error)
    return { teachers: [], error: error.message }
  }

  return { teachers: data || [], error: null }
}


export async function createTeacher(teacherData: {
  name: string
  email: string
  phone?: string
  password: string
  class_ids: string[]
}) {
  const adminClient = await createAdminClient()
  const supabase = await createClient()

  // 1. Create user in Supabase Auth using admin client
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: teacherData.email,
    password: teacherData.password,
    email_confirm: true,
    user_metadata: { name: teacherData.name, role: "teacher" },
  })

  if (authError) {
    console.error("Auth error:", authError)
    return { error: authError.message, teacher: null }
  }

  const teacherId = authData.user?.id
  console.log("Created auth user:", teacherId)
  console.log("class_ids payload:", teacherData.class_ids)

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
    })
    .select()
    .single()

  if (error) {
    console.error("Profile insert error:", error)
    // Rollback Auth user if profile insert fails
    await adminClient.auth.admin.deleteUser(teacherId!)
    return { error: error.message, teacher: null }
  }
  console.log("Profile created:", data)
  console.log("Profile.class_ids after insert:", (data as any)?.class_ids)
  // Also keep teacher_classes in sync (if the junction table exists)
  if (teacherData.class_ids && teacherData.class_ids.length > 0) {
    for (const classId of teacherData.class_ids) {
      const insertResult = await adminClient.from("teacher_classes").insert({
        teacher_id: teacherId,
        class_id: classId,
      })
      if (insertResult.error) {
        // Log but continue; profile already has class_ids
        console.error("Class assignment error:", insertResult.error)
      }
    }
  }

  revalidatePath("/admin/teachers")
  console.log("Returning teacher:", data)
  return { teacher: data, error: null }
}



export async function updateTeacher(
  teacherId: string,
  updates: Partial<{
    name: string
    email: string
    phone: string
    class_ids: string[] // new field for class assignment
  }>
) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // Update profile
  const { data, error } = await supabase
    .from("profiles")
    .update({
      name: updates.name,
      email: updates.email,
      phone: updates.phone,
    })
    .eq("id", teacherId)
    .select()
    .maybeSingle()

  if (error) return { error: error.message, teacher: null }

  // Update Auth user metadata if name or email changed
  const updateData: any = {}
  if (updates.name) updateData.user_metadata = { name: updates.name }
  if (updates.email) updateData.email = updates.email

  if (updates.name || updates.email) {
    await adminClient.auth.admin.updateUserById(teacherId, updateData)
  }

  // Update classes if provided
  if (updates.class_ids) {
    // Update the class_ids array on the profile
    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({ class_ids: updates.class_ids })
      .eq("id", teacherId)

    if (profileUpdateError) {
      console.error("Failed to update profile.class_ids:", profileUpdateError)
    }

    // Also update teacher_classes junction table for backward compatibility
    await supabase.from("teacher_classes").delete().eq("teacher_id", teacherId)
    for (const classId of updates.class_ids) {
      await supabase.from("teacher_classes").insert({
        teacher_id: teacherId,
        class_id: classId,
      })
    }
  }

  revalidatePath("/admin/teachers")
  return { teacher: data, error: null }
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
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  try {
    // 1. Delete teacher class assignments first (junction table)
    const { error: classError } = await adminClient
      .from("teacher_classes")
      .delete()
      .eq("teacher_id", teacherId);

    if (classError) {
      console.error("Error deleting teacher class assignments:", classError);
      return { error: classError.message };
    }

    // 2. Delete Auth user (this will cascade delete from profiles due to FK constraint)
    const { error: authError } = await adminClient.auth.admin.deleteUser(teacherId);
    if (authError) {
      console.error("Error deleting auth user:", authError);
      return { error: authError.message };
    }

    // 3. Revalidate the admin teachers page
    revalidatePath("/admin/teachers");

    console.log(`Teacher ${teacherId} deleted successfully from auth, profiles, and teacher_classes.`);
    return { error: null };
  } catch (err) {
    console.error("Unexpected error deleting teacher:", err);
    return { error: "Unexpected error occurred" };
  }
}


export async function assignTeacherToClass(teacherId: string, classId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("teacher_classes")
    .insert({
      teacher_id: teacherId,
      class_id: classId,
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/teachers")
  return { error: null }
}

export async function removeTeacherFromClass(teacherId: string, classId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("teacher_classes")
    .delete()
    .eq("teacher_id", teacherId)
    .eq("class_id", classId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/teachers")
  return { error: null }
}

export async function getTeacherClasses(teacherId: string) {
  const supabase = await createClient()

  // Try to read class_ids from profiles first (stored as an array)
  const { data: profileData, error: profileErr } = await supabase
    .from("profiles")
    .select("class_ids")
    .eq("id", teacherId)
    .single()

  if (profileErr) {
    // Fallback to teacher_classes junction table
    const { data, error } = await supabase
      .from("teacher_classes")
      .select("class_id, classes(id, name)")
      .eq("teacher_id", teacherId)

    if (error) {
      return { classes: [], error: error.message }
    }

    return { classes: data || [], error: null }
  }

  const classIds: string[] = profileData?.class_ids || []

  if (!classIds || classIds.length === 0) {
    return { classes: [], error: null }
  }

  // Fetch class records by ids
  const { data: classesData, error: classesErr } = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds)

  if (classesErr) {
    return { classes: [], error: classesErr.message }
  }

  return { classes: classesData || [], error: null }
}