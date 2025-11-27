import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { StudentsClientComponent } from "@/components/students-client"

export default async function StudentManagement() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    redirect("/teacher")
  }

  const { data: students = [] } = await supabase.from("students").select("*")
  const { data: classes = [] } = await supabase.from("classes").select("*")
  
  // Fetch current month fees for all students
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  
  const { data: fees = [] } = await supabase
    .from("student_fees")
    .select("*")
    .eq("month", currentMonth)
    .eq("year", currentYear)

  // Create a map of student fees
  const feesMap = new Map((fees || []).map((fee) => [fee.student_id, fee]))

  // Enrich students with fees data
  const studentsWithFees = (students || []).map((student) => ({
    ...student,
    currentFee: feesMap.get(student.id),
  }))

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div className="md:pl-64">
        <div className="p-4 md:p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Student Management</h1>
              <p className="text-muted-foreground">Manage and organize all students</p>
            </div>
          </div>

          <StudentsClientComponent initialStudents={studentsWithFees || []} classes={classes  || []} />
        </div>
      </div>
    </div>
  )
}
