"use client";

import { useState, useTransition, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeacherSalaryCardProps {
  teacher: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    class_ids?: string[] | null;
    salary?: {
      amount: number;
      status: "paid" | "unpaid";
      paid_date?: string;
    } | null;
  };
  assignedClasses?: Array<{ id: string; name: string }>;
  // new prop to open assignments modal
  onViewAssignments?: () => void;
  inchargeClasses?: Array<{ id: string; name: string }>;
  onStatusChange?: (details: {
    status: "paid" | "unpaid";
    amount: number;
  }) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewAttendance?: () => void;
  onViewSalaryHistory?: () => void;
}

export function TeacherSalaryCard({
  teacher,
  assignedClasses = [],
  inchargeClasses = [],
  onStatusChange,
  onEdit,
  onDelete,
  onViewAttendance,
  onViewSalaryHistory,
  onViewAssignments,
}: TeacherSalaryCardProps) {
  const [status, setStatus] = useState<"paid" | "unpaid">(
    teacher.salary?.status ?? "unpaid"
  );
  const [isPending, startTransition] = useTransition();
  const salaryAmount = Number(teacher.salary?.amount ?? 0) || 0;

  useEffect(() => {
    console.log(
      `TeacherSalaryCard for ${teacher.name} received assignedClasses:`,
      assignedClasses
    );
  }, [assignedClasses, teacher.name]);

  const handleToggle = () => {
    startTransition(async () => {
      const response = await fetch("/api/teacher-salary/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacher.id,
          amount: teacher.salary?.amount ?? 0,
          // Note: month/year should ideally be passed here as well
          // but card doesn't have this info - it relies on current month
        }),
      });

      const json = await response.json();
      if (json?.success && json?.status) {
        console.log("[TeacherSalaryCard] Status toggled:", {
          teacherId: teacher.id,
          newStatus: json.status,
        });
        setStatus(json.status);
        onStatusChange?.({
          status: json.status,
          amount: salaryAmount,
        });
      } else {
        console.error(
          "[TeacherSalaryCard] Toggle failed:",
          json?.error || "Unknown error"
        );
      }
    });
  };

  // Disable button if already paid (can only mark unpaid or mark paid if unpaid)
  const isPaidDisabled = status === "paid";

  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {teacher.name}
          </h3>
          <p className="text-sm text-muted-foreground">{teacher.email}</p>
          {teacher.phone && (
            <p className="text-xs text-muted-foreground">{teacher.phone}</p>
          )}
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
            status === "paid"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          )}
        >
          {status === "paid" ? (
            <>
              <CheckCircle2 className="w-3 h-3" /> Paid
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3" /> Unpaid
            </>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Monthly Salary</p>
        <p className="text-2xl font-semibold text-foreground">
          PKR {salaryAmount.toLocaleString()}
        </p>
      </div>
      <div>
         <p className="text-sm text-muted-foreground">Assign Subjects</p>
          <Button
          size="sm"
          variant="outline"
          onClick={onViewAssignments}
          className="p-2"
          title="View assignments"
        >
          View
        </Button>
        {/* <div>
          <p className="text-sm text-muted-foreground">Paid Date</p>
          <p className="text-2xl font-semibold text-foreground">
            {(() => {
              const pd = teacher.salary?.paid_date;

              if (!pd) return "-";

              const paidDate = new Date(pd);
              const now = new Date();

              // Hide only if date is older than CURRENT month+year
              const isOlderMonth =
                paidDate.getFullYear() < now.getFullYear() ||
                (paidDate.getFullYear() === now.getFullYear() &&
                  paidDate.getMonth() < now.getMonth());

              if (isOlderMonth) return "-";

              return paidDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            })()}
          </p>
        </div> */}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Incharge Class(es)</p>
        {inchargeClasses && inchargeClasses.length > 0 ? (
          <div className="flex gap-2">
            {inchargeClasses.map((c) => (
              <span key={c.id} className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                {c.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-red-600 dark:text-red-400">No incharge class</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant={status === "paid" ? "outline" : "default"}
          onClick={handleToggle}
          disabled={isPending || isPaidDisabled}
          className="gap-2 flex-1"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Mark {status === "paid" ? "Unpaid" : "Paid"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onViewSalaryHistory}
          className="p-2"
          title="View salary history"
        >
          <DollarSign className="w-4 h-4" />
        </Button>
      
        <Button
          size="sm"
          variant="outline"
          onClick={onViewAttendance}
          className="p-2"
          title="View attendance"
        >
          <Calendar className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="p-2"
          title="Edit teacher"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDelete}
          className="p-2 text-red-600 hover:text-red-700"
          title="Delete teacher"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
