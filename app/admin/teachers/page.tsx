"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Briefcase,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { TeacherModal } from "@/components/modals/teacher-modal";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";
import { deleteTeacher } from "@/lib/actions/teacher";
import { toast } from "sonner";
import { sortByNewest } from "@/lib/utils";
import { TeacherSalaryCard } from "@/components/teacher-salary-card";
interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  school_id: string;
  created_at: string;
  class_ids?: string[] | null;
  salary?: {
    amount: number;
    status: "paid" | "unpaid";
  } | null;
}

interface TeacherSalary {
  id: string;
  teacher_id: string;
  amount: number;
  status: "paid" | "unpaid";
  month: number;
  year: number;
  paid_date?: string;
  created_at?: string;
  updated_at?: string;
}

type TeacherSalarySnapshot = Partial<TeacherSalary> & {
  teacher_id: string;
  amount: number;
  status: "paid" | "unpaid";
  month: number;
  year: number;
};

interface SalarySummary {
  paidAmount: number;
  unpaidAmount: number;
  paidCount: number;
  unpaidCount: number;
  totalAmount: number;
}

const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_YEAR = new Date().getFullYear();

export default function TeacherManagement() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teacherSalaryMap, setTeacherSalaryMap] = useState<
    Record<string, TeacherSalarySnapshot>
  >({});
  const [salarySummary, setSalarySummary] = useState<SalarySummary>({
    paidAmount: 0,
    unpaidAmount: 0,
    paidCount: 0,
    unpaidCount: 0,
    totalAmount: 0,
  });

  // Modal states
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "admin") {
      router.push("/");
    } else {
      loadTeachers();
      loadClasses();
      loadSalaryData();
    }
  }, [router]);

  const loadClasses = async () => {
    try {
      const res = await fetch(`/api/classes`);
      const json = await res.json();
      const classList = Array.isArray(json.classes) ? json.classes : [];
      setClasses(sortByNewest(classList));
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  };

  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/teachers`);
      const json = await res.json();
      const data = json.teachers || [];
      const normalized = sortByNewest(data);
      setTeachers(normalized as Teacher[]);
      const salaryMap: Record<string, TeacherSalary> = {};
      normalized.forEach((teacher: any) => {
        if (teacher.salary) {
          salaryMap[teacher.id] = {
            teacher_id: teacher.id,
            amount: Number(teacher.salary.amount) || 0,
            status: teacher.salary.status,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
          } as TeacherSalary;
        }
      });
      setTeacherSalaryMap(salaryMap);
      
      // class_ids are already loaded from the teacher profiles
    } catch (error) {
      console.error("Failed to load teachers:", error);
      toast.error("Failed to load teachers");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSalaryData = async () => {
    try {
      const res = await fetch(`/api/salaries`);
      const json = await res.json();
      const salaries: TeacherSalary[] = Array.isArray(json.salaries)
        ? json.salaries
        : [];
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const current = salaries.filter(
        (salary) =>
          Number(salary.month) === currentMonth &&
          Number(salary.year) === currentYear,
      );

      const summary = current.reduce<SalarySummary>(
        (acc, salary) => {
          const amount = Number(salary.amount) || 0;
          acc.totalAmount += amount;
          if (salary.status === "paid") {
            acc.paidAmount += amount;
            acc.paidCount += 1;
          } else {
            acc.unpaidAmount += amount;
            acc.unpaidCount += 1;
          }
          return acc;
        },
        {
          paidAmount: 0,
          unpaidAmount: 0,
          paidCount: 0,
          unpaidCount: 0,
          totalAmount: 0,
        },
      );

      const latestMap: Record<string, TeacherSalary> = {};
      current.forEach((salary) => {
        const existing = latestMap[salary.teacher_id];
        const existingTs = existing
          ? new Date(existing.updated_at || existing.created_at || 0).getTime()
          : 0;
        const salaryTs = new Date(
          salary.updated_at || salary.created_at || 0,
        ).getTime();
        if (!existing || salaryTs >= existingTs) {
          latestMap[salary.teacher_id] = salary;
        }
      });

      setTeacherSalaryMap((prev) => ({ ...prev, ...latestMap }));
      setSalarySummary(summary);
    } catch (error) {
      console.error("Failed to load salary data:", error);
      toast.error("Failed to load salary data");
    }
  };

  const handleAddTeacher = () => {
    setSelectedTeacher(null);
    setTeacherModalOpen(true);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setTeacherModalOpen(true);
  };

  const handleDeleteClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTeacher) return;

    const { error } = await deleteTeacher(selectedTeacher.id);

    if (error) {
      toast.error("Failed to delete teacher");
      return;
    }

    toast.success("Teacher deleted successfully");
    await loadTeachers();
    await loadSalaryData();
  };

  const handleCardStatusChange = (
    teacherId: string,
    amount: number,
    status: "paid" | "unpaid",
  ) => {
    const previousStatus = teacherSalaryMap[teacherId]?.status ?? "unpaid";
    if (previousStatus === status) return;

    const amountValue = Number(amount) || 0;

    setTeacherSalaryMap((prev) => ({
      ...prev,
      [teacherId]: {
        teacher_id: teacherId,
        amount: amountValue,
        status,
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      },
    }));

    setTeachers((prev) =>
      prev.map((teacher) =>
        teacher.id === teacherId
          ? { ...teacher, salary: { amount: amountValue, status } }
          : teacher,
      ),
    );

    setSalarySummary((prev) => {
      if (previousStatus === status) {
        return prev;
      }

      const summary = { ...prev };

      if (previousStatus === "unpaid" && status === "paid") {
        summary.paidAmount += amountValue;
        summary.unpaidAmount = Math.max(summary.unpaidAmount - amountValue, 0);
        summary.paidCount += 1;
        summary.unpaidCount = Math.max(summary.unpaidCount - 1, 0);
      } else if (previousStatus === "paid" && status === "unpaid") {
        summary.unpaidAmount += amountValue;
        summary.paidAmount = Math.max(summary.paidAmount - amountValue, 0);
        summary.unpaidCount += 1;
        summary.paidCount = Math.max(summary.paidCount - 1, 0);
      }

      return summary;
    });
  };

  const handleModalSuccess = async () => {
    await loadTeachers();
    await loadSalaryData();
  };

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getAssignedClasses = (teacher: Teacher) => {
    const classIds = teacher.class_ids as string[] | null;
    if (!classIds || classIds.length === 0) {
      return [];
    }
    return classes.filter((cls) => classIds.includes(cls.id));
  };

  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center">
  //       <Loader2 className="w-8 h-8 animate-spin text-primary" />
  //     </div>
  //   )
  // }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div className="md:pl-64">
        <div className="p-4 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Teacher Management
              </h1>
              <p className="text-muted-foreground">
                Manage and assign teachers to classes
              </p>
            </div>
            <Button
              onClick={handleAddTeacher}
              className="gap-2 bg-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4" />
              Add Teacher
            </Button>
          </div>

          {/* Salary Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">
                    Total Salary Budget
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    PKR {salarySummary.totalAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Combined salaries for all teachers
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>
            <Card className="p-6 border-l-4 border-l-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">
                    Total Paid (Current Month)
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    PKR {salarySummary.paidAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {salarySummary.paidCount} {salarySummary.paidCount === 1 ? "teacher" : "teachers"} paid
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">
                    Total Unpaid (Current Month)
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    PKR {salarySummary.unpaidAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {salarySummary.unpaidCount}{" "}
                    {salarySummary.unpaidCount === 1 ? "teacher" : "teachers"} pending
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Search */}
          <Card className="p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </Card>

          {/* Teachers Grid */}
          {/* Teachers Grid or Loader */}
          <Card className="p-6">
            {isLoading ? (
              <div className="h-60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-sm text-muted-foreground">
                  Loading teachers...
                </span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTeachers?.map((teacher) => (
                    <TeacherSalaryCard
                      key={teacher.id}
                      teacher={teacher}
                      assignedClasses={getAssignedClasses(teacher)}
                      onStatusChange={({ status, amount }) =>
                        handleCardStatusChange(teacher.id, amount, status)
                      }
                      onEdit={() => handleEditTeacher(teacher)}
                      onDelete={() => handleDeleteClick(teacher)}
                    />
                  ))}
                </div>

                {filteredTeachers.length === 0 && (
                  <Card className="p-8 text-center">
                    <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">
                      {searchTerm
                        ? "No teachers found matching your search"
                        : "No teachers added yet"}
                    </p>
                  </Card>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Teacher Modal */}
      <TeacherModal
        open={teacherModalOpen}
        onOpenChange={(open) => {
          setTeacherModalOpen(open);
          if (!open) {
            setSelectedTeacher(null);
          }
        }}
        teacher={
          selectedTeacher
            ? {
                ...selectedTeacher,
                class_ids: selectedTeacher.class_ids ?? undefined,
              }
            : null
        }
        classes={classes}
        onSuccess={handleModalSuccess}
        initialSalary={
          selectedTeacher
            ? teacherSalaryMap[selectedTeacher.id]?.amount
            : undefined
        }
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) {
            setSelectedTeacher(null);
          }
        }}
        title="Delete Teacher"
        description={`Are you sure you want to delete ${selectedTeacher?.name}? This will remove their account and they will no longer be able to log in. This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
