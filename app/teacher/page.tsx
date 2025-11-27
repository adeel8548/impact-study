import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeacherDashboardCharts } from "@/components/teacher-dashboard-charts";
import { Users, BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function TeacherDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") {
    redirect("/admin");
  }

  // Read assigned classes from profile.class_ids
  const { data: profileData } = await supabase
    .from("profiles")
    .select("class_ids")
    .eq("id", user.id)
    .single();

  const classIds = (profileData?.class_ids || []) as string[];
  const { data: classes = [] } = classIds.length
    ? await supabase.from("classes").select("id, name").in("id", classIds)
    : { data: [] };
  const { data: students = [] } = classIds.length
    ? await supabase.from("students").select("*").in("class_id", classIds)
    : { data: [] };

  const { data: attendance = [] } = classIds.length
    ? await supabase
        .from("student_attendance")
        .select("*")
        .in("class_id", classIds)
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

  const classDistribution = (classes || []).map((c) => ({
    name: c.name,
    students: (students || []).filter((s) => s.class_id === c.id).length,
  }));

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">
                  My Classes
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {(classes || []).length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">
                  Total Students
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {(students || []).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">
                  Today's Present
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {todayAttendance.filter((a) => a.status === "present").length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TeacherDashboardCharts
            attendanceData={attendanceData}
            classDistribution={classDistribution}
          />
        </div>

        {/* My Classes */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">My Classes</h3>
          <div className="space-y-3">
            {(classes || []).map((cls) => {
              const classStudents = (students || []).filter(
                (s) => s.class_id === cls.id,
              );
              return (
                <div
                  key={cls.id}
                  className="flex flex-col md:flex-row items-center justify-between p-4 bg-secondary rounded-lg hover:bg-opacity-80 transition-colors"
                >
                  <div className="mb-3 md:mb-0">
                    <p className="font-semibold text-foreground">{cls.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {classStudents.length} Students
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Link href={`/teacher/attendance`}>Mark Attendance</Link>
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
      </div>
    </div>
  );
}
