import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { StudentResultsClient } from "@/components/student-results-client";

export default async function TeacherStudentResultsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, class_ids")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") {
    redirect("/admin");
  }

  const classIds = (profile?.class_ids || []) as string[];
  const { data: classes = [] } = classIds.length
    ? await supabase.from("classes").select("id, name").in("id", classIds)
    : { data: [] };

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader />
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Student Results
          </h1>
          <p className="text-muted-foreground">
            Add and update marks for your assigned classes
          </p>
        </div>

        <StudentResultsClient
          prefetchedClasses={classes}
          defaultClassId={classes[0]?.id}
          classEndpoint={`/api/teachers/classes?teacherId=${user.id}`}
          teacherId={user.id}
          role="teacher"
        />
      </div>
    </div>
  );
}
