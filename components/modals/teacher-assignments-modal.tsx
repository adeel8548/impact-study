"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  teacherName?: string;
}

export function TeacherAssignmentsModal({
  open,
  onOpenChange,
  teacherId,
  teacherName,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/teachers/${teacherId}/assignments`);
        const json = await res.json();
        setAssignments(Array.isArray(json.assignments) ? json.assignments : []);
      } catch (err) {
        console.error("Failed to load assignments", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, teacherId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[90vh]  overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Assigned Subjects — {teacherName || "Teacher"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3 py-4">
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No assignments found.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {assignments.map((a) => (
                  <div key={a.id} className="p-3 border rounded">
                    <p className="text-sm font-medium">
                      {a.subject_name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Class: {a.class_name || "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
