"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2, Check, Clock } from "lucide-react";
import { getStudentFees } from "@/lib/actions/fees";

interface StudentUnpaidFeesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

interface Fee {
  id: string;
  student_id: string;
  month: number;
  year: number;
  amount: number;
  status: "paid" | "unpaid";
  paid_date?: string;
  created_at: string;
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

export function StudentUnpaidFeesModal({
  open,
  onOpenChange,
  studentId,
  studentName,
}: StudentUnpaidFeesModalProps) {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );

  // Fetch student fees when modal opens
  useEffect(() => {
    if (open && studentId) {
      fetchFees();
    }
  }, [open, studentId]);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const result = await getStudentFees(studentId);
      if (result.error) {
        console.error("Error fetching fees:", result.error);
      } else {
        setFees(result.fees || []);
        const years = Array.from(
          new Set((result.fees || []).map((f: Fee) => Number(f.year)))
        ).sort((a, b) => b - a);
        if (years.length > 0) {
          setSelectedYear((current) =>
            years.includes(current) ? current : Number(years[0])
          );
        }
      }
    } catch (error) {
      console.error("Error fetching fees:", error);
    } finally {
      setLoading(false);
    }
  };

  const allFeesByYear = useMemo(() => {
    const map = new Map<number, Map<number, Fee>>();
    fees.forEach((fee) => {
      if (!map.has(Number(fee.year))) {
        map.set(Number(fee.year), new Map());
      }
      map.get(Number(fee.year))!.set(Number(fee.month), fee);
    });
    return map;
  }, [fees]);

  const feeMap = allFeesByYear.get(selectedYear) || new Map();

  // Generate all 12 months for display year
  const monthsData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const fee = feeMap.get(month);
    return {
      month,
      year: selectedYear,
      fee,
      isPaid: fee?.status === "paid",
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden border border-border shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span>
              Fees Overview {selectedYear} - {studentName}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto pr-1 max-h-[78vh]">
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-muted-foreground">Year</label>
              <select
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {Array.from(allFeesByYear.keys())
                  .sort((a, b) => b - a)
                  .map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
              </select>
            </div>

            {/* Grid of all 12 months */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {monthsData.map((monthData) => {
                const fee = monthData.fee;
                const isPaid = monthData.isPaid;

                return (
                  <Card
                    key={monthData.month}
                    className={`p-4 border-2 transition-colors ${
                      isPaid
                        ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                        : "border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/50"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {MONTHS[monthData.month - 1]}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {monthData.year}
                        </p>
                      </div>
                      {fee ? (
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

                    {fee ? (
                      <div className="space-y-3 pt-2 border-t border-gray-200/50">
                        <div className="flex justify-between items-center gap-2">
                          {/* <span className="text-xs text-muted-foreground">
                            Amount:
                          </span> */}
                          <span className="font-bold text-lg text-foreground">
                            PKR {Number(fee.amount || 0).toLocaleString()}
                          </span>
                        </div>
                        {isPaid && fee?.paid_date && (
                          <div className="flex justify-between items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              Date:
                            </span>
                            <span className="font-semibold text-sm text-green-700 dark:text-green-400">
                              {new Date(fee.paid_date).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No fee record
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
