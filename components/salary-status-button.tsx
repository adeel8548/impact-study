"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SalaryRow = {
  id: string;
  teacher_id: string;
  month: number;
  year: number;
  amount: number;
  status: "paid" | "unpaid";
  paid_date?: string | null;
};

interface SalaryStatusButtonProps {
  teacherId: string;
  onPaid?: () => void;
  buttonClassName?: string;
  schoolId?: string;
  teacherName?: string;
}

export function SalaryStatusButton({
  teacherId,
  onPaid,
  buttonClassName,
  schoolId,
  teacherName,
}: SalaryStatusButtonProps) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [salaries, setSalaries] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const loadUnpaidSalaries = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/salaries?teacherId=${teacherId}&status=unpaid&allMonths=true`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to load salaries (${res.status})`);
      }
      const data = await res.json();
      const fetched: SalaryRow[] = Array.isArray(data.salaries)
        ? data.salaries
        : [];
      setSalaries(fetched);

      // Default year to current if present, otherwise latest available
      const years = Array.from(new Set(fetched.map((f) => Number(f.year)))).sort(
        (a, b) => b - a,
      );
      if (years.length > 0) {
        setSelectedYear((current) => (years.includes(current) ? current : years[0]));
      }
    } catch (e) {
      console.error("Failed to load unpaid salaries", e);
      toast.error("Salaries could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!paymentModalOpen) return;
    loadUnpaidSalaries();
  }, [paymentModalOpen]);

  // Update default month when year or salaries change
  useEffect(() => {
    if (salaries.length === 0) {
      setSelectedMonth(null);
      return;
    }
    const currentMonth = new Date().getMonth() + 1;
    const unpaidForYear = salaries
      .filter((s) => Number(s.year) === Number(selectedYear))
      .sort((a, b) => Number(a.month) - Number(b.month));

    if (unpaidForYear.length === 0) {
      setSelectedMonth(null);
      return;
    }

    const hasCurrent = unpaidForYear.find(
      (s) => Number(s.month) === Number(currentMonth),
    );
    if (hasCurrent) {
      setSelectedMonth(Number(hasCurrent.month));
      return;
    }
    setSelectedMonth(Number(unpaidForYear[0].month));
  }, [salaries, selectedYear]);

  const unpaidOptions = useMemo(
    () =>
      salaries
        .filter((s) => s.status === "unpaid" && Number(s.year) === Number(selectedYear))
        .sort((a, b) => Number(a.month) - Number(b.month)),
    [salaries, selectedYear],
  );

  const selectedSalary = useMemo(
    () =>
      unpaidOptions.find(
        (s) => Number(s.month) === Number(selectedMonth ?? -1),
      ),
    [unpaidOptions, selectedMonth],
  );

  const handleMarkPaid = async () => {
    if (!selectedSalary) {
      toast.error("Please choose a pending month");
      return;
    }
    setPaying(true);
    try {
      const paidDate = new Date().toISOString();
      const response = await fetch("/api/salaries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedSalary.id,
          status: "paid",
          paid_date: paidDate,
          teacher_id: selectedSalary.teacher_id,
          month: selectedSalary.month,
          year: selectedSalary.year,
          amount: selectedSalary.amount,
          school_id: schoolId,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || `Failed to update salary status (${response.status})`);
        return;
      }
      toast.success("Salary marked as paid");
      setPaymentModalOpen(false);
      onPaid?.();
    } catch (e) {
      console.error("Failed to mark salary as paid", e);
      toast.error("Could not mark salary as paid");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setPaymentModalOpen(true)}
        className={cn(
          "gap-2 bg-blue-800 hover:bg-blue-900 text-white",
          buttonClassName,
        )}
      >
        pay Now
      </Button>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Pay Pending Salary
            </DialogTitle>
            <DialogDescription>
              {teacherName && (
                <span className="block font-medium border-2 p-2 rounded-md">
                  TeacherName: <span className="font-bold text-black">{teacherName}</span>
                </span>
              )}
              <span className="block text-muted-foreground">
                Select the pending month to mark as paid. Date will be saved as today.
              </span>
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : salaries.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">No pending salary found.</Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select
                    value={String(selectedYear)}
                    onValueChange={(val) => setSelectedYear(Number(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(salaries.map((s) => Number(s.year))))
                        .sort((a, b) => b - a)
                        .map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pending Month</Label>
                  <Select
                    value={selectedMonth ? String(selectedMonth) : ""}
                    onValueChange={(val) => setSelectedMonth(Number(val))}
                    disabled={unpaidOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {unpaidOptions.map((s) => (
                        <SelectItem key={s.id} value={String(s.month)}>
                          {new Date(0, Number(s.month) - 1).toLocaleString("en-US", {
                            month: "long",
                          })} {s.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {selectedSalary
                      ? `Paying ${new Date(0, Number(selectedSalary.month) - 1).toLocaleString("en-US", { month: "long" })} ${selectedSalary.year}`
                      : "Select a pending month"}
                  </span>
                </div>
                {selectedSalary && (
                  <div className="text-2xl font-semibold">
                    PKR {Number(selectedSalary.amount || 0).toLocaleString()}
                  </div>
                )}
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleMarkPaid} disabled={!selectedSalary || paying} className="gap-2">
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Mark Paid"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
