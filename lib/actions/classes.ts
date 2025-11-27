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

  // Use the teacher_classes junction table to get classes for a teacher
  const { data, error } = await supabase
    .from("teacher_classes")
    .select("classes(*)")
    .eq("teacher_id", teacherId);

  if (error) {
    console.error("Error fetching teacher classes:", error);
    return { classes: [], error: error.message };
  }

  // Flatten the response to get the classes array
  const classes = (data || []).map((item: any) => item.classes).filter(Boolean);

  return { classes, error: null };
}
