"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";
import { StudentModal } from "@/components/modals/student-modal";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";
import { StudentFeesListModal } from "@/components/modals/student-fees-list-modal";
import { StudentAttendanceViewModal } from "@/components/modals/student-attendance-view-modal";
import { StudentUnpaidFeesModal } from "@/components/modals/student-unpaid-fees-modal";
import { FeeStatusButton } from "@/components/fee-status-button";
import { deleteStudent } from "@/lib/actions/students";
import type { Student, Class as SchoolClass } from "@/lib/types";

interface StudentsClientComponentProps {
  initialStudents: any[];
  classes: SchoolClass[];
  feeSummary?: { totalFees: number; paidFees: number; unpaidFees: number };
}

const normalizeClassName = (value?: string) =>
  value?.trim().toLowerCase() ?? "";
const CLASS_FILTER_STORAGE_KEY = "studentsClassFilter";
const preferredClassOrder = ["10th", "9th", "pre 9th", "8th", "pre 8th", "7th"];

export function StudentsClientComponent({
  initialStudents,
  classes = [],
  feeSummary = { totalFees: 0, paidFees: 0, unpaidFees: 0 },
}: StudentsClientComponentProps) {
  const [students, setStudents] = useState(initialStudents);
  const [searchTerm, setSearchTerm] = useState("");

  const classOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    preferredClassOrder.forEach((name, index) =>
      map.set(normalizeClassName(name), index)
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

  const defaultClassId = useMemo(() => {
    const ten = sortedClasses.find(
      (cls) => normalizeClassName(cls?.name) === normalizeClassName("10th")
    )?.id;
    return ten ? String(ten) : "";
  }, [sortedClasses]);

  const [classFilter, setClassFilter] = useState<string>("");

  const persistClassFilter = useCallback((value: string) => {
    setClassFilter(value);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(CLASS_FILTER_STORAGE_KEY, value);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedValue =
      window.sessionStorage.getItem(CLASS_FILTER_STORAGE_KEY) || "";
    if (storedValue) {
      setClassFilter(storedValue);
    } else if (defaultClassId) {
      setClassFilter(defaultClassId);
      window.sessionStorage.setItem(CLASS_FILTER_STORAGE_KEY, defaultClassId);
    }
  }, [defaultClassId]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [feesListModalOpen, setFeesListModalOpen] = useState(false);
  const [feesListStatus, setFeesListStatus] = useState<"paid" | "unpaid">(
    "paid"
  );
  const [unpaidFeesModalOpen, setUnpaidFeesModalOpen] = useState(false);
  const [selectedStudentForUnpaidFees, setSelectedStudentForUnpaidFees] =
    useState<Student | null>(null);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedStudentForAttendance, setSelectedStudentForAttendance] =
    useState<Student | null>(null);

  const filteredStudents = students?.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.roll_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass =
      !classFilter || String(student?.class_id) === classFilter;
    return matchesSearch && matchesClass;
  });

  const orderedStudents = useMemo(() => {
    if (!filteredStudents) return [];

    const getTimestamp = (student: any) =>
      new Date(student?.created_at || student?.createdAt || 0).getTime();

    return [...filteredStudents].sort((a, b) => {
      const dateDiff = getTimestamp(b) - getTimestamp(a);
      if (dateDiff !== 0) return dateDiff;

      const classA = classes?.find((cls) => cls.id === a?.class_id);
      const classB = classes?.find((cls) => cls.id === b?.class_id);
      const rankA =
        classOrderMap.get(normalizeClassName(classA?.name)) ??
        preferredClassOrder.length;
      const rankB =
        classOrderMap.get(normalizeClassName(classB?.name)) ??
        preferredClassOrder.length;

      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
    });
  }, [filteredStudents, classes, classOrderMap]);

  const handleOpenModal = (student?: Student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleSuccess = (payload?: { classId?: string }) => {
    if (payload?.classId) {
      persistClassFilter(String(payload.classId));
    }
    setModalOpen(false);
  };

  const handleDeleteClick = (studentId: string) => {
    setStudentToDelete(studentId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (studentToDelete) {
      await deleteStudent(studentToDelete);
      setStudents(students?.filter((s) => s.id !== studentToDelete));
      setDeleteModalOpen(false);
      setStudentToDelete(null);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1">
          <Button
            onClick={() => handleOpenModal()}
            className="gap-2 bg-primary text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Fee Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6 bg-white border-2 border-gray-100 ">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
              Total Fees
            </span>
            <span className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {feeSummary.totalFees.toLocaleString("en-US", {
                style: "currency",
                currency: "PkR",
                minimumFractionDigits: 0,
              })}
            </span>
          </div>
        </Card>

        <Card
          className="p-6 bg-white border-2 border-gray-100 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setFeesListStatus("paid");
            setFeesListModalOpen(true);
          }}
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
              Paid
            </span>
            <span className="text-3xl font-bold text-green-900 dark:text-green-100">
              {feeSummary.paidFees.toLocaleString("en-US", {
                style: "currency",
                currency: "PKR",
                minimumFractionDigits: 0,
              })}
            </span>
          </div>
        </Card>

        <Card
          className="p-6  bg-white border-2 border-gray-100 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setFeesListStatus("unpaid");
            setFeesListModalOpen(true);
          }}
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
              Unpaid
            </span>
            <span className="text-3xl font-bold text-red-900 dark:text-red-100">
              {feeSummary.unpaidFees.toLocaleString("en-US", {
                style: "currency",
                currency: "PKR",
                minimumFractionDigits: 0,
              })}
            </span>
          </div>
        </Card>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or roll number..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <select
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
            value={classFilter}
            onChange={(e) => persistClassFilter(e.target.value)}
          >
            <option value="">All Classes</option>
            {sortedClasses?.map((cls) => (
              <option key={cls.id} value={String(cls.id)}>
                {cls?.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto h-[70vh]">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border sticky top-0">
              <tr>
                <th className="text-left p-4 font-semibold text-foreground">
                  Name
                </th>
                <th className="text-left p-4 font-semibold text-foreground">
                  Father Name
                </th>
                <th className="text-left p-4 font-semibold text-foreground">
                  Roll No.
                </th>
                <th className="text-left p-4 font-semibold text-foreground">
                  Class
                </th>

                <th className="text-left p-4 font-semibold text-foreground">
                  Phone
                </th>
                <th className="text-center p-4 font-semibold text-foreground">
                  Current Fees Status
                </th>
                <th className="text-center p-4 font-semibold text-foreground">
                  All Month Fees
                </th>
                 <th className="text-center p-4 font-semibold text-foreground">
                  Attendance
                </th>
                <th className="text-center p-4 font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {orderedStudents?.map((student) => {
                const studentClass = classes?.find(
                  (c) => c.id === student?.class_id
                );
                return (
                  <tr
                    key={student.id}
                    className="border-b border-border hover:bg-secondary/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-foreground">
                          {student.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-foreground">
                      {student?.guardian_name || "—"}
                    </td>
                    <td className="p-4 text-foreground">
                      {student?.roll_number}
                    </td>
                    <td className="p-4 text-foreground">
                      {studentClass?.name}
                    </td>

                    <td className="p-4 text-foreground">
                      {student?.phone || "—"}
                    </td>
                    <td className="p-4">
                      {student.currentFee ? (
                        <div className="flex flex-col ">
                          <span className="font-medium text-foreground">
                            PKR {student.currentFee.amount}
                          </span>
                          <FeeStatusButton
                            feeId={student.currentFee.id}
                            studentId={student.id}
                            initialStatus={student.currentFee.status}
                            onStatusChange={() => {
                              // Refresh the specific student's data
                              setStudents(
                                students.map((s) =>
                                  s.id === student.id
                                    ? {
                                        ...s,
                                        currentFee: {
                                          ...s.currentFee,
                                          status:
                                            student.currentFee.status === "paid"
                                              ? "unpaid"
                                              : "paid",
                                        },
                                      }
                                    : s
                                )
                              );
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No fees set
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedStudentForUnpaidFees(student);
                          setUnpaidFeesModalOpen(true);
                        }}
                        className="gap-1 bg-background"
                        title="View unpaid fees"
                      >
                        View Fees
                      </Button>
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedStudentForAttendance(student);
                          setAttendanceModalOpen(true);
                        }}
                        className="gap-1 bg-transparent"
                        title="View attendance"
                      >
                        View Attendance
                      </Button>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenModal(student)}
                          className="gap-1 bg-transparent"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteClick(student.id)}
                          className="gap-1 text-red-600 hover:text-red-700 bg-transparent"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredStudents?.length === 0 && (
        <Card className="p-8 text-center">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No students found</p>
        </Card>
      )}

      <StudentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        student={selectedStudent}
        classes={classes}
        onSuccess={handleSuccess}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Student"
        description="Are you sure you want to delete this student? This action cannot be undone."
        onConfirm={handleConfirmDelete}
      />

      <StudentFeesListModal
        open={feesListModalOpen}
        onOpenChange={setFeesListModalOpen}
        status={feesListStatus}
        students={students}
        classes={classes}
      />

      {selectedStudentForAttendance && (
        <StudentAttendanceViewModal
          open={attendanceModalOpen}
          onOpenChange={setAttendanceModalOpen}
          studentId={selectedStudentForAttendance.id}
          studentName={selectedStudentForAttendance.name}
          studentClass={classes.find(
            (c) => c.id === (selectedStudentForAttendance as any).class_id
          )}
        />
      )}

      {selectedStudentForUnpaidFees && (
        <StudentUnpaidFeesModal
          open={unpaidFeesModalOpen}
          onOpenChange={setUnpaidFeesModalOpen}
          studentId={selectedStudentForUnpaidFees.id}
          studentName={selectedStudentForUnpaidFees.name}
        />
      )}
    </>
  );
}
