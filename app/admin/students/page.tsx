import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-page-header";
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
    <div className="space-y-6">
      <AdminPageHeader
        title="Student Management"
        description="Manage and organize all students"
      />

      <StudentsCountCard />

      <StudentsClientComponent
        initialStudents={studentsWithFees || []}
        classes={orderedClasses}
        feeSummary={{ totalFees, paidFees, unpaidFees }}
      />
    </div>
  );
}
