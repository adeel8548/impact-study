"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Users,
  BookOpen,
  Briefcase,
  DollarSign,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AdminDashboardCharts } from "@/components/admin-dashboard-charts";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  students: number;
  teachers: number;
  classes: number;
  fees: {
    total: number;
    paid: number;
    pending: number;
  };
}

interface ChartData {
  monthlyFees: Array<{ month: string; collected: number }>;
  weeklyAttendance: Array<{ day: string; present: number; absent: number }>;
  feeStatus: Array<{ name: string; value: number }>;
  classDistribution: Array<{ name: string; students: number }>;
}

export function AdminDashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, chartsRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/dashboard/charts"),
        ]);

        if (!statsRes.ok || !chartsRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const statsData = await statsRes.json();
        const chartsData = await chartsRes.json();

        if (statsData.success) {
          setStats(statsData.stats);
        }

        if (chartsData.success) {
          setCharts(chartsData.charts);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard",
        );
        console.error("[v0] Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex gap-2 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">
                Total Students
              </p>
              <p className="text-3xl font-bold text-foreground">
                {stats?.students || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">
                Total Teachers
              </p>
              <p className="text-3xl font-bold text-foreground">
                {stats?.teachers || 0}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">
                Total Classes
              </p>
              <p className="text-3xl font-bold text-foreground">
                {stats?.classes || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">
                Fees Collected
              </p>
              <p className="text-3xl font-bold text-foreground">
                ₹{(stats?.fees.paid || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {charts && (
          <AdminDashboardCharts
            monthlyFeesData={charts.monthlyFees}
            attendanceData={charts.weeklyAttendance}
            feesStatusData={charts.feeStatus}
          />
        )}

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <Button className="w-full justify-start h-auto py-3 px-4 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900">
              <Users className="w-4 h-4 mr-2" />
              Add New Student
            </Button>
            <Button className="w-full justify-start h-auto py-3 px-4 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900">
              <Briefcase className="w-4 h-4 mr-2" />
              Add New Teacher
            </Button>
            <Button className="w-full justify-start h-auto py-3 px-4 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900">
              <DollarSign className="w-4 h-4 mr-2" />
              Collect Fees
            </Button>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {stats?.fees.pending || 0} students with pending fees
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
