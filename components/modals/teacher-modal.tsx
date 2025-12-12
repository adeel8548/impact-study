"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { createTeacher, updateTeacher } from "@/lib/actions/teacher";

interface TeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    class_ids?: string[] | null;
  } | null;
  classes: { id: string; name: string }[];
  onSuccess?: () => void;
  initialSalary?: number;
}

export function TeacherModal({
  open,
  onOpenChange,
  teacher,
  classes,
  onSuccess,
  initialSalary,
}: TeacherModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showInchargeDropdown, setShowInchargeDropdown] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    salary: "",
    incharge_class_ids: [] as string[],
    assign_subjects: [] as Array<{ class_id: string; subject_id: string }> ,
  });

  const isEditing = !!teacher;

  useEffect(() => {
    if (teacher) {
      const resolvedSalary =
        typeof initialSalary === "number"
          ? String(initialSalary)
          : typeof (teacher as any)?.salary?.amount === "number"
            ? String((teacher as any).salary.amount)
            : "";
      setFormData({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone || "",
        password: "",
        salary: resolvedSalary,
        incharge_class_ids: (teacher as any).incharge_class_ids
          ? ((teacher as any).incharge_class_ids as string[])
          : (teacher as any).incharge_class_id
          ? [ (teacher as any).incharge_class_id ]
          : [],
        assign_subjects: (teacher as any).assign_subjects || [],
      });

      // If assign_subjects not provided on teacher prop, fetch from API
      (async () => {
        try {
            if (!(teacher as any).assign_subjects) {
            const res = await fetch(`/api/teachers/${teacher.id}/assignments`);
            const json = await res.json();
            const assigns = Array.isArray(json.assignments)
              ? json.assignments.map((a: any) => ({ class_id: a.class_id, subject_id: a.subject_id }))
              : [];
            setFormData((prev) => ({ ...prev, assign_subjects: assigns }));
          }
        } catch (err) {
          console.error("Failed to load teacher assign_subjects", err);
        }
      })();
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        salary: "",
        incharge_class_ids: [],
        assign_subjects: [],
      });
    }
  }, [teacher, open, initialSalary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const salaryValue = Number(formData.salary);
    if (!salaryValue || Number.isNaN(salaryValue) || salaryValue <= 0) {
      setLoading(false);
      setError("Salary must be greater than 0");
      return toast.error("Salary must be greater than 0");
    }

    try {
      if (isEditing) {
        const { error } = await updateTeacher(teacher.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          salary: salaryValue,
          incharge_class_ids: formData.incharge_class_ids || null,
          assign_subjects: formData.assign_subjects,
        });
        if (error) {
          setError(error);
          return toast.error(error);
        }

        toast.success("Teacher updated successfully");
      } else {
        if (!formData.password) {
          setError("Password is required for new teachers");
          return toast.error("Password is required for new teachers");
        }

        const { teacher: newTeacher, error } = await createTeacher({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          class_ids: [],
          salary: salaryValue,
          incharge_class_ids: formData.incharge_class_ids || null,
          assign_subjects: formData.assign_subjects,
        });

        if (error) {
          setError(error);
          return toast.error(error);
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

  // Subjects cache per class
  const [subjectsCache, setSubjectsCache] = useState<Record<string, any[]>>({});

  const fetchSubjectsForClass = async (classId: string) => {
    if (!classId) return [];
    if (subjectsCache[classId]) return subjectsCache[classId];
    try {
      const res = await fetch(`/api/classes/${classId}/subjects`);
      const json = await res.json();
      const list = Array.isArray(json.subjects) ? json.subjects : [];
      setSubjectsCache((prev) => ({ ...prev, [classId]: list }));
      return list;
    } catch (err) {
      console.error("Failed to fetch subjects for class", err);
      return [];
    }
  };

  // Ensure subjects cache is populated for existing assign_subjects entries
  useEffect(() => {
    const classIds = Array.from(
      new Set(formData.assign_subjects.map((s) => s.class_id).filter(Boolean)),
    );
    if (classIds.length === 0) return;

    classIds.forEach((cid) => {
      if (!subjectsCache[cid]) {
        fetchSubjectsForClass(cid).catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.assign_subjects]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[95vh] overflow-y-auto">
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
                setFormData({ ...formData, name: e.target.value })
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
                setFormData({ ...formData, email: e.target.value })
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
                setFormData({ ...formData, phone: e.target.value })
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
                    setFormData({ ...formData, password: e.target.value })
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
                setFormData({ ...formData, salary: e.target.value })
              }
              required
              disabled={loading}
              min="0"
              step="0.01"
            />
          </div>

          

          {/* Class Incharge multi-select */}
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
                              setFormData({
                                ...formData,
                                incharge_class_ids: [
                                  ...formData.incharge_class_ids,
                                  cls.id,
                                ],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                incharge_class_ids: formData.incharge_class_ids.filter(
                                  (id) => id !== cls.id
                                ),
                              });
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

              {/* Show selected classes as tags */}
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
                            setFormData({
                              ...formData,
                              incharge_class_ids: formData.incharge_class_ids.filter(
                                (id) => id !== classId
                              ),
                            });
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

          {/* Assign Subjects - dynamic list of class+subject pairs */}
          <div className="space-y-2">
            <Label>Assign Subjects</Label>
            <div className="space-y-2">
              {formData.assign_subjects.map((entry, idx) => (
                <div key={idx} className="flex gap-2">
                  <select
                    value={entry.class_id}
                    onChange={async (e) => {
                      const classId = e.target.value;
                      const next = [...formData.assign_subjects];
                      next[idx] = { class_id: classId, subject_id: "" };
                      setFormData({ ...formData, assign_subjects: next });
                      await fetchSubjectsForClass(classId);
                    }}
                    className="flex-1 px-2 py-1 border rounded"
                    disabled={loading}
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={entry.subject_id}
                    onChange={(e) => {
                      const next = [...formData.assign_subjects];
                      next[idx] = { ...next[idx], subject_id: e.target.value };
                      setFormData({ ...formData, assign_subjects: next });
                    }}
                    className="flex-1 px-2 py-1 border rounded"
                    disabled={loading || !entry.class_id}
                  >
                    <option value="">Select subject</option>
                    {(subjectsCache[entry.class_id] || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const next = formData.assign_subjects.filter((_, i) => i !== idx);
                      setFormData({ ...formData, assign_subjects: next });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      assign_subjects: [
                        ...formData.assign_subjects,
                        { class_id: "", subject_id: "" },
                      ],
                    })
                  }
                >
                  + Add class & subject
                </Button>
              </div>
            </div>
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
