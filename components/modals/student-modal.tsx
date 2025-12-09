"use client";

import type React from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { createStudent, updateStudent } from "@/lib/actions/students";
import type { Student, Class as SchoolClass } from "@/lib/types";

interface StudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: any;
  classes: SchoolClass[];
  onSuccess: (payload: { classId: string }) => void;
}

export function StudentModal({
  open,
  onOpenChange,
  student,
  classes,
  onSuccess,
}: StudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: student?.name || "",
    roll_number: student?.roll_number || "",
    class_id: student?.class_id || "",
    email: student?.email || "",
    phone: student?.phone || "",
    guardian_name: student?.guardian_name || "",
    current_fees: "",
  });

  // <-- Add this useEffect here
  useEffect(() => {
    const feesAmount = student?.currentFee?.amount
      ? student.currentFee.amount.toString()
      : "";
    setFormData({
      name: student?.name || "",
      roll_number: student?.roll_number || "",
      class_id: student?.class_id || "",
      email: student?.email || "",
      phone: student?.phone || "",
      guardian_name: student?.guardian_name || "",
      current_fees: feesAmount,
    });
  }, [open, student?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (student) {
        const result = await updateStudent(student.id, {
          name: formData.name,
          roll_number: formData.roll_number,
          class_id: formData.class_id,
          email: formData.email,
          phone: formData.phone,
          guardian_name: formData.guardian_name,
          fees: formData.current_fees,
        });
        if (result.error) {
          setError(result.error);
        } else {
          onOpenChange(false);
          onSuccess({ classId: formData.class_id });
        }
      } else {
        const result = await createStudent({
          ...formData,
          fees: formData.current_fees,
        });
        if (result.error) {
          setError(result.error);
        } else {
          onOpenChange(false);
          onSuccess({ classId: formData.class_id });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {student ? "Edit Student" : "Add New Student"}
          </DialogTitle>
          <DialogDescription>
            {student
              ? "Update student information"
              : "Add a new student to the system"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Name *
            </label>
            <Input
              placeholder="Student name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Father/Guardian Name
            </label>
            <Input
              placeholder="Father name"
              value={formData.guardian_name}
              onChange={(e) =>
                setFormData({ ...formData, guardian_name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Roll Number *
            </label>
            <Input
              placeholder="Roll number"
              value={formData.roll_number}
              onChange={(e) =>
                setFormData({ ...formData, roll_number: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Class *
            </label>
            <Select
              value={formData.class_id}
              onValueChange={(value) =>
                setFormData({ ...formData, class_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Email
            </label>
            <Input
              type="email"
              placeholder="student@school.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Phone
            </label>
            <Input
              placeholder="Phone number"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Current Monthly Fees
            </label>
            <Input
              type="number"
              placeholder="Enter monthly fees amount"
              value={formData.current_fees}
              onChange={(e) =>
                setFormData({ ...formData, current_fees: e.target.value })
              }
              min="0"
              step="0.01"
            />
            {formData.current_fees && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                PKR {Number(formData.current_fees).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground flex-1 gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {student ? "Update Student" : "Create Student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
