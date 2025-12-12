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
import { SalaryPaymentModal } from "@/components/modals/salary-payment-modal";
import { YearlySummaryModal } from "@/components/modals/yearly-summary-modal";
import {
  MONTHS_SHORT,
  getCurrentMonth,
  getCurrentYear,
  formatCurrency,
} from "@/lib/utils";

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface TeacherSalaryClientProps {
  teachers: Teacher[];
}

interface TeacherSalaryRecord {
  id: string;
  teacher_id: string;
  month: number;
  year: number;
  amount: number;
  status: "paid" | "unpaid";
  paid_date: string | null;
}

export function TeacherSalaryClient({ teachers }: TeacherSalaryClientProps) {
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(
    teachers[0]?.id || null,
  );
  const [salaries, setSalaries] = useState<TeacherSalaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();
  const selectedTeacherData = teachers.find((t) => t.id === selectedTeacher);

  useEffect(() => {
    if (selectedTeacher) {
      fetchTeacherSalaries();
    }
  }, [selectedTeacher]);

  const fetchTeacherSalaries = async () => {
    if (!selectedTeacher) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/salaries?teacherId=${selectedTeacher}&allMonths=true`,
      );

      if (!response.ok) throw new Error("Failed to fetch salaries");

      const data = await response.json();
      setSalaries(data.salaries || []);
    } catch (error) {
      console.error("Error fetching salaries:", error);
      setSalaries([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setRefreshing(true);
    await fetchTeacherSalaries();
    setRefreshing(false);
  };

  // Get current month salary
  const currentMonthSalary = salaries.find(
    (s) => s.month === currentMonth && s.year === currentYear,
  );

  // Calculate statistics
  const paidSalaries = salaries.filter((s) => s.status === "paid");
  const unpaidSalaries = salaries.filter((s) => s.status === "unpaid");
  const totalPaid = paidSalaries.reduce((sum, s) => sum + s.amount, 0);
  const totalPending = unpaidSalaries.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6">
      {/* Teacher Selector */}
      <Card className="p-6">
        <div className="space-y-3">
          <label className="text-sm font-semibold">Select Teacher</label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {teachers.map((teacher) => (
              <Button
                key={teacher.id}
                variant={selectedTeacher === teacher.id ? "default" : "outline"}
                className="text-left h-auto py-2"
                onClick={() => setSelectedTeacher(teacher.id)}
              >
                <div className="text-xs">
                  <div className="font-semibold">{teacher.name}</div>
                  <div className="text-muted-foreground truncate">
                    {teacher.email}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {selectedTeacher && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {paidSalaries.length}
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
                    {unpaidSalaries.length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(totalPaid)}
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
          {currentMonthSalary && (
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
                        currentMonthSalary.status === "paid"
                          ? "default"
                          : "destructive"
                      }
                      className="flex items-center gap-1"
                    >
                      {currentMonthSalary.status === "paid" ? (
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
                    {currentMonthSalary.amount > 0 && (
                      <span className="text-sm font-medium">
                        Amount: {formatCurrency(currentMonthSalary.amount)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => setPaymentModalOpen(true)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Pay Salary
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
              View All Month Salaries
            </Button>
          </div>

          {/* Salaries Table */}
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
                ) : salaries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No salary records found
                    </TableCell>
                  </TableRow>
                ) : (
                  salaries.map((salary) => (
                    <TableRow key={salary.id}>
                      <TableCell className="font-medium">
                        {MONTHS_SHORT[salary.month - 1]} {salary.year}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(salary.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            salary.status === "paid" ? "default" : "destructive"
                          }
                          className="flex items-center gap-1 w-fit mx-auto"
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
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {salary.status === "paid" &&
                        salary.month === currentMonth &&
                        salary.year === currentYear &&
                        salary.paid_date
                          ? new Date(salary.paid_date).toLocaleDateString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Modals */}
          <SalaryPaymentModal
            open={paymentModalOpen}
            onOpenChange={setPaymentModalOpen}
            teacherId={selectedTeacher}
            teacherName={selectedTeacherData?.name}
            onPaymentSuccess={handlePaymentSuccess}
          />

          <YearlySummaryModal
            open={summaryModalOpen}
            onOpenChange={setSummaryModalOpen}
            type="salary"
            entityId={selectedTeacher}
            entityName={selectedTeacherData?.name}
          />
        </>
      )}
    </div>
  );
}
