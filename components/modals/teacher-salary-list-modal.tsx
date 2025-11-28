"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, User, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  salary?: {
    amount: number;
    status: "paid" | "unpaid";
  } | null;
}

interface TeacherSalaryListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: "paid" | "unpaid";
  teachers: Teacher[];
  isLoading?: boolean;
}

export function TeacherSalaryListModal({
  open,
  onOpenChange,
  status,
  teachers,
  isLoading = false,
}: TeacherSalaryListModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.salary?.status === status &&
      (teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const totalAmount = filteredTeachers.reduce(
    (acc, teacher) => acc + (Number(teacher.salary?.amount) || 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === "paid" ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Paid Teachers</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Unpaid Teachers</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Card className="p-4 bg-secondary/50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-semibold text-foreground">
                    PKR {totalAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Count</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {filteredTeachers.length}
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {teacher.name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {teacher.email}
                          </p>
                          {teacher.phone && (
                            <p className="text-xs text-muted-foreground">
                              {teacher.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-semibold text-foreground">
                          PKR {Number(teacher.salary?.amount || 0).toLocaleString()}
                        </p>
                        <div
                          className={cn(
                            "inline-flex items-center gap-1 mt-1 rounded-full px-2 py-1 text-xs font-semibold",
                            status === "paid"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400",
                          )}
                        >
                          {status === "paid" ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Paid
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              Unpaid
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "No teachers found matching your search"
                      : `No ${status} teachers`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
