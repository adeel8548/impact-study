import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeacherDashboardCharts } from "@/components/teacher-dashboard-charts";
import { TeacherDashboardStats } from "@/components/teacher-dashboard-stats";
import { TeacherAssignedSubjects } from "@/components/teacher-assigned-subjects";
import { Users, BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function TeacherDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 md:p-8" />
      </div>
    );
  }

  // Check user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, incharge_class_ids")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") {
    redirect("/admin");
  }

  // Get incharge classes (where teacher is incharge)
  const inchargeClassIds = (profile?.incharge_class_ids || []) as string[];
  const { data: inchargeClasses = [] } = inchargeClassIds.length
    ? await supabase
        .from("classes")
        .select("id, name")
        .in("id", inchargeClassIds)
    : { data: [] };

  // Get assigned subjects
  const { data: assignments = [] } = await supabase
    .from("assign_subjects")
    .select("class_id, subject_id, classes(id, name), subjects(id, name)")
    .eq("teacher_id", user.id);

  const assignmentMapped = (assignments || []).map((a: any) => ({
    class_id: a.class_id,
    class_name: (a as any).classes?.name || "",
    subject_id: a.subject_id,
    subject_name: (a as any).subjects?.name || "",
  }));

  // Get all students in incharge classes
  const { data: students = [] } = inchargeClassIds.length
    ? await supabase
        .from("students")
        .select("*")
        .in("class_id", inchargeClassIds)
    : { data: [] };

  // Get attendance for incharge classes
  const { data: attendance = [] } = inchargeClassIds.length
    ? await supabase
        .from("student_attendance")
        .select("*")
        .in("class_id", inchargeClassIds)
    : { data: [] };

  const todayAttendance = (attendance || []).filter(
    (a) => new Date(a.date).toDateString() === new Date().toDateString(),
  );

  const attendanceData = [
    { date: "Mon", present: 60, absent: 8 },
    { date: "Tue", present: 62, absent: 6 },
    { date: "Wed", present: 65, absent: 3 },
    { date: "Thu", present: 63, absent: 5 },
    { date: "Fri", present: 68, absent: 0 },
  ];

  const classDistribution = (inchargeClasses || []).map((c) => ({
    name: c.name,
    students: (students || []).filter((s) => s.class_id === c.id).length,
  }));

  // Count unique assigned subjects
  const uniqueAssignedSubjects = Array.from(
    new Set((assignments || []).map((a: any) => a.subject_id)),
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader />

      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome Back!
          </h1>
          <p className="text-muted-foreground">
            Manage your classes and mark attendance
          </p>
        </div>

        {/* Quick Stats */}
        <TeacherDashboardStats
          inchargeClassesCount={inchargeClasses.length}
          assignedSubjectsCount={uniqueAssignedSubjects}
          todayPresentCount={
            todayAttendance.filter((a) => a.status === "present").length
          }
          showInchargeClasses={inchargeClasses.length > 0}
          showAssignedSubjects={uniqueAssignedSubjects > 0}
        />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {classDistribution.length > 0 && (
            <TeacherDashboardCharts
              attendanceData={attendanceData}
              classDistribution={classDistribution}
            />
          )}
        </div>

        {/* My Incharge Classes (only if teacher is incharge of classes) */}
        {inchargeClasses.length > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-bold text-foreground mb-4">
              My Classes (Incharge)
            </h3>
            <div className="space-y-3">
              {(inchargeClasses || []).map((cls) => {
                const classStudents = (students || []).filter(
                  (s) => s.class_id === cls.id,
                );
                return (
                  <div
                    key={cls.id}
                    className="flex flex-col md:flex-row items-center justify-between p-4 bg-secondary rounded-lg hover:bg-opacity-80 transition-colors"
                  >
                    <div className="mb-3 md:mb-0">
                      <p className="font-semibold text-foreground">
                        {cls.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {classStudents.length} Students
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Link href={`/teacher/attendance`}>
                          Mark Attendance
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground"
                      >
                        <Link href={`/teacher/classes`}>View Students</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Assigned Subjects (only if teacher has assigned subjects) */}
        {assignments.length > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-bold text-foreground mb-4">
              My Assigned Subjects
            </h3>
            <TeacherAssignedSubjects assignments={assignmentMapped} />
          </Card>
        )}
      </div>
    </div>
  );
}
