import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-page-header";
import { QuizResultsClient } from "@/components/quiz-results-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function QuizResultsPage() {
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
    <div className="space-y-6">
      <AdminPageHeader
        title="Quiz Results Management"
        description="Manage and track quiz results with add, update, and delete operations"
      />

      <QuizResultsClient />
    </div>
  );
}
