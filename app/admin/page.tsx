import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
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
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div className="md:pl-64">
        <div className="p-4  md:p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back! Here's your school overview.
            </p>
          </div>

          <AdminDashboardClient />
        </div>
      </div>
    </div>
  );
}
