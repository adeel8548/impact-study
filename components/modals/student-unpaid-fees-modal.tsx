"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

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
          new Set((result.fees || []).map((f: Fee) => Number(f.year))),
        ).sort((a, b) => b - a);
        if (years.length > 0) {
          setSelectedYear((current) =>
            years.includes(current) ? current : Number(years[0]),
          );
        }
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

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

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

  useEffect(() => {
    if (!open) return;
    const yearMap = allFeesByYear.get(selectedYear);
    if (!yearMap || yearMap.size === 0) {
      setSelectedMonth(null);
      return;
    }

    const unpaidForYear = Array.from(yearMap.values()).filter(
      (fee) => fee.status === "unpaid",
    );
    if (unpaidForYear.length === 0) {
      setSelectedMonth(null);
      return;
    }

    const currentMonthFee = unpaidForYear.find(
      (fee) =>
        Number(fee.month) === currentMonth && Number(fee.year) === selectedYear,
    );
    if (currentMonthFee) {
      setSelectedMonth(Number(currentMonthFee.month));
      return;
    }

    const earliest = unpaidForYear
      .slice()
      .sort((a, b) => Number(a.month) - Number(b.month))[0];
    setSelectedMonth(Number(earliest.month));
  }, [allFeesByYear, selectedYear, open, currentMonth]);

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

  const unpaidCount = monthsData.filter((m) => !m.isPaid).length;
  const totalUnpaid = monthsData
    .filter((m) => !m.isPaid && m.fee)
    .reduce((sum, m) => sum + (m.fee?.amount || 0), 0);

  const unpaidOptions = monthsData.filter((m) => !m.isPaid && m.fee);
  const selectedFee = unpaidOptions.find(
    (m) => Number(m.month) === Number(selectedMonth ?? -1),
  );

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Year</Label>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(val) => setSelectedYear(Number(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(allFeesByYear.keys())
                      .sort((a, b) => b - a)
                      .map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
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
                    {unpaidOptions.map((opt) => (
                      <SelectItem key={opt.month} value={String(opt.month)}>
                        {MONTHS[opt.month - 1]} {opt.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Summary</Label>
                <Card className="p-3 text-sm">
                  {selectedFee ? (
                    <>
                      <div className="font-semibold">
                        {MONTHS[selectedFee.month - 1]} {selectedFee.year}
                      </div>
                      <div className="text-muted-foreground">
                        Amount: PKR{" "}
                        {Number(selectedFee.fee?.amount || 0).toLocaleString()}
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          disabled={
                            !selectedFee.fee || paying === selectedFee.fee?.id
                          }
                          onClick={() =>
                            selectedFee.fee &&
                            handleMarkAsPaid(
                              selectedFee.fee.id,
                              selectedFee.month,
                              selectedFee.year,
                            )
                          }
                          className="gap-2"
                        >
                          {paying === selectedFee.fee?.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Paying...
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3" />
                              Pay Selected
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">
                      Select a pending month to pay
                    </div>
                  )}
                </Card>
              </div>
            </div>

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
                  All months are paid for {selectedYear}
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
