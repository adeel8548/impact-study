"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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

interface Student {
  id: string;
  name: string;
  email: string;
  roll_number?: string;
  class_id: string;
  currentFee?: {
    id: string;
    student_id: string;
    amount: number;
    status: "paid" | "unpaid";
  } | null;
  allFees?: Array<{
    id: string;
    student_id: string;
    amount: number;
    status: "paid" | "unpaid";
    month: number;
    year: number;
    paid_date?: string;
  }>;
}

interface Class {
  id: string;
  name: string;
}

interface StudentFeesListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: "paid" | "unpaid";
  students: Student[];
  classes: Class[];
  isLoading?: boolean;
}

const normalizeClassName = (value?: string) => value?.trim().toLowerCase() ?? "";
const preferredClassOrder = [
  "10th",
  "9th",
  "pre 9th",
  "8th",
  "pre 8th",
  "7th",
];

export function StudentFeesListModal({
  open,
  onOpenChange,
  status,
  students,
  classes = [],
  isLoading = false,
}: StudentFeesListModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [loadingFees, setLoadingFees] = useState(false);
  const [studentFeesMap, setStudentFeesMap] = useState<
    Map<string, Student["allFees"]>
  >(new Map());
  const [feesLoaded, setFeesLoaded] = useState(false);

  const classOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    preferredClassOrder.forEach((name, index) =>
      map.set(normalizeClassName(name), index),
    );
    return map;
  }, []);

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const normalizedA = normalizeClassName(a?.name);
      const normalizedB = normalizeClassName(b?.name);
      const rankA = classOrderMap.get(normalizedA);
      const rankB = classOrderMap.get(normalizedB);

      if (rankA !== undefined && rankB !== undefined) {
        return rankA - rankB;
      }
      if (rankA !== undefined) return -1;
      if (rankB !== undefined) return 1;
      return normalizedA.localeCompare(normalizedB);
    });
  }, [classes, classOrderMap]);

  // Set default class on modal open
  useEffect(() => {
    if (open && !classFilter && sortedClasses.length > 0) {
      setClassFilter(sortedClasses[0].id);
    }
  }, [open, classFilter, sortedClasses]);

  // Load all fees for all students when modal opens (lazy load)
  useEffect(() => {
    if (!open || feesLoaded) return;

    const loadAllFees = async () => {
      setLoadingFees(true);
      try {
        const response = await fetch("/api/students/fees");
        const data = await response.json();

        if (data.fees && Array.isArray(data.fees)) {
          // Build a map of student_id -> array of fees
          const map = new Map<string, Student["allFees"]>();
          data.fees.forEach(
            (fee: {
              student_id: string;
              id: string;
              amount: number;
              status: string;
              month: number;
              year: number;
              paid_date?: string;
            }) => {
              if (!map.has(fee.student_id)) {
                map.set(fee.student_id, []);
              }
              map.get(fee.student_id)!.push({
                id: fee.id,
                student_id: fee.student_id,
                amount: fee.amount,
                status: fee.status as "paid" | "unpaid",
                month: fee.month,
                year: fee.year,
                paid_date: fee.paid_date,
              });
            },
          );
          setStudentFeesMap(map);
        }
      } catch (e) {
        console.error("Failed to load all student fees:", e);
      } finally {
        setLoadingFees(false);
        setFeesLoaded(true);
      }
    };

    loadAllFees();
  }, [open, feesLoaded]);

  const filteredStudents = students.filter((student) => {
    // Use allFees if loaded, otherwise fall back to currentFee
    const studentAllFees = studentFeesMap.get(student.id) || [];
    const feesToUse =
      studentAllFees.length > 0 ? studentAllFees : student.currentFee ? [student.currentFee] : [];

    // For filtering, check if ANY fee matches the status
    const matchesStatus = feesToUse.some((fee) => fee.status === status);
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !classFilter || String(student.class_id) === classFilter;
    return matchesStatus && matchesSearch && matchesClass;
  });

  const totalAmount = filteredStudents.reduce((acc, student) => {
    // Use allFees if loaded, otherwise fall back to currentFee
    const studentAllFees = studentFeesMap.get(student.id) || [];
    const feesToUse =
      studentAllFees.length > 0 ? studentAllFees : student.currentFee ? [student.currentFee] : [];

    const feesForStatus = feesToUse.filter((fee) => fee.status === status);
    return (
      acc +
      feesForStatus.reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0)
    );
  }, 0);

  const classLabel = sortedClasses.find((c) => c.id === classFilter)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === "paid" ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Students with Paid Fees</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Students with Unpaid Fees</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading || loadingFees ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-56">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <select
                className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All Classes</option>
                {sortedClasses?.map((cls) => (
                  <option key={cls.id} value={String(cls.id)}>
                    {cls?.name}
                  </option>
                ))}
              </select>
            </div>

            <Card className="p-4 bg-secondary/50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {classLabel ? `${classLabel} - ` : ""}Total Amount
                  </p>
                  <p className="text-2xl font-semibold text-foreground">
                    PKR {totalAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Count</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {filteredStudents.length}
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {student.name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {student.email}
                          </p>
                          {student.roll_number && (
                            <p className="text-xs text-muted-foreground">
                              Roll #: {student.roll_number}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-semibold text-foreground">
                          PKR {Number(student.currentFee?.amount || 0).toLocaleString()}
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
                      ? "No students found matching your search"
                      : `No ${status} students ${classLabel ? `in ${classLabel}` : ""}`}
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
