import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-page-header";
import { StudentResultsClient } from "@/components/student-results-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentResultsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
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
    <div className="space-y-6">
      <AdminPageHeader
        title="Student Results Management"
        description="Manage student results across chapters and series exams"
      />

      <StudentResultsClient />
    </div>
  );
}
