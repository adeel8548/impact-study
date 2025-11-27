"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Card } from "@/components/ui/card"

const COLORS = ["#3b82f6", "#52b788", "#f59e0b", "#ef4444", "#8b5cf6"]

interface AdminDashboardChartsProps {
  monthlyFeesData: Array<{ month: string; collected: number; pending: number }>
  attendanceData: Array<{ date: string; present: number; absent: number; leave: number }>
  feesStatusData: Array<{ name: string; value: number }>
}

export function AdminDashboardCharts({ monthlyFeesData, attendanceData, feesStatusData }: AdminDashboardChartsProps) {
  return (
    <>
      {/* Monthly Fees Collection */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Monthly Fees Collection</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyFeesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }}
              labelStyle={{ color: "var(--color-foreground)" }}
            />
            <Legend />
            <Bar dataKey="collected" fill="var(--color-chart-1)" name="Collected" radius={[8, 8, 0, 0]} />
            <Bar dataKey="pending" fill="var(--color-chart-5)" name="Pending" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Weekly Attendance */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Weekly Attendance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={attendanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }}
              labelStyle={{ color: "var(--color-foreground)" }}
            />
            <Legend />
            <Line type="monotone" dataKey="present" stroke="var(--color-chart-1)" strokeWidth={2} name="Present" />
            <Line type="monotone" dataKey="absent" stroke="var(--color-chart-5)" strokeWidth={2} name="Absent" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Fees Status */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Fees Payment Status</h3>
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
              {feesStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </>
  )
}
