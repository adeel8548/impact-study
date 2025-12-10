"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TeacherSalary {
  id: string;
  teacher_id: string;
  amount: number;
  status: "paid" | "unpaid";
  month?: number | string;
  year?: number | string;
  paid_date?: string;
  created_at?: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  salaries?: TeacherSalary[];
}

interface TeacherSalaryListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: Teacher[];
  isLoading?: boolean;
  onTeacherSalaryPaid?: (data: {
    teacherId: string;
    salaryId: string;
    month: number | string;
    year: number | string;
  }) => void;
}

const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_YEAR = new Date().getFullYear();

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function TeacherSalaryListModal({
  open,
  onOpenChange,
  teachers,
  isLoading = false,
  onTeacherSalaryPaid,
}: TeacherSalaryListModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // Reset search when modal opens/closes
  useEffect(() => {
    setSearchTerm("");
    setLoadingIds(new Set());
  }, [open]);

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleMarkPaid = (salary: TeacherSalary, teacherId: string) => {
    const loadingId = `${teacherId}-${salary.id}`;
    setLoadingIds((prev) => new Set([...prev, loadingId]));

    startTransition(async () => {
      try {
        const response = await fetch("/api/teacher-salary/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: teacherId,
            amount: salary.amount,
            month: salary.month,
            year: salary.year,
          }),
        });

        const json = await response.json();
        if (json?.success) {
          onTeacherSalaryPaid?.({
            teacherId,
            salaryId: salary.id,
            month: salary.month || CURRENT_MONTH,
            year: salary.year || CURRENT_YEAR,
          });
          toast.success("Salary marked as paid");
        } else {
          toast.error(json?.error || "Failed to mark as paid");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to mark as paid");
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(loadingId);
          return next;
        });
      }
    });
  };

  const getMonthYear = (month?: number | string, year?: number | string) => {
    if (!month || !year) return "";
    const monthStr = String(month);
    let monthNum = CURRENT_MONTH;
    let yearNum = CURRENT_YEAR;

    if (monthStr.includes("-")) {
      const parts = monthStr.split("-");
      yearNum = Number(parts[0]);
      monthNum = Number(parts[1]);
    } else {
      monthNum = Number(month);
      yearNum = Number(year);
    }

    return `${MONTHS[monthNum - 1]} ${yearNum}`;
  };

  const getTotalSalaries = (teacher: Teacher) => {
    const salaries = teacher.salaries || [];
    return salaries.reduce((acc, s) => acc + (s.amount || 0), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Teacher Salary History (Full Year)</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((teacher) => {
                  const salaries = teacher.salaries || [];
                  const totalAmount = getTotalSalaries(teacher);

                  return (
                    <Card key={teacher.id} className="p-4">
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center shrink-0">
                              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {teacher.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {teacher.email}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Total
                            </p>
                            <p className="text-lg font-semibold text-foreground">
                              PKR {totalAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {salaries.length > 0 ? (
                        <div className="space-y-2 border-t pt-3">
                          {salaries
                            .sort((a, b) => {
                              const aMonth = String(a.month);
                              const bMonth = String(b.month);
                              return bMonth.localeCompare(aMonth);
                            })
                            .map((salary) => {
                              const loadingId = `${teacher.id}-${salary.id}`;
                              const isLoading = loadingIds.has(loadingId);
                              const monthYear = getMonthYear(
                                salary.month,
                                salary.year,
                              );

                              return (
                                <div
                                  key={salary.id}
                                  className="flex items-center justify-between p-2 bg-secondary/50 rounded"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">
                                        {monthYear}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        PKR {(salary.amount || 0).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
                                        salary.status === "paid"
                                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400"
                                          : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400",
                                      )}
                                    >
                                      {salary.status === "paid" ? (
                                        <>
                                          <CheckCircle2 className="w-3 h-3" />
                                          Paid
                                        </>
                                      ) : (
                                        <>
                                          <AlertCircle className="w-3 h-3" />
                                          Unpaid
                                        </>
                                      )}
                                    </div>

                                    {salary.status === "unpaid" && (
                                      <Button
                                        onClick={() =>
                                          handleMarkPaid(salary, teacher.id)
                                        }
                                        disabled={isLoading || isPending}
                                        size="sm"
                                        className="gap-1"
                                      >
                                        {isLoading ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="w-3 h-3" />
                                        )}
                                        Pay
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No salary records
                        </p>
                      )}
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "No teachers found matching your search"
                      : "No teachers found"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

