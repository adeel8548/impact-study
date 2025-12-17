"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, BookOpen, Loader2, Search } from "lucide-react";

interface Class {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  roll_number: string;
  email?: string;
  phone?: string;
  class_id?: string;
}
interface CurrentUser {
  id: string;
  role: string;
  name?: string;
}

export default function TeacherClasses() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("currentUser");
      if (raw) {
        const parsed = JSON.parse(raw) as CurrentUser;
        setCurrentUser(parsed);
        if (parsed.id && parsed.role === "teacher") {
          loadTeacherData(parsed.id);
        }
      }
    } catch (err) {
      console.error("Failed to parse currentUser from localStorage", err);
    }
  }, []);

  const loadTeacherData = async (userId: string) => {
    try {
      setLoading(true);
      console.log("Fetching teacher data for:", userId);

      // Fetch classes and students for this teacher
      const response = await fetch(
        `/api/teachers/${userId}/classes-with-students`,
      );
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Teacher data response:", data);

      setClasses(data.classes || []);
      setStudents(data.students || []);

      if (data.classes && data.classes.length > 0) {
        setSelectedClass(data.classes[0]);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading teacher data:", error);
      toast.error("Failed to load classes and students");
      setLoading(false);
    }
  };

  const handleClassSelect = (cls: Class) => {
    setSelectedClass(cls);
    setSearchTerm("");
  };

  const filteredStudents = selectedClass
    ? students
        .filter((s) => s.class_id === selectedClass.id)
        .filter(
          (student) =>
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.roll_number
              .toLowerCase()
              .includes(searchTerm.toLowerCase()),
        )
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader />

      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            My Classes
          </h1>
          <p className="text-muted-foreground">
            View your assigned classes and students
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Classes Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-20">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Assigned Classes
              </h3>
              <div className="space-y-2">
                {classes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No classes assigned
                  </p>
                ) : (
                  classes.map((cls) => {
                    const classStudentCount = students.filter(
                      (s) => s.class_id === cls.id,
                    ).length;
                    return (
                      <Button
                        key={cls.id}
                        variant={
                          selectedClass?.id === cls.id ? "default" : "outline"
                        }
                        className="w-full justify-between"
                        onClick={() => handleClassSelect(cls)}
                      >
                        <span>{cls.name}</span>
                        <span className="text-xs bg-primary/20 px-2 py-1 rounded">
                          {classStudentCount}
                        </span>
                      </Button>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Students List */}
          <div className="lg:col-span-3">
            {selectedClass ? (
              <>
                <Card className="p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-1">
                        {selectedClass.name}
                      </h2>
                      <p className="text-muted-foreground">
                        Total Students: {filteredStudents.length}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students by name or roll number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Students Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-secondary border-b border-border">
                        <tr>
                          <th className="text-left p-4 font-semibold text-foreground">
                            Name
                          </th>
                          <th className="text-left p-4 font-semibold text-foreground">
                            Father Name
                          </th>
                          <th className="text-left p-4 font-semibold text-foreground">
                            Roll Number
                          </th>
                          {/* <th className="text-left p-4 font-semibold text-foreground">Class ID</th> */}
                          <th className="text-left p-4 font-semibold text-foreground">
                            Email
                          </th>
                          <th className="text-left p-4 font-semibold text-foreground">
                            Phone
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((student) => (
                            <tr
                              key={student.id}
                              className="border-b border-border hover:bg-secondary/50 transition-colors"
                            >
                              <td className="p-4 font-medium text-foreground">
                                {student.name}
                              </td>
                              <td className="p-4 font-medium text-foreground">
                                {student.guardian_name}
                              </td>
                              <td className="p-4 text-foreground">
                                {student.roll_number}
                              </td>
                              {/* <td className="p-4 text-foreground text-sm font-mono bg-secondary/30 rounded px-2 py-1">{selectedClass.id}</td> */}
                              <td className="p-4 text-muted-foreground">
                                {student.email || "-"}
                              </td>
                              <td className="p-4 text-muted-foreground">
                                {student.phone || "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-8 text-center text-muted-foreground"
                            >
                              No students found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">
                  No classes assigned to you yet
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
