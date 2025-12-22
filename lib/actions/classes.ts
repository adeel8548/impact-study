"use server";

import { createClient } from "@/lib/supabase/server";

export async function getClasses() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("classes").select("*");

  if (error) {
    console.error("Error fetching classes:", error);
    return { classes: [], error: error.message };
  }

  return { classes: data || [], error: null };
}

export async function getClassesForTeacher(teacherId: string) {
  const supabase = await createClient();

  // Fetch class_ids from profiles, then fetch classes by ids
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("class_ids")
    .eq("id", teacherId)
    .maybeSingle();

  if (profileErr) {
    console.error("Error fetching teacher profile class_ids:", profileErr);
    return { classes: [], error: profileErr.message };
  }

  const classIds: string[] = (profile?.class_ids as string[]) || [];
  if (classIds.length === 0) return { classes: [], error: null };

  const { data: classes, error } = await supabase
    .from("classes")
    .select("*")
    .in("id", classIds);

  if (error) {
    console.error("Error fetching classes by ids:", error);
    return { classes: [], error: error.message };
  }

  return { classes: classes || [], error: null };
}
