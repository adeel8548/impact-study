import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboard() {
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

  return (
    <>
      <AdminPageHeader
        title="Admin Dashboard"
        description="Welcome back! Here's your school overview with live insights."
        badge="Premium View"
        actions={
          <span className="hidden sm:inline-flex text-xs font-medium px-3 py-1.5 rounded-full bg-secondary/60 text-foreground/80 border border-border/60">
            Dark mode ready
          </span>
        }
      />

      <AdminDashboardClient />
    </>
  );
}
