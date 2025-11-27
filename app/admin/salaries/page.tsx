"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { mockSalaries, mockTeachers } from "@/lib/mock-data"
import { Briefcase, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"

const COLORS = ["#3b82f6", "#ef4444"]

export default function SalaryManagement() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(11)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null")
    if (!user || user.role !== "admin") {
      router.push("/")
    } else {
      setIsLoading(false)
    }
  }, [router])

  if (isLoading) return null

  const monthSalaries = mockSalaries.filter((s) => s.month === selectedMonth)
  const paidCount = monthSalaries.filter((s) => s.status === "paid").length
  const unpaidCount = monthSalaries.filter((s) => s.status === "unpaid").length
  const totalPaid = monthSalaries.filter((s) => s.status === "paid").reduce((sum, s) => sum + s.amount, 0)
  const totalPending = monthSalaries.filter((s) => s.status === "unpaid").reduce((sum, s) => sum + s.amount, 0)

  const salaryStatusData = [
    { name: "Paid", value: paidCount },
    { name: "Unpaid", value: unpaidCount },
  ]

  const monthlySalaryData = [
    { month: "Aug", paid: 450000, pending: 50000 },
    { month: "Sep", paid: 455000, pending: 45000 },
    { month: "Oct", paid: 460000, pending: 40000 },
    { month: "Nov", paid: 465000, pending: 35000 },
  ]

  const salaryTrendData = [
    { month: "Aug", amount: 500000 },
    { month: "Sep", amount: 500000 },
    { month: "Oct", amount: 500000 },
    { month: "Nov", amount: 500000 },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div className="md:pl-64">
        <div className="p-4 md:p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Salary Management</h1>
              <p className="text-muted-foreground">Track and process teacher salaries</p>
            </div>
            <Button className="gap-2 bg-primary text-primary-foreground">
              <Briefcase className="w-4 h-4" />
              Process Salary
            </Button>
          </div>

          {/* Filter */}
          <Card className="p-4 mb-6">
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number.parseInt(e.target.value))}
                  className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2025, i).toLocaleString("default", { month: "long" })}
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
                  <p className="text-muted-foreground text-sm font-medium mb-1">Total Paid</p>
                  <p className="text-3xl font-bold text-foreground">₹{(totalPaid / 100000).toFixed(1)}L</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">Pending</p>
                  <p className="text-3xl font-bold text-foreground">₹{(totalPending / 1000).toFixed(0)}K</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">Teachers Paid</p>
                  <p className="text-3xl font-bold text-foreground">{paidCount}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">Pending</p>
                  <p className="text-3xl font-bold text-foreground">{unpaidCount}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Salary */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Monthly Salary Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlySalaryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis stroke="var(--color-muted-foreground)" />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }}
                    labelStyle={{ color: "var(--color-foreground)" }}
                  />
                  <Legend />
                  <Bar dataKey="paid" fill="var(--color-chart-1)" name="Paid" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="pending" fill="var(--color-chart-5)" name="Pending" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Salary Trend */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Salary Trend (Annual)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salaryTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis stroke="var(--color-muted-foreground)" />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }}
                    labelStyle={{ color: "var(--color-foreground)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    name="Total Salary"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Teachers Salary Table */}
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Teacher Salary Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-semibold text-foreground">Teacher Name</th>
                    <th className="text-left p-4 font-semibold text-foreground">Amount</th>
                    <th className="text-center p-4 font-semibold text-foreground">Status</th>
                    <th className="text-center p-4 font-semibold text-foreground">Paid Date</th>
                    <th className="text-center p-4 font-semibold text-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {monthSalaries?.map((salary) => {
                    const teacher = mockTeachers.find((t) => t.id === salary.teacherId)
                    return (
                      <tr key={salary.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                        <td className="p-4 text-foreground font-medium">{teacher?.name}</td>
                        <td className="p-4 text-foreground">₹{salary.amount.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              salary.status === "paid"
                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {salary.status.charAt(0).toUpperCase() + salary.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-4 text-center text-muted-foreground">
                          {salary.paidDate ? new Date(salary.paidDate).toLocaleDateString() : "-"}
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            size="sm"
                            className={`${
                              salary.status === "paid" ? "variant-outline" : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {salary.status === "paid" ? "Paid" : "Mark Paid"}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
