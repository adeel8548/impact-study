"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit2, Trash2, Briefcase, Loader2 } from "lucide-react";
import { TeacherModal } from "@/components/modals/teacher-modal";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";
import { deleteTeacher } from "@/lib/actions/teacher";
import { toast } from "sonner";
import { getClasses } from "@/lib/actions/classes";
interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  school_id: string;
  created_at: string;
}

export default function TeacherManagement() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<Record<string, any[]>>(
    {},
  );
  const [classes, setClasses] = useState<any[]>([]);

  // Modal states
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!user || user.role !== "admin") {
      router.push("/");
    } else {
      loadTeachers();
      loadClasses();
    }
  }, [router]);

  const loadClasses = async () => {
    try {
      const res = await fetch(`/api/classes`);
      const json = await res.json();
      setClasses(json.classes || []);
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  };

  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/teachers`);
      const json = await res.json();
      console.log("Teachers API response:", json);
      const data = json.teachers || [];
      setTeachers(data);
      console.log("Loaded teachers:", data);
      // Load classes for each teacher using API route
      const classesData: Record<string, any[]> = {};
      await Promise.all(
        data.map(async (teacher: any) => {
          try {
            const res2 = await fetch(
              `/api/teachers/classes?teacherId=${teacher.id}`,
            );
            const json2 = await res2.json();
            classesData[teacher.id] = json2.classes || [];
          } catch (err) {
            console.error(
              "Failed to load classes for teacher",
              teacher.id,
              err,
            );
            classesData[teacher.id] = [];
          }
        }),
      );
      setTeacherClasses(classesData);
    } catch (error) {
      console.error("Failed to load teachers:", error);
      toast.error("Failed to load teachers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTeacher = () => {
    setSelectedTeacher(null);
    setTeacherModalOpen(true);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setTeacherModalOpen(true);
  };

  const handleDeleteClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTeacher) return;

    const { error } = await deleteTeacher(selectedTeacher.id);

    if (error) {
      toast.error("Failed to delete teacher");
      return;
    }

    toast.success("Teacher deleted successfully");
    loadTeachers();
  };

  const handleModalSuccess = () => {
    loadTeachers();
  };

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center">
  //       <Loader2 className="w-8 h-8 animate-spin text-primary" />
  //     </div>
  //   )
  // }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div className="md:pl-64">
        <div className="p-4 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Teacher Management
              </h1>
              <p className="text-muted-foreground">
                Manage and assign teachers to classes
              </p>
            </div>
            <Button
              onClick={handleAddTeacher}
              className="gap-2 bg-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4" />
              Add Teacher
            </Button>
          </div>

          {/* Search */}
          <Card className="p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </Card>

          {/* Teachers Grid */}
          {/* Teachers Grid or Loader */}
          <Card className="p-6">
            {isLoading ? (
              <div className="h-60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-sm text-muted-foreground">
                  Loading teachers...
                </span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTeachers?.map((teacher) => {
                    const assignedClasses = teacherClasses[teacher.id] || [];
                    return (
                      <Card
                        key={teacher.id}
                        className="p-6 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTeacher(teacher)}
                              className="gap-1 bg-transparent"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteClick(teacher)}
                              className="gap-1 text-red-600 hover:text-red-700 bg-transparent"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <h3 className="font-bold text-foreground mb-1 capitalize">
                          {teacher.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-1">
                          {teacher.email}
                        </p>
                        {teacher.phone && (
                          <p className="text-xs text-muted-foreground mb-4">
                            {teacher.phone}
                          </p>
                        )}

                        <div className="mt-4">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            Assigned Classes:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {assignedClasses.length > 0 ? (
                              assignedClasses.map((cls) => (
                                <span
                                  key={cls.id}
                                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded"
                                >
                                  {cls.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No classes assigned
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {filteredTeachers.length === 0 && (
                  <Card className="p-8 text-center">
                    <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">
                      {searchTerm
                        ? "No teachers found matching your search"
                        : "No teachers added yet"}
                    </p>
                  </Card>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Teacher Modal */}
      <TeacherModal
        open={teacherModalOpen}
        onOpenChange={setTeacherModalOpen}
        teacher={selectedTeacher}
        classes={classes}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Teacher"
        description={`Are you sure you want to delete ${selectedTeacher?.name}? This will remove their account and they will no longer be able to log in. This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
