"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { FeePaymentModal } from "@/components/modals/fee-payment-modal";
import { YearlySummaryModal } from "@/components/modals/yearly-summary-modal";
import {
  MONTHS_SHORT,
  getCurrentMonth,
  getCurrentYear,
  formatCurrency,
} from "@/lib/utils";

interface Student {
  id: string;
  name: string;
  roll_number: string;
}

interface StudentFeesClientProps {
  students: Student[];
}

interface StudentFeeRecord {
  id: string;
  student_id: string;
  month: number;
  year: number;
  amount: number;
  status: "paid" | "unpaid";
  paid_date: string | null;
}

export function StudentFeesClient({ students }: StudentFeesClientProps) {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(
    students[0]?.id || null,
  );
  const [fees, setFees] = useState<StudentFeeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();
  const selectedStudentData = students.find((s) => s.id === selectedStudent);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentFees();
    }
  }, [selectedStudent]);

  const fetchStudentFees = async () => {
    if (!selectedStudent) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/fees?studentId=${selectedStudent}&allMonths=true`,
      );

      if (!response.ok) throw new Error("Failed to fetch fees");

      const data = await response.json();
      setFees(data.fees || []);
    } catch (error) {
      console.error("Error fetching fees:", error);
      setFees([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setRefreshing(true);
    await fetchStudentFees();
    setRefreshing(false);
  };

  // Get current month fee
  const currentMonthFee = fees.find(
    (f) => f.month === currentMonth && f.year === currentYear,
  );

  // Calculate statistics
  const paidFees = fees.filter((f) => f.status === "paid");
  const unpaidFees = fees.filter((f) => f.status === "unpaid");
  const totalCollected = paidFees.reduce((sum, f) => sum + f.amount, 0);
  const totalPending = unpaidFees.reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="space-y-6">
      {/* Student Selector */}
      <Card className="p-6">
        <div className="space-y-3">
          <label className="text-sm font-semibold">Select Student</label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {students.map((student) => (
              <Button
                key={student.id}
                variant={selectedStudent === student.id ? "default" : "outline"}
                className="text-left h-auto py-2"
                onClick={() => setSelectedStudent(student.id)}
              >
                <div className="text-xs">
                  <div className="font-semibold">{student.name}</div>
                  <div className="text-muted-foreground">
                    #{student.roll_number}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {selectedStudent && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {paidFees.length}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Unpaid</p>
                  <p className="text-2xl font-bold text-red-600">
                    {unpaidFees.length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Collected</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(totalCollected)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(totalPending)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
            </Card>
          </div>

          {/* Current Month Status */}
          {currentMonthFee && (
            <Card className="p-6 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Current Month ({MONTHS_SHORT[currentMonth - 1]}{" "}
                    {currentYear})
                  </h3>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        currentMonthFee.status === "paid"
                          ? "default"
                          : "destructive"
                      }
                      className="flex items-center gap-1"
                    >
                      {currentMonthFee.status === "paid" ? (
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
                    {currentMonthFee.amount > 0 && (
                      <span className="text-sm font-medium">
                        Amount: {formatCurrency(currentMonthFee.amount)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => setPaymentModalOpen(true)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Pay Fee
                </Button>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => setPaymentModalOpen(true)}
              variant="default"
              className="gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Record Payment
            </Button>
            <Button
              onClick={() => setSummaryModalOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              View All Month Fees
            </Button>
          </div>

          {/* Fees Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Payment Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : fees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No fee records found
                    </TableCell>
                  </TableRow>
                ) : (
                  fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">
                        {MONTHS_SHORT[fee.month - 1]} {fee.year}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(fee.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            fee.status === "paid" ? "default" : "destructive"
                          }
                          className="flex items-center gap-1 w-fit mx-auto"
                        >
                          {fee.status === "paid" ? (
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
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {fee.status === "paid" &&
                        fee.month === currentMonth &&
                        fee.year === currentYear &&
                        fee.paid_date
                          ? new Date(fee.paid_date).toLocaleDateString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Modals */}
          <FeePaymentModal
            open={paymentModalOpen}
            onOpenChange={setPaymentModalOpen}
            studentId={selectedStudent}
            studentName={selectedStudentData?.name}
            onPaymentSuccess={handlePaymentSuccess}
          />

          <YearlySummaryModal
            open={summaryModalOpen}
            onOpenChange={setSummaryModalOpen}
            type="fees"
            entityId={selectedStudent}
            entityName={selectedStudentData?.name}
          />
        </>
      )}
    </div>
  );
}
