"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function signUpAction(
  email: string,
  password: string,
  name: string,
  role: "admin" | "teacher" | "student",
) {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`}`,
      data: {
        name,
        role,
      },
    },
  })

  if (authError) {
    return { error: authError.message, user: null }
  }

  // Create profile in public.profiles table
  if (authData.user) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      name,
      email,
      role,
      school_id: "11111111-1111-1111-1111-111111111111", // Default school ID for demo
    })

    if (profileError) {
      return { error: profileError.message, user: null }
    }
  }

  revalidatePath("/")
  return { user: authData.user, error: null }
}

export async function signInAction(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message, user: null }
  }

  revalidatePath("/")
  return { user: data.user, error: null }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/")
}

export async function createAdmin(adminData: {
  name: string
  email: string
  password: string
  school_id: string
}) {
  const supabase = await createClient()

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminData.email,
    password: adminData.password,
    email_confirm: true,
    user_metadata: { name: adminData.name, role: "admin" },
  })

  if (authError) return { error: authError.message }

  // Insert profile
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    name: adminData.name,
    email: adminData.email,
    role: "admin",
    school_id: adminData.school_id,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: profileError.message }
  }

  revalidatePath("/admin/admins")
  return { error: null }
}

export async function updateAdmin(
  adminId: string,
  updates: Partial<{
    name: string
    email: string
  }>,
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", adminId)

  if (error) return { error: error.message }

  // Update Auth user if email or name changed
  const updateData: any = {}
  if (updates.name) updateData.user_metadata = { name: updates.name }
  if (updates.email) updateData.email = updates.email

  if (updates.name || updates.email) {
    await supabase.auth.admin.updateUserById(adminId, updateData)
  }

  revalidatePath("/admin/admins")
  return { error: null }
}
