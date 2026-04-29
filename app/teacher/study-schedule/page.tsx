"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TeacherSidebar } from "@/components/teacher-sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, User, Clock } from "lucide-react";
import { toast } from "sonner";

interface StudyScheduleEntry {
  id: string;
  day: number;
  class_id?: string;
  subject_id?: string;
  subject: string;
  chapter: string;
  description: string;
  status: "Pending" | "In Progress" | "Completed";
  teacher_id?: string;
  teacher_name?: string;
  series_name: string;
  max_marks?: number;
  schedule_date?: string;
  start_time?: string;
  end_time?: string;
}

interface GroupedSchedule {
  [seriesName: string]: StudyScheduleEntry[];
}

type StatusFilter = "All" | "Pending" | "In Progress" | "Completed";

function resolveSeriesName(value?: string | null) {
  return value && value.trim() ? value.trim() : "Untitled Series";
}

function parseDateTime(date?: string, time?: string) {
  if (!date || !time) return null;
  const normalized = time.length === 5 ? `${time}:00` : time;
  const dt = new Date(`${date}T${normalized}`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function getEffectiveStatus(entry: StudyScheduleEntry) {
  if (entry.status === "Completed") return "Completed" as const;
  const startAt = parseDateTime(entry.schedule_date, entry.start_time);
  const endAt = parseDateTime(entry.schedule_date, entry.end_time);
  const now = Date.now();
  if (!startAt || !endAt) return entry.status;
  if (now < startAt.getTime()) return "Pending" as const;
  if (now >= startAt.getTime() && now < endAt.getTime()) {
    return "In Progress" as const;
  }
  if (now >= endAt.getTime()) return "Completed" as const;
  return entry.status;
}

export default function TeacherStudySchedulePage() {
  const supabase = useMemo(() => createClient(), []);
  const authResolvedRef = useRef(false);
  const scheduleLoadedRef = useRef(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [entries, setEntries] = useState<StudyScheduleEntry[]>([]);
  const [assignedSubjectIds, setAssignedSubjectIds] = useState<string[]>([]);
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<string>("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<StatusFilter>("All");

  // Get current user
  useEffect(() => {
    if (authResolvedRef.current) return;
    authResolvedRef.current = true;

    const localUser =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("currentUser") || "null")
        : null;

    if (localUser?.id) {
      setCurrentUserId(localUser.id);
      setCurrentUserName(localUser.name || "Teacher");
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user?.id) {
        setCurrentUserId(data.user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", data.user.id)
          .single();
        if (profile?.name) {
          setCurrentUserName(profile.name);
        }
      }
    });
  }, [supabase]);

  // Load study schedule
  useEffect(() => {
    if (!currentUserId || scheduleLoadedRef.current) {
      return;
    }

    scheduleLoadedRef.current = true;

    const loadSchedule = async () => {
      try {
        setIsLoading(true);
        const assignmentRes = await fetch(
          `/api/teachers/${currentUserId}/assignments`,
          { cache: "no-store" },
        );
        const assignmentJson = await assignmentRes.json();
        const assignments = Array.isArray(assignmentJson.assignments)
          ? assignmentJson.assignments
          : [];

        const subjectIds = Array.from(
          new Set(assignments.map((a: any) => a.subject_id).filter(Boolean)),
        ) as string[];
        const classIds = Array.from(
          new Set(assignments.map((a: any) => a.class_id).filter(Boolean)),
        ) as string[];
        setAssignedSubjectIds(subjectIds);
        setAssignedClassIds(classIds);

        const res = await fetch("/api/study-schedule", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load schedule");
        const body = await res.json();
        
        // Teacher sees entries for assigned subjects/classes.
        const allEntries = Array.isArray(body.data) ? body.data : [];
        const teacherEntries = allEntries.filter((e: StudyScheduleEntry) => {
          const bySubject = e.subject_id && subjectIds.includes(e.subject_id);
          const byClass = e.class_id && classIds.includes(e.class_id);
          const byTeacher = e.teacher_id && e.teacher_id === currentUserId;
          // Match entries if either the subject or the class is assigned to the teacher.
          // Previously required both which could hide valid entries/series.
          return Boolean(bySubject || byClass || byTeacher);
        });
        
        setEntries(teacherEntries);
        
        // Set first series as selected
        if (teacherEntries.length > 0) {
          const uniqueSeries = [
            ...new Set(
              teacherEntries.map((e: StudyScheduleEntry) => resolveSeriesName(e.series_name)),
            ),
          ];
          setSelectedSeries(uniqueSeries[0] as string);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load schedule");
      } finally {
        setIsLoading(false);
      }
    };

    void loadSchedule();
  }, [currentUserId]);

  // Group entries by series
  const groupedSchedule = useMemo(() => {
    const grouped: GroupedSchedule = {};
    entries.forEach((entry) => {
      const seriesName = resolveSeriesName(entry.series_name);
      if (!grouped[seriesName]) {
        grouped[seriesName] = [];
      }
      grouped[seriesName].push(entry);
    });

    // Sort by day within each series
    Object.keys(grouped).forEach((series) => {
      grouped[series].sort((a, b) => {
        if ((a.schedule_date || "") !== (b.schedule_date || "")) {
          return (a.schedule_date || "").localeCompare(b.schedule_date || "");
        }
        return a.day - b.day;
      });
    });

    return grouped;
  }, [entries]);

  const uniqueSeries = useMemo(() => {
    return Object.keys(groupedSchedule).sort();
  }, [groupedSchedule]);

  const selectedSchedule = selectedSeries ? groupedSchedule[selectedSeries] || [] : [];
  const filteredSelectedSchedule = useMemo(() => {
    if (selectedStatusFilter === "All") {
      return selectedSchedule;
    }

    return selectedSchedule.filter(
      (entry) => getEffectiveStatus(entry) === selectedStatusFilter,
    );
  }, [selectedSchedule, selectedStatusFilter]);

  const seriesLabels = useMemo(() => {
    return Object.fromEntries(
      Object.entries(groupedSchedule).map(([seriesName, rows]) => {
        const subjects = Array.from(
          new Set(rows.map((row) => row.subject).filter((value) => value && value.trim())),
        );

        return [
          seriesName,
          {
            subjects,
            label:
              subjects.length > 0
                ? `${seriesName} • ${subjects.join(", ")}`
                : seriesName,
          },
        ];
      }),
    ) as Record<string, { subjects: string[]; label: string }>;
  }, [groupedSchedule]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: filteredSelectedSchedule.length,
      completed: filteredSelectedSchedule.filter((e) => getEffectiveStatus(e) === "Completed").length,
      inProgress: filteredSelectedSchedule.filter((e) => getEffectiveStatus(e) === "In Progress").length,
      pending: filteredSelectedSchedule.filter((e) => getEffectiveStatus(e) === "Pending").length,
    };
  }, [filteredSelectedSchedule]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "In Progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Pending":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <TeacherSidebar />
        <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="inline-block animate-spin">
              <BookOpen className="w-8 h-8" />
            </div>
            <p className="text-muted-foreground">Loading schedule...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-linear-to-r from-blue-50 via-white to-indigo-50">
      <TeacherSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Study Schedule</h1>
              <p className="text-sm text-muted-foreground">
                {currentUserName && `Welcome back, ${currentUserName}`}
              </p>
            </div>
          </div>
        </div>

        <Card className="p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status Filter</label>
              <select
                value={selectedStatusFilter}
                onChange={(event) => setSelectedStatusFilter(event.target.value as StatusFilter)}
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Series / Subject</label>
              <div className="rounded border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
                {selectedSeries
                  ? seriesLabels[selectedSeries]?.label || selectedSeries
                  : "Select a series to see its subject name"}
              </div>
            </div>
          </div>
        </Card>

        {entries.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No schedule assigned yet</p>
            <p className="text-sm text-muted-foreground">
              Contact your administrator to get assigned to a study schedule
            </p>
          </Card>
        ) : (
          <>
            {/* Series Selector */}
            {uniqueSeries.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {uniqueSeries.map((series) => (
                  <button
                    key={series}
                    onClick={() => setSelectedSeries(series)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                      selectedSeries === series
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {seriesLabels[series]?.label || series}
                  </button>
                ))}
              </div>
            )}

            {/* Series Title & Stats */}
            {selectedSeries && (
              <>
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">
                      {seriesLabels[selectedSeries]?.label || selectedSeries}
                    </h2>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Chapters", value: stats.total, icon: "📚", color: "blue" },
                      { label: "Completed", value: stats.completed, icon: "✅", color: "green" },
                      { label: "In Progress", value: stats.inProgress, icon: "⏳", color: "yellow" },
                      { label: "Pending", value: stats.pending, icon: "📋", color: "red" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200"
                      >
                        <div className="text-2xl mb-2">{stat.icon}</div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schedule Cards */}
                <div className="grid gap-4">
                  {filteredSelectedSchedule.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">
                        No chapters match the selected filter in this series
                      </p>
                    </Card>
                  ) : (
                    filteredSelectedSchedule.map((entry) => (
                      (() => {
                        const effectiveStatus = getEffectiveStatus(entry);
                        return (
                      <Card
                        key={entry.id}
                        className={`p-6 border-l-4 hover:shadow-lg transition-all ${
                          effectiveStatus === "Completed"
                            ? "border-l-green-500 bg-green-50"
                            : effectiveStatus === "In Progress"
                            ? "border-l-yellow-500 bg-yellow-50"
                            : "border-l-red-500 bg-red-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            {/* Day Badge */}
                            <div className="flex items-center gap-3 mb-3">
                              <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
                                Day {entry.day}
                              </Badge>
                              <Badge className={`${getStatusColor(effectiveStatus)}`}>
                                {effectiveStatus}
                              </Badge>
                            </div>

                            {/* Subject & Chapter */}
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              {entry.subject}
                            </h3>
                            <p className="text-lg font-semibold text-gray-700 mb-2">
                              📖 {entry.chapter}
                            </p>

                            {/* Description */}
                            {entry.description && (
                              <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                                {entry.description}
                              </p>
                            )}

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-4">
                              {entry.schedule_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{entry.schedule_date}</span>
                                </div>
                              )}
                              {(entry.start_time || entry.end_time) && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {entry.start_time || "--:--"} - {entry.end_time || "--:--"}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Chapter {entry.day}</span>
                              </div>
                              {entry.max_marks !== undefined && (
                                <div className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  <span>Total Marks: {entry.max_marks}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                        );
                      })()
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Info Box */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-sm text-blue-900 mb-2">📚 Study Tips</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Follow the daily schedule for structured learning</li>
            <li>• Mark chapters as "In Progress" when you start studying</li>
            <li>• Update status to "Completed" when you finish the chapter</li>
            <li>• Refer back to descriptions for key topics to focus on</li>
          </ul>
        </Card>
      </main>
    </div>
  );
}
