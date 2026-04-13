import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { StudentsClientComponent } from "@/components/students-client";
import { StudentsCountCard } from "@/components/students-count-card";
import { getFeeSummary } from "@/lib/actions/fees";
import { sortClassesBySequence } from "@/lib/class-sequence";

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentManagement() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className="md:pl-64 p-8" />
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/teacher");
  }

  const { data: students = [] } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false, nullsLast: true });
  const { data: classes = [] } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false, nullsLast: true });
  const orderedClasses = sortClassesBySequence(classes || []);

  // Fetch current month fees for all students
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: fees = [] } = await supabase
    .from("student_fees")
    .select("*")
    .eq("month", currentMonth)
    .eq("year", currentYear);

  const { data: unpaidFeeRows = [] } = await supabase
    .from("student_fees")
    .select("student_id, amount")
    .eq("status", "unpaid");

  // Create a map of student fees
  const feesMap = new Map((fees || []).map((fee) => [fee.student_id, fee]));
  const unpaidMap = new Map<string, number>();

  for (const fee of unpaidFeeRows || []) {
    const key = String(fee.student_id);
    const existing = unpaidMap.get(key) || 0;
    unpaidMap.set(key, existing + Number(fee.amount || 0));
  }

  // Enrich students with fees data
  const studentsWithFees = (students || []).map((student) => ({
    ...student,
    currentFee: feesMap.get(student.id),
    pendingDue: unpaidMap.get(student.id) || 0,
    totalPayable: unpaidMap.get(student.id) || 0,
  }));

  // Get fee summary
  const { totalFees, paidFees, unpaidFees } = await getFeeSummary();

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div className="md:pl-64">
        <div className="p-4 md:p-8 space-y-6">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Student Management
              </h1>
              <p className="text-muted-foreground">
                Manage and organize all students
              </p>
            </div>
          </div>

          <StudentsCountCard />

          <StudentsClientComponent
            initialStudents={studentsWithFees || []}
            classes={orderedClasses}
            feeSummary={{ totalFees, paidFees, unpaidFees }}
          />
        </div>
      </div>
    </div>
  );
}
