"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2, Check, Clock } from "lucide-react";
import { updateFeeStatus } from "@/lib/actions/fees";
import { getStudentFees } from "@/lib/actions/fees";

interface StudentUnpaidFeesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  onPaid?: (payload: {
    studentId: string;
    month: number;
    year: number;
    paidDate: string;
  }) => void;
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
  onPaid,
}: StudentUnpaidFeesModalProps) {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(false);
  const [paying, setPayingId] = useState<string | null>(null);

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
      }
    } catch (error) {
      console.error("Error fetching fees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (
    feeId: string,
    month: number,
    year: number,
  ) => {
    setPayingId(feeId);
    try {
      // Use the actual payment date (today) instead of the 1st of the fee month
      const paidDate = new Date().toISOString();

      const result = await updateFeeStatus(feeId, "paid", paidDate);

      if (result.error) {
        console.error("Error updating fee status:", result.error);
      } else {
        // Update local state
        setFees(
          fees.map((f) =>
            f.id === feeId ? { ...f, status: "paid", paid_date: paidDate } : f,
          ),
        );

        const isCurrentMonth =
          month === currentMonth && year === currentYear && !!onPaid;
        if (isCurrentMonth && onPaid) {
          onPaid({
            studentId,
            month,
            year,
            paidDate,
          });
        }

        // Close modal after successful update
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error marking as paid:", error);
    } finally {
      setPayingId(null);
    }
  };

  // Determine the year to display based on current date
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // If we're in the last months of the year, we might want to show next year's fees
  // Otherwise show current year
  let displayYear = currentYear;

  // Create a map of existing fees for the display year (check both current and next year)
  const allFeesByYear = new Map<number, Map<number, Fee>>();
  fees.forEach((fee) => {
    if (!allFeesByYear.has(fee.year)) {
      allFeesByYear.set(fee.year, new Map());
    }
    allFeesByYear.get(fee.year)!.set(fee.month, fee);
  });

  // Check if we have fees for next year, if so, show next year by default
  if (allFeesByYear.has(currentYear + 1) && currentMonth >= 11) {
    displayYear = currentYear + 1;
  } else if (!allFeesByYear.has(displayYear)) {
    // If we have fees for current year, show it; otherwise check next year
    if (allFeesByYear.has(currentYear)) {
      displayYear = currentYear;
    } else if (allFeesByYear.size > 0) {
      // Use the year that has the most recent fees
      displayYear = Math.max(...allFeesByYear.keys());
    }
  }

  const feeMap = allFeesByYear.get(displayYear) || new Map();

  // Generate all 12 months for display year
  const monthsData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const fee = feeMap.get(month);
    return {
      month,
      year: displayYear,
      fee,
      isPaid: fee?.status === "paid",
    };
  });

  const unpaidCount = monthsData.filter((m) => !m.isPaid).length;
  const totalUnpaid = monthsData
    .filter((m) => !m.isPaid && m.fee)
    .reduce((sum, m) => sum + (m.fee?.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden border border-border shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span>
              Fees Overview {displayYear} - {studentName}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto pr-1 max-h-[78vh]">
            {unpaidCount > 0 && (
              <Card className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      Total Unpaid Fees
                    </p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                      PKR{" "}
                      {totalUnpaid.toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      Unpaid Months
                    </p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                      {unpaidCount}/12
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {unpaidCount === 0 && (
              <Card className="p-8 text-center bg-green-50 dark:bg-green-950">
                <Check className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                <p className="text-foreground font-semibold mb-1">
                  All Fees Paid!
                </p>
                <p className="text-sm text-muted-foreground">
                  All months are paid for {displayYear}
                </p>
              </Card>
            )}

            {/* Grid of all 12 months */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {monthsData.map((monthData) => {
                const fee = monthData.fee;
                const isPaid = monthData.isPaid;
                const isPayingThis = paying === fee?.id;

                return (
                  <Card
                    key={monthData.month}
                    className={`p-4 border-2 transition-colors ${
                      isPaid
                        ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                        : "border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/50"
                    }`}
                  >
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {MONTHS[monthData.month - 1]}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {monthData.year}
                        </p>
                      </div>

                      {fee ? (
                        <>
                          <div className="flex justify-between items-end">
                            <p className="text-sm text-muted-foreground">
                              Amount:
                            </p>
                            <p
                              className={`font-bold ${
                                isPaid
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              PKR {fee.amount.toLocaleString()}
                            </p>
                          </div>

                          {isPaid ? (
                            <div className="flex flex-col items-center justify-center gap-1 py-2 bg-green-100 dark:bg-green-900 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                  Paid
                                </span>
                              </div>
                              {fee?.paid_date && (
                                <span className="text-xs text-muted-foreground">
                                  Paid on{" "}
                                  {new Date(fee.paid_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleMarkAsPaid(
                                  fee.id,
                                  monthData.month,
                                  monthData.year,
                                )
                              }
                              disabled={isPayingThis}
                              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                            >
                              {isPayingThis ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Paying...
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3" />
                                  Mark Paid
                                </>
                              )}
                            </Button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Not Added
                          </span>
                        </div>
                      )}
                    </div>
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
