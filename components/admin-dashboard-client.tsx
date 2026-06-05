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
  monthlyFees: Array<{ month: string; collected: number; pending: number }>;
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
    <div className="relative">
      <div className="absolute -top-24 -left-24 h-72 w-72 bg-gradient-to-br from-blue-500/20 to-transparent blur-2xl rounded-full pointer-events-none" />
      <div className="absolute -top-28 -right-28 h-72 w-72 bg-gradient-to-br from-indigo-500/20 to-transparent blur-2xl rounded-full pointer-events-none" />

      <div className="relative">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-card/70 backdrop-blur border-border/60 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">
                  Total Students
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {stats?.students || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/0 border border-blue-500/25 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/70 backdrop-blur border-border/60 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">
                  Total Teachers
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {stats?.teachers || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/0 border border-indigo-500/25 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/70 backdrop-blur border-border/60 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">
                  Total Classes
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {stats?.classes || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/0 border border-green-500/25 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600 dark:text-green-300" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/70 backdrop-blur border-border/60 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">
                  Fees Overview
                </p>
                <p className="text-3xl font-bold text-foreground">
                  ₹{(stats?.fees.paid || 0).toLocaleString()}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    Paid: {stats?.fees.paid || 0}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    Pending: {stats?.fees.pending || 0}
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/0 border border-purple-500/25 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {charts && (
              <AdminDashboardCharts
                monthlyFeesData={charts.monthlyFees}
                attendanceData={charts.weeklyAttendance}
                feesStatusData={charts.feeStatus}
                classDistribution={charts.classDistribution}
              />
            )}
          </div>

          <Card className="p-6 bg-card/70 backdrop-blur border-border/60">
            <h3 className="text-lg font-bold text-foreground mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button className="w-full justify-start h-auto py-3 px-4 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900">
                <Users className="w-4 h-4 mr-2" />
                Add New Student
              </Button>
              <Button className="w-full justify-start h-auto py-3 px-4 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900">
                <Briefcase className="w-4 h-4 mr-2" />
                Add New Teacher
              </Button>
              <Button className="w-full justify-start h-auto py-3 px-4 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900">
                <DollarSign className="w-4 h-4 mr-2" />
                Collect Fees
              </Button>

              <div className="p-4 bg-yellow-50/60 dark:bg-yellow-950/40 rounded-xl border border-yellow-500/20 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                    Pending Fees
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stats?.fees.pending || 0} amount pending
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
