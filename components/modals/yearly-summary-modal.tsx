"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { MONTHS, getCurrentYear, generateYearOptions } from "@/lib/utils";

interface YearlySummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "fees" | "salary"; // Type of summary
  entityId: string; // studentId or teacherId
  entityName?: string;
}

interface FeeOrSalaryRecord {
  id: string;
  month: number;
  year: number;
  status: "paid" | "unpaid";
  paid_date: string | null;
  amount?: number;
}

export function YearlySummaryModal({
  open,
  onOpenChange,
  type,
  entityId,
  entityName = type === "fees" ? "Student" : "Teacher",
}: YearlySummaryModalProps) {
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentYear());
  const [records, setRecords] = useState<FeeOrSalaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const years = generateYearOptions(5);
  const apiEndpoint = type === "fees" ? "/api/fees" : "/api/salaries";
  const queryParam = type === "fees" ? "studentId" : "teacherId";

  useEffect(() => {
    if (open) {
      fetchYearlyData();
    }
  }, [selectedYear, open]);

  const fetchYearlyData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${apiEndpoint}?${queryParam}=${entityId}&year=${selectedYear}&allMonths=true`
      );

      if (!response.ok) throw new Error("Failed to fetch yearly data");

      const data = await response.json();
      const recordsList =
        type === "fees" ? data.fees || [] : data.salaries || [];

      // Sort by month
      recordsList.sort((a: any, b: any) => a.month - b.month);

      setRecords(recordsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Count statistics
  const paidCount = records.filter((r) => r.status === "paid").length;
  const unpaidCount = records.filter((r) => r.status === "unpaid").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Yearly {type === "fees" ? "Fee" : "Salary"} Summary - {entityName}
          </DialogTitle>
          <DialogDescription>
            View all 12 months for {selectedYear}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Year Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Select Year</label>
            <Select value={String(selectedYear)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem
                    key={year}
                    value={String(year)}
                    onClick={() => setSelectedYear(year)}
                  >
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary Stats */}
          {!loading && records.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold text-primary">
                  {records.length}
                </div>
                <div className="text-xs text-muted-foreground">Total Months</div>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                <div className="text-2xl font-bold text-green-700">
                  {paidCount}
                </div>
                <div className="text-xs text-green-600">Paid</div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                <div className="text-2xl font-bold text-red-700">
                  {unpaidCount}
                </div>
                <div className="text-xs text-red-600">Unpaid</div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="rounded bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Monthly Table */}
          {!loading && records.length > 0 && (
            <div className="space-y-2 rounded-lg border overflow-hidden">
              <div className="grid grid-cols-3 gap-0 bg-slate-100 p-3 font-semibold text-sm">
                <div>Month</div>
                <div className="text-right">Status</div>
                <div className="text-right">Details</div>
              </div>

              {MONTHS.map((month, idx) => {
                const monthNum = idx + 1;
                const record = records.find((r) => r.month === monthNum);
                const isPaid = record?.status === "paid";

                return (
                  <div
                    key={monthNum}
                    className={`grid grid-cols-3 gap-0 border-t p-3 text-sm ${
                      isPaid ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <div className="font-medium">{month}</div>
                    <div className="flex justify-end">
                      <Badge
                        variant={isPaid ? "default" : "destructive"}
                        className="flex items-center gap-1 text-xs"
                      >
                        {isPaid ? (
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
                      </Badge>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {record && isPaid && record.paid_date
                        ? new Date(record.paid_date).toLocaleDateString()
                        : "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && records.length === 0 && !error && (
            <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
              No {type === "fees" ? "fee" : "salary"} records found for {selectedYear}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
