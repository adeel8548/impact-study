import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminsClientComponent } from "@/components/admins-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminManagement() {
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

  const { data: admins = [] } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "admin")
    .order("created_at", { ascending: false, nullsLast: true });

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div className="md:pl-64">
        <div className="p-4 md:p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Admin Management
              </h1>
              <p className="text-muted-foreground">
                Create and manage system administrators
              </p>
            </div>
            <AdminsClientComponent initialAdmins={admins} />
          </div>
        </div>
      </div>
    </div>
  );
}
