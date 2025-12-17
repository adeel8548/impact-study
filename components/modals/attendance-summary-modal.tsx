"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

type StatusLetter = "P" | "A" | "L" | "-";

export interface AttendanceSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "student" | "teacher";
  title?: string;
  records: Array<{
    id?: string;
    student_id?: string;
    teacher_id?: string;
    date: string;
    status?: "present" | "absent" | "leave";
  }>;
  people: Array<{ id: string; name: string; roll_number?: string; email?: string }>;
  label?: string; // optional range label
}

export function AttendanceSummaryModal({
  open,
  onOpenChange,
  type,
  title,
  records,
  people,
  label,
}: AttendanceSummaryModalProps) {
  const { uniqueDates, perPerson, totals } = useMemo(() => {
    const dates = Array.from(new Set(records.map((r) => r.date))).sort();

    const per: Record<string, { name: string; dateStatus: Record<string, StatusLetter> }> = {};

    // Initialize from people list to show all rows
    people.forEach((p) => {
      per[p.id] = { name: p.name, dateStatus: {} };
    });

    records.forEach((r) => {
      const id = (type === "student" ? r.student_id : r.teacher_id) as string;
      if (!id) return;
      if (!per[id]) per[id] = { name: id, dateStatus: {} };
      const letter: StatusLetter = r.status === "present" ? "P" : r.status === "absent" ? "A" : r.status === "leave" ? "L" : "-";
      per[id].dateStatus[r.date] = letter;
    });

    const agg = records.reduce(
      (acc, r) => {
        if (r.status === "present") acc.present += 1;
        else if (r.status === "absent") acc.absent += 1;
        else if (r.status === "leave") acc.leaves += 1;
        else if (r.status === "late") acc.late += 1;
        return acc;
      },
      { present: 0, absent: 0, leaves: 0, late: 0 },
    );

    return { uniqueDates: dates, perPerson: per, totals: agg };
  }, [records, people, type]);

  const entries = useMemo(
    () => Object.entries(perPerson).sort((a, b) => a[1].name.localeCompare(b[1].name)),
    [perPerson],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {title || (type === "student" ? "Student Attendance Summary" : "Teacher Attendance Summary")}
            {label ? <span className="block text-xs text-muted-foreground mt-1">{label}</span> : null}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1 max-h-[72vh]">
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">
                {entries.length} {type === "student" ? "students" : "teachers"} × {uniqueDates.length} days
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">P</span>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">A</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">L</span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">-</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-secondary border-b border-border">
                    <th className="sticky left-0 z-10 bg-secondary text-left p-2 font-semibold">Name</th>
                    {uniqueDates.map((d) => (
                      <th key={d} className="text-center p-2 font-semibold" title={d}>
                        {d.split("-")[2]}
                      </th>
                    ))}
                    <th className="text-center p-2 font-semibold">P</th>
                    <th className="text-center p-2 font-semibold">A</th>
                    <th className="text-center p-2 font-semibold">L</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([id, info]) => {
                    const counts = uniqueDates.reduce(
                      (acc, d) => {
                        const s = info.dateStatus[d] || "-";
                        if (s === "P") acc.P += 1;
                        else if (s === "A") acc.A += 1;
                        else if (s === "L") acc.L += 1;
                        return acc;
                      },
                      { P: 0, A: 0, L: 0 },
                    );

                    return (
                      <tr key={id} className="border-b border-border hover:bg-secondary/40">
                        <td className="sticky left-0 bg-background p-2 font-medium whitespace-nowrap">{info.name}</td>
                        {uniqueDates.map((d) => {
                          const status = info.dateStatus[d] || "-";
                          const cls =
                            status === "P"
                              ? "bg-green-100 text-green-700"
                              : status === "A"
                              ? "bg-red-100 text-red-700"
                              : status === "L"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700";
                          return (
                            <td key={d} className="p-1 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-7 rounded font-semibold ${cls}`}>
                                {status}
                              </span>
                            </td>
                          );
                        })}
                        <td className="text-center p-2 font-semibold text-green-600">{counts.P}</td>
                        <td className="text-center p-2 font-semibold text-red-600">{counts.A}</td>
                        <td className="text-center p-2 font-semibold text-blue-600">{counts.L}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-xs text-muted-foreground">Total Days</p>
              <p className="text-lg font-bold text-gray-700">{uniqueDates.length}</p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <p className="text-xs text-muted-foreground">Total Present</p>
              <p className="text-lg font-bold text-green-600">{totals.present}</p>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <p className="text-xs text-muted-foreground">Total Absent</p>
              <p className="text-lg font-bold text-red-600">{totals.absent}</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <p className="text-xs text-muted-foreground">Total Leaves</p>
              <p className="text-lg font-bold text-blue-600">{totals.leaves}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
