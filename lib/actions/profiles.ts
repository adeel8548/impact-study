"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteProfile(profileId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/admins");
  return { error: null };
}
