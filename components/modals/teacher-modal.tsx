"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createTeacher, updateTeacher } from "@/lib/actions/teacher";
import { formatTo12Hour } from "@/lib/utils";

type SchoolClass = { id: string; name: string };
type SubjectOption = { id: string; name: string; class_id: string };
type AssignedSubject = { class_id: string; subject_id: string };
type AssignmentRow = { class_id: string; subject_ids: string[] };

interface TeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: any | null;
  classes: SchoolClass[];
  onSuccess?: () => void;
  initialSalary?: number;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  salary: string;
  joining_date: string;
  expected_time: string;
  incharge_class_ids: string[];
  assign_subjects: AssignedSubject[];
}

const EMPTY_ROW: AssignmentRow = { class_id: "", subject_ids: [] };

const toRows = (assignments: AssignedSubject[] = []) => {
  const grouped = new Map<string, Set<string>>();

  assignments.forEach(({ class_id, subject_id }) => {
    if (!class_id) return;
    if (!grouped.has(class_id)) grouped.set(class_id, new Set());
    if (subject_id) grouped.get(class_id)!.add(subject_id);
  });

  if (grouped.size === 0) return [EMPTY_ROW];

  return Array.from(grouped.entries()).map(([class_id, subjectIds]) => ({
    class_id,
    subject_ids: Array.from(subjectIds),
  }));
};

const toAssignments = (rows: AssignmentRow[]) =>
  rows
    .filter((row) => row.class_id)
    .flatMap((row) =>
      (row.subject_ids || []).map((subject_id) => ({
        class_id: row.class_id,
        subject_id,
      })),
    );

