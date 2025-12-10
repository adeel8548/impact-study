import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { QuizResultsClient } from "@/components/quiz-results-client";

export default async function TeacherQuizResultsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Check if user is teacher
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader />

      <div className="p-4 md:p-8 space-y-6">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Quiz Results Management
            </h1>
            <p className="text-muted-foreground">
              Manage and track quiz results for your classes with add, update, and delete operations
            </p>
          </div>
        </div>

        <QuizResultsClient teacherId={user.id} role="teacher" />
      </div>
    </div>
  );
}
