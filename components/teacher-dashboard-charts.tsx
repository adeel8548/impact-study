"use client";

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
} from "recharts";
import { Card } from "@/components/ui/card";

interface TeacherDashboardChartsProps {
  attendanceData: Array<{ date: string; present: number; absent: number }>;
  classDistribution: Array<{ name: string; students: number }>;
}

export function TeacherDashboardCharts({
  attendanceData,
  classDistribution,
}: TeacherDashboardChartsProps) {
  return (
    <>
      {/* Attendance Trend */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">
          Weekly Attendance Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={attendanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
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
            <Line
              type="monotone"
              dataKey="present"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              name="Present"
            />
            <Line
              type="monotone"
              dataKey="absent"
              stroke="var(--color-chart-5)"
              strokeWidth={2}
              name="Absent"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Class Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">
          Students per Class
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={classDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
              }}
              labelStyle={{ color: "var(--color-foreground)" }}
            />
            <Bar
              dataKey="students"
              fill="var(--color-chart-1)"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}
