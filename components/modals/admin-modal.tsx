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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createAdmin, updateAdmin } from "@/lib/actions/auth";

interface AdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin?: {
    id: string;
    name: string;
    email: string;
  } | null;
  schoolId: string;
  onSuccess?: () => void;
}

export function AdminModal({
  open,
  onOpenChange,
  admin,
  schoolId,
  onSuccess,
}: AdminModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const isEditing = !!admin;

  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name,
        email: admin.email,
        password: "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        password: "",
      });
    }
  }, [admin, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        const { error } = await updateAdmin(admin.id, {
          name: formData.name,
          email: formData.email,
        });
        if (error) return toast.error(error);
        toast.success("Admin updated successfully");
      } else {
        if (!formData.password)
          return toast.error("Password is required for new admins");

        const { error } = await createAdmin({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          school_id: schoolId,
        });

        if (error) return toast.error(error);
        toast.success("Admin created successfully");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Admin" : "Add New Admin"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update admin information below"
              : "Fill in the details to create a new admin account"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Enter admin's name"
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
              placeholder="admin@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              disabled={loading}
            />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter initial password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          )}

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
              {isEditing ? "Update" : "Create"} Admin
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
