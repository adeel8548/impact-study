"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Assignment = {
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
};

interface TeacherAssignedSubjectsProps {
  assignments: Assignment[];
}

export function TeacherAssignedSubjects({
  assignments,
}: TeacherAssignedSubjectsProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, { class_id: string; class_name: string; subjects: Assignment[] }>();
    assignments.forEach((a) => {
      if (!map.has(a.class_id)) {
        map.set(a.class_id, {
          class_id: a.class_id,
          class_name: a.class_name,
          subjects: [],
        });
      }
      const entry = map.get(a.class_id)!;
      // ensure unique subject per class_id
      if (!entry.subjects.find((s) => s.subject_id === a.subject_id)) {
        entry.subjects.push(a);
      }
    });
    return Array.from(map.values());
  }, [assignments]);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const selected = grouped.find((g) => g.class_id === selectedClassId);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {grouped.map((cls) => (
          <div
            key={cls.class_id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/40 p-4 hover:bg-secondary/70 transition-colors"
          >
            <button
              type="button"
              className="text-left"
              onClick={() => setSelectedClassId(cls.class_id)}
            >
              <p className="text-sm text-muted-foreground">Class</p>
              <p className="text-lg font-semibold text-foreground underline">
                {cls.class_name}
              </p>
            </button>
            <p className="text-sm text-muted-foreground">
              {cls.subjects.length} subject(s)
            </p>
            <div className="flex flex-wrap gap-2">
              {cls.subjects.slice(0, 3).map((s) => (
                <span
                  key={s.subject_id}
                  className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                >
                  {s.subject_name}
                </span>
              ))}
              {cls.subjects.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{cls.subjects.length - 3} more
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedClassId(cls.class_id)}
                className="w-full"
              >
                View subjects
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelectedClassId(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {selected ? `Subjects for ${selected.class_name}` : "Subjects"}
            </DialogTitle>
          </DialogHeader>

          {selected && selected.subjects.length === 0 && (
            <p className="text-sm text-muted-foreground">No subjects assigned.</p>
          )}

          {selected && selected.subjects.length > 0 && (
            <div className="grid gap-2">
              {selected.subjects.map((s) => (
                <Link
                  key={s.subject_id}
                  href={`/teacher/student-results?classId=${s.class_id}&subjectId=${s.subject_id}`}
                  className="flex items-center justify-between rounded border border-border px-3 py-2 hover:bg-secondary/60 transition-colors"
                >
                  <span className="text-sm text-foreground">{s.subject_name}</span>
                  <span className="text-xs text-muted-foreground">View results</span>
                </Link>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
