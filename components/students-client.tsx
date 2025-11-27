"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit2, Trash2, User } from "lucide-react";
import { StudentModal } from "@/components/modals/student-modal";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";
import { FeeStatusButton } from "@/components/fee-status-button";
import { deleteStudent } from "@/lib/actions/students";
import type { Student, Class as SchoolClass } from "@/lib/types";

interface StudentsClientComponentProps {
  initialStudents: any[];
  classes: SchoolClass[];
  feeSummary?: { totalFees: number; paidFees: number; unpaidFees: number };
}

export function StudentsClientComponent({
  initialStudents,
  classes,
  feeSummary = { totalFees: 0, paidFees: 0, unpaidFees: 0 },
}: StudentsClientComponentProps) {
  const [students, setStudents] = useState(initialStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

  const filteredStudents = students?.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.roll_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !classFilter || student?.class_id === classFilter;
    return matchesSearch && matchesClass;
  });

  const handleOpenModal = (student?: Student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    window.location.reload();
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
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
              Total Fees
            </span>
            <span className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {feeSummary.totalFees.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
              })}
            </span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
              Paid
            </span>
            <span className="text-3xl font-bold text-green-900 dark:text-green-100">
              {feeSummary.paidFees.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
              })}
            </span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
              Unpaid
            </span>
            <span className="text-3xl font-bold text-red-900 dark:text-red-100">
              {feeSummary.unpaidFees.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
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
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes?.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls?.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="text-left p-4 font-semibold text-foreground">
                  Name
                </th>
                <th className="text-left p-4 font-semibold text-foreground">
                  Roll No.
                </th>
                <th className="text-left p-4 font-semibold text-foreground">
                  Class
                </th>
                <th className="text-left p-4 font-semibold text-foreground">
                  Email
                </th>

                <th className="text-center p-4 font-semibold text-foreground">
                  Fees Status
                </th>
                <th className="text-center p-4 font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents?.map((student) => {
                const studentClass = classes?.find(
                  (c) => c.id === student?.class_id,
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
                      {student?.roll_number}
                    </td>
                    <td className="p-4 text-foreground">
                      {studentClass?.name}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {student.email || "—"}
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
                            onStatusChange={() => window.location.reload()}
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No fees set
                        </span>
                      )}
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
    </>
  );
}
