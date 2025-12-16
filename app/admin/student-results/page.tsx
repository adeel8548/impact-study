import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { StudentResultsClient } from "@/components/student-results-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentResultsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Check if user is admin
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
        <div className="p-4 md:p-8 space-y-6">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Student Results Management
              </h1>
              <p className="text-muted-foreground">
                Manage student results across chapters and series exams
              </p>
            </div>
          </div>

          <StudentResultsClient />
        </div>
      </div>
    </div>
  );
}
