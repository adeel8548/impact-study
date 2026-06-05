import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminsClientComponent } from "@/components/admins-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminManagement() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/teacher");
  }

  const { data: admins = [] } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "admin")
    .order("created_at", { ascending: false, nullsLast: true });

  return (
    <>
      <AdminPageHeader
        title="Admin Management"
        description="Create and manage system administrators"
      />

      <AdminsClientComponent initialAdmins={admins} />
    </>
  );
}