export function TeacherModal({
  open,
  onOpenChange,
  teacher,
  classes,
  onSuccess,
  initialSalary,
}: TeacherModalProps) {
  const isEditing = Boolean(teacher);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showInchargeDropdown, setShowInchargeDropdown] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [subjectsCache, setSubjectsCache] = useState<
    Record<string, SubjectOption[]>
  >({});

  const [formData, setFormData] = useState<FormState>({
    name: teacher?.name || "",
    email: teacher?.email || "",
    phone: teacher?.phone || "",
    password: "",
    salary:
      typeof (teacher as any)?.salary?.amount === "number"
        ? String((teacher as any).salary.amount)
        : typeof initialSalary === "number"
          ? String(initialSalary)
          : "",
    joining_date: (teacher as any)?.joining_date || "",
    expected_time: (teacher as any)?.expected_time || "",
    incharge_class_ids: Array.isArray((teacher as any)?.incharge_class_ids)
      ? (teacher as any).incharge_class_ids
      : [],
    assign_subjects: Array.isArray((teacher as any)?.assign_subjects)
      ? (teacher as any).assign_subjects
      : [],
  });

  const [assignRows, setAssignRows] = useState<AssignmentRow[]>(() =>
    toRows(
      Array.isArray((teacher as any)?.assign_subjects)
        ? (teacher as any).assign_subjects
        : [],
    ),
  );

  const fetchSubjectsForClass = async (classId: string) => {
    if (!classId) return [] as SubjectOption[];
    if (subjectsCache[classId]) return subjectsCache[classId];
    try {
      const res = await fetch(`/api/classes/${classId}/subjects`);
      const json = await res.json();
      const list = Array.isArray(json.subjects) ? json.subjects : [];
      setSubjectsCache((prev) => ({ ...prev, [classId]: list }));
      return list as SubjectOption[];
    } catch (err) {
      console.error("Failed to fetch subjects for class", err);
      return [] as SubjectOption[];
    }
  };

  useEffect(() => {
    if (!open) return;

    const initialAssign = Array.isArray((teacher as any)?.assign_subjects)
      ? (teacher as any).assign_subjects.filter(
          (row: AssignedSubject) => row.class_id && row.subject_id,
        )
      : [];

    const salaryValue = (teacher as any)?.salary?.amount
      ? String((teacher as any).salary.amount)
      : typeof initialSalary === "number"
        ? String(initialSalary)
        : "";

    setFormData({
      name: teacher?.name || "",
      email: teacher?.email || "",
      phone: teacher?.phone || "",
      password: "",
      salary: salaryValue,
      joining_date: (teacher as any)?.joining_date || "",
      expected_time: (teacher as any)?.expected_time || "",
      incharge_class_ids: Array.isArray((teacher as any)?.incharge_class_ids)
        ? (teacher as any).incharge_class_ids
        : [],
      assign_subjects: initialAssign,
    });

    const rows = toRows(initialAssign);
    setAssignRows(rows.length ? rows : [EMPTY_ROW]);
  }, [open, teacher?.id, initialSalary]);

  useEffect(() => {
    if (!open || !teacher?.id) return;
    if (
      Array.isArray((teacher as any)?.assign_subjects) &&
      (teacher as any).assign_subjects.length > 0
    )
      return;

    const loadAssignments = async () => {
      setAssignmentsLoading(true);
      try {
        const res = await fetch(`/api/teachers/${teacher.id}/assignments`);
        const json = await res.json();
        const normalized: AssignedSubject[] = Array.isArray(json.assignments)
          ? json.assignments
              .filter((row: any) => row.class_id && row.subject_id)
              .map((row: any) => ({
                class_id: row.class_id,
                subject_id: row.subject_id,
              }))
          : [];

        if (normalized.length > 0) {
          setFormData((prev) => ({ ...prev, assign_subjects: normalized }));
          const rows = toRows(normalized);
          setAssignRows(rows.length ? rows : [EMPTY_ROW]);
        }
      } catch (err) {
        console.error("Failed to load assignments", err);
      } finally {
        setAssignmentsLoading(false);
      }
    };

    loadAssignments();
  }, [open, teacher?.id]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      assign_subjects: toAssignments(assignRows),
    }));
  }, [assignRows]);

  useEffect(() => {
    const classIds = Array.from(
      new Set(assignRows.map((row) => row.class_id).filter(Boolean)),
    );

    classIds.forEach((cid) => {
      if (!subjectsCache[cid]) {
        fetchSubjectsForClass(cid).catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignRows]);

  const updateRowClass = async (idx: number, classId: string) => {
    const next = [...assignRows];
    next[idx] = { class_id: classId, subject_ids: [] };
    setAssignRows(next);
    if (classId) await fetchSubjectsForClass(classId);
  };

  const toggleSubject = (idx: number, subjectId: string) => {
    const next = [...assignRows];
    const current = new Set(next[idx].subject_ids);
    if (current.has(subjectId)) current.delete(subjectId);
    else current.add(subjectId);
    next[idx] = { ...next[idx], subject_ids: Array.from(current) };
    setAssignRows(next);
  };

  const removeRow = (idx: number) => {
    const next = assignRows.filter((_, i) => i !== idx);
    setAssignRows(next.length ? next : [EMPTY_ROW]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.email) {
      setError("Name and email are required");
      return;
    }

    if (!isEditing && !formData.password) {
      setError("Password is required for a new teacher");
      return;
    }

    const salaryValue = formData.salary ? Number(formData.salary) : undefined;
    if (formData.salary && (Number.isNaN(salaryValue) || salaryValue <= 0)) {
      setError("Salary must be greater than 0");
      return;
    }

    const payloadAssignments = toAssignments(assignRows);

    setLoading(true);

    try {
      if (isEditing && teacher) {
        const { error: updateError } = await updateTeacher(teacher.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          salary: salaryValue,
          incharge_class_ids: formData.incharge_class_ids,
          assign_subjects: payloadAssignments,
          joining_date: formData.joining_date,
          expected_time: formData.expected_time || null,
        });

        if (updateError) {
          setError(updateError);
          toast.error(updateError);
          return;
        }

        toast.success("Teacher updated successfully");
      } else {
        const { error: createError } = await createTeacher({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          class_ids: [],
          salary: salaryValue,
          joining_date: formData.joining_date,
          expected_time: formData.expected_time || null,
          incharge_class_ids: formData.incharge_class_ids || null,
          assign_subjects: payloadAssignments,
        });

        if (createError) {
          setError(createError);
          toast.error(createError);
          return;
        }

        toast.success("Teacher created successfully");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Teacher" : "Add New Teacher"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update teacher information below"
              : "Fill in the details to create a new teacher account"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <svg
                className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 9v4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 17h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Enter teacher's name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="teacher@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              disabled={loading}
            />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter initial password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="salary">Monthly Salary *</Label>
            <Input
              id="salary"
              type="number"
              placeholder="Enter salary amount"
              value={formData.salary}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, salary: e.target.value }))
              }
              required
              disabled={loading}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="joining_date">Joining Date</Label>
            <Input
              id="joining_date"
              type="date"
              value={formData.joining_date}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  joining_date: e.target.value,
                }))
              }
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_time">Expected Arrival Time</Label>
            <Input
              id="expected_time"
              type="time"
              placeholder="08:30"
              value={formData.expected_time}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  expected_time: e.target.value,
                }))
              }
              disabled={loading}
              title="Set the time when teacher is expected to arrive (e.g., 08:30). Attendance marked after 15 minutes will be marked as late."
            />
            {formData.expected_time && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                📍 {formatTo12Hour(formData.expected_time)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Time when teacher is expected. Attendance after 15 min will be marked as late.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Class Incharge (select multiple)</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowInchargeDropdown(!showInchargeDropdown)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-left flex items-center justify-between hover:bg-secondary/50 transition-colors"
                disabled={loading}
              >
                <span className="text-sm">
                  {formData.incharge_class_ids.length === 0
                    ? "Select classes..."
                    : `${formData.incharge_class_ids.length} class(es) selected`}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    showInchargeDropdown ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>

              {showInchargeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-border rounded-lg bg-background shadow-lg z-50">
                  <div className="max-h-48 overflow-y-auto">
                    {classes.map((cls) => (
                      <label
                        key={cls.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.incharge_class_ids.includes(cls.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData((prev) => ({
                                ...prev,
                                incharge_class_ids: [
                                  ...prev.incharge_class_ids,
                                  cls.id,
                                ],
                              }));
                            } else {
                              setFormData((prev) => ({
                                ...prev,
                                incharge_class_ids: prev.incharge_class_ids.filter(
                                  (id) => id !== cls.id,
                                ),
                              }));
                            }
                          }}
                          className="rounded"
                          disabled={loading}
                        />
                        <span className="text-sm">{cls.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.incharge_class_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.incharge_class_ids.map((classId) => {
                    const cls = classes.find((c) => c.id === classId);
                    return (
                      <div
                        key={classId}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                      >
                        <span>{cls?.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              incharge_class_ids: prev.incharge_class_ids.filter(
                                (id) => id !== classId,
                              ),
                            }));
                          }}
                          className="hover:text-blue-900 dark:hover:text-blue-200 ml-1"
                          disabled={loading}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign Subjects</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {assignRows.map((row, idx) => {
                const subjects = subjectsCache[row.class_id] || [];
                const subjectsLoading = row.class_id && !subjectsCache[row.class_id];

                return (
                  <div
                    key={`${row.class_id || "new"}-${idx}`}
                    className="flex h-full flex-col gap-3 rounded border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={row.class_id}
                        onChange={(e) => updateRowClass(idx, e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        disabled={loading}
                      >
                        <option value="">Select class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>

                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => removeRow(idx)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>

                    {row.class_id ? (
                      <div className="flex flex-1 flex-col gap-2">
                        {assignmentsLoading || subjectsLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading subjects...
                          </div>
                        ) : subjects.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No subjects found for this class.
                          </p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {subjects.map((subject) => (
                              <label
                                key={subject.id}
                                className="flex items-center gap-2 rounded border border-border px-3 py-2 hover:bg-secondary/50 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={row.subject_ids.includes(subject.id)}
                                  onChange={() => toggleSubject(idx, subject.id)}
                                  className="rounded"
                                  disabled={loading}
                                />
                                <span className="text-sm">{subject.name}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {row.subject_ids.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {row.subject_ids.map((sid) => {
                              const subject = subjects.find((s) => s.id === sid);
                              return (
                                <span
                                  key={sid}
                                  className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs"
                                >
                                  {subject?.name || "Subject"}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Select a class to load its subjects.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setAssignRows((prev) => [...prev, EMPTY_ROW])}
              disabled={loading}
            >
              + Add class & subjects
            </Button>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? "Update" : "Create"} Teacher
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
