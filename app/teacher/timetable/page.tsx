"use client";

import { useEffect, useState } from "react";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Calendar, Clock } from "lucide-react";

interface TimetableEntry {
  id: string;
  teacher_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number?: string;
  class_name?: string;
  subject_name?: string;
}

const DAYS = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];
const TIME_SLOTS = [
  "15:00", "15:30",
  "16:00", "16:30",
  "17:00", "17:30",
  "18:00", "18:30",
  "19:00"
];

const formatTo12Hour = (time: string) => {
  if (!time) return "";
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  if (Number.isNaN(hour) || !minuteStr) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const adjustedHour = ((hour + 11) % 12) + 1;
  return `${adjustedHour.toString().padStart(2, "0")}:${minuteStr} ${period}`;
};

export default function TeacherTimetablePage() {
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
      setTeacherName(user.name || "Teacher");

      const response = await fetch(`/api/timetable?teacher_id=${user.id}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch timetable");
      }

      const data = await response.json();
      const normalized = (data.timetable || []).map((t: any) => ({
        ...t,
        start_time: (t.start_time || "").slice(0, 5),
        end_time: (t.end_time || "").slice(0, 5),
      }));

      const filtered = user.id
        ? normalized.filter((t: any) => t.teacher_id === user.id)
        : normalized;

      setTimetable(filtered);
    } catch (error) {
      console.error("Error fetching timetable:", error);
      toast.error("Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  const getTimetableGrid = () => {
    const grid: { [key: string]: TimetableEntry | null } = {};

    DAYS.forEach(({ value }) => {
      TIME_SLOTS.forEach(time => {
        const key = `${value}-${time}`;
        const entry = timetable.find(
          e => e.day_of_week === value && e.start_time === time
        );
        grid[key] = entry || null;
      });
    });

    return grid;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TeacherHeader />
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const timetableGrid = getTimetableGrid();

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader />
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Timetable</h1>
              <p className="text-muted-foreground mt-1">
                Your weekly lecture schedule
              </p>
            </div>
          </div>

          {timetable.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No lectures scheduled yet. Contact admin for your timetable.
              </p>
            </Card>
          ) : (
            <Card className="p-6 overflow-x-auto">
              <div className="min-w-[1000px]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-border bg-primary/10 p-3 text-sm font-semibold sticky left-0 z-10">
                        Time
                      </th>
                      {DAYS.map((day) => (
                        <th
                          key={day.value}
                          className="border border-border bg-primary/10 p-3 text-sm font-semibold"
                        >
                          {day.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map(time => (
                      <tr key={time}>
                        <td className="border border-border bg-secondary p-2 text-sm font-medium sticky left-0 z-10">
                          {formatTo12Hour(time)}
                        </td>
                        {DAYS.map((day) => {
                          const key = `${day.value}-${time}`;
                          const entry = timetableGrid[key];

                          return (
                            <td
                              key={day.value}
                              className="border border-border p-2 align-top min-h-[70px]"
                            >
                              {entry && (
                                <div className="bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-950 border-l-4 border-blue-500 rounded p-3 shadow-sm">
                                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                    {entry.class_name}
                                  </div>
                                  <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                                    📚 {entry.subject_name}
                                  </div>
                                  <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTo12Hour(entry.start_time)} - {formatTo12Hour(entry.end_time)}
                                  </div>
                                  {entry.room_number && (
                                    <div className="text-xs text-blue-500 dark:text-blue-500 mt-1">
                                      📍 {entry.room_number}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Legend */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              📌 Quick Info
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Your complete weekly lecture schedule is shown above</li>
              <li>• Each cell shows the class, subject, time, and room number</li>
              <li>• Empty cells indicate free periods</li>
              <li>• Contact admin if you need changes to your timetable</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
