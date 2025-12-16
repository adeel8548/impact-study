"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  Check,
  Loader2,
  CalendarClock,
  Clock,
} from "lucide-react";

interface SalaryRecord {
  id: string;
  amount: number;
  status: "paid" | "unpaid";
  month: number | string;
  year: number | string;
  paid_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface TeacherSalaryHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  teacherName: string;
}

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

const resolveMonthYear = (record: SalaryRecord) => {
  // Supports month stored as numeric or "YYYY-MM"
  if (typeof record.month === "string" && record.month.includes("-")) {
    const [yr, mon] = record.month.split("-");
    return {
      year: Number(record.year || yr),
      month: Number(mon),
    };
  }
  return {
    year: Number(record.year),
    month: Number(record.month),
  };
};

export function TeacherSalaryHistoryModal({
  open,
  onOpenChange,
  teacherId,
  teacherName,
}: TeacherSalaryHistoryModalProps) {
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && teacherId) {
      fetchSalaries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teacherId]);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/salaries?teacherId=${teacherId}&allMonths=true`
      );
      const data = await response.json();
      if (Array.isArray(data.salaries)) {
        setSalaries(data.salaries);

        const years = Array.from(
          new Set(
            data.salaries
              .map((s: SalaryRecord) => resolveMonthYear(s).year)
              .filter(Boolean)
          )
        ).sort((a, b) => Number(b) - Number(a));

        if (years.length > 0) {
          setSelectedYear((current) =>
            years.includes(current) ? current : Number(years[0])
          );
        }
      }
    } catch (error) {
      console.error("Failed to load salary history:", error);
    } finally {
      setLoading(false);
    }
  };

  const salaryMap = useMemo(() => {
    const map = new Map<string, SalaryRecord>();
    salaries.forEach((record) => {
      const { year, month } = resolveMonthYear(record);
      if (!year || !month) return;
      const key = `${year}-${month}`;
      if (!map.has(key)) {
        map.set(key, record);
      }
    });
    return map;
  }, [salaries]);

  const monthsForYear = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const key = `${selectedYear}-${month}`;
        const record = salaryMap.get(key);
        return { month, record };
      }),
    [salaryMap, selectedYear]
  );

  const availableYears = useMemo(
    () =>
      Array.from(
        new Set(
          salaries
            .map((s) => resolveMonthYear(s).year)
            .filter(Boolean)
            .concat(selectedYear)
        )
      ).sort((a, b) => Number(b) - Number(a)),
    [salaries, selectedYear]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-600" />
            <span>Salary History - {teacherName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-muted-foreground">Year</label>
          <select
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {monthsForYear.map(({ month, record }) => {
              const isPaid = record?.status === "paid";

              return (
                <Card
                  key={month}
                  className={`p-4 border-2 ${
                    isPaid
                      ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20"
                      : record
                      ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20"
                      : "border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <div className="flex flex-col items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {MONTHS[month - 1]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedYear}
                      </p>
                    </div>
                    {record ? (
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                        }`}
                      >
                        {isPaid ? (
                          <>
                            <Check className="w-3 h-3" /> Paid
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" /> Unpaid
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 whitespace-nowrap">
                        <Clock className="w-3 h-3" /> Not Added
                      </div>
                    )}
                  </div>

                  {record ? (
                    <div className="space-y-3 pt-2 border-t border-gray-200/50">
                      <div className="flex justify-between items-center gap-2">
                        {/* <span className="text-xs text-muted-foreground">
                          Amount:
                        </span> */}
                        <span className="font-bold text-lg text-foreground">
                          PKR {Number(record.amount || 0).toLocaleString()}
                        </span>
                      </div>
                      {isPaid && record.paid_date && (
                        <div className="flex justify-between items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            Date:
                          </span>
                          <span className="font-semibold text-sm text-green-700 dark:text-green-400">
                            {new Date(record.paid_date).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No salary record
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
