"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { sortByNewest } from "@/lib/utils";

const COLORS = ["#3b82f6", "#ef4444"];

interface FeeRecord {
  id: string;
  student_id: string;
  amount: number;
  paid: boolean;
  created_at: string;
  student_name?: string;
}

export default function FeesManagement() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/fees");
      if (!response.ok) throw new Error("Failed to fetch fees");
      const data = await response.json();
      setFees(sortByNewest(data.fees || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fees data");
      console.error("[v0] Fees error:", err);
    } finally {
      setLoading(false);
    }
  };

  const monthFees = fees.filter((f) => {
    const date = new Date(f.created_at);
    return date.getMonth() + 1 === selectedMonth;
  });

  const paidCount = monthFees.filter((f) => f.paid).length;
  const unpaidCount = monthFees.filter((f) => !f.paid).length;
  const totalCollected = monthFees
    .filter((f) => f.paid)
    .reduce((sum, f) => sum + f.amount, 0);
  const totalPending = monthFees
    .filter((f) => !f.paid)
    .reduce((sum, f) => sum + f.amount, 0);

  const feesStatusData = [
    { name: "Paid", value: paidCount },
    { name: "Unpaid", value: unpaidCount },
  ];

  const monthlyCollection = Array.from({ length: 6 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (5 - i));
    const monthNumber = month.getMonth() + 1;
    const monthFeeData = fees.filter((f) => {
      const date = new Date(f.created_at);
      return date.getMonth() + 1 === monthNumber;
    });
    return {
      month: month.toLocaleString("default", { month: "short" }),
      collected: monthFeeData
        .filter((f) => f.paid)
        .reduce((sum, f) => sum + f.amount, 0),
      pending: monthFeeData
        .filter((f) => !f.paid)
        .reduce((sum, f) => sum + f.amount, 0),
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className="md:pl-64 p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div className="md:pl-64">
        <div className="p-4 md:p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Fees Management
              </h1>
              <p className="text-muted-foreground">
                Track and manage student fees collection
              </p>
            </div>
            <Button className="gap-2 bg-primary text-primary-foreground">
              <DollarSign className="w-4 h-4" />
              Collect Fees
            </Button>
          </div>

          {error && (
            <div className="flex gap-2 p-4 bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Filter */}
          <Card className="p-4 mb-6">
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) =>
                    setSelectedMonth(Number.parseInt(e.target.value))
                  }
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2025, i).toLocaleString("default", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6 border-l-4 border-l-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">
                    Collected
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    ₹{totalCollected.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">
                    Pending
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    ₹{totalPending.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">
                    Paid Students
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {paidCount}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">
                    Unpaid Students
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {unpaidCount}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Collection */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">
                Monthly Collection Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyCollection}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                  />
                  <XAxis stroke="var(--color-muted-foreground)" />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                    }}
                    labelStyle={{ color: "var(--color-foreground)" }}
                  />
                  <Legend />
                  <Bar
                    dataKey="collected"
                    fill="var(--color-chart-1)"
                    name="Collected"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="pending"
                    fill="var(--color-chart-5)"
                    name="Pending"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Fees Status Pie */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">
                Fees Payment Status
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={feesStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {feesStatusData?.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Students Fees Table */}
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">
                Student Fees Details
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Amount
                    </th>
                    <th className="text-center p-4 font-semibold text-foreground">
                      Status
                    </th>
                    <th className="text-center p-4 font-semibold text-foreground">
                      Date
                    </th>
                    <th className="text-center p-4 font-semibold text-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthFees.slice(0, 8)?.map((fee) => (
                    <tr
                      key={fee.id}
                      className="border-b border-border hover:bg-secondary/50 transition-colors"
                    >
                      <td className="p-4 text-foreground font-medium">
                        ₹{fee.amount.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            fee.paid
                              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                              : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                          }`}
                        >
                          {fee.paid ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {new Date(fee.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <Button size="sm" variant="outline">
                          {fee.paid ? "View" : "Collect"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
