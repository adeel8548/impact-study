"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Bell } from "lucide-react";
import Logo from "@/app/Assests/imgs/logo_2.png";
export function TeacherHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    router.push("/");
  };

  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("currentUser") || "{}")
      : {};

  const isActive = (path: string) => pathname === path;
  // treat paths that start with a base as active (e.g. /teacher/schedules?tab=quizzes)
  const isActiveStartsWith = (base: string) =>
    pathname === base || pathname.startsWith(base);

  return (
    <header className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10  rounded-lg flex items-center justify-center">
            <img
              src={Logo.src}
              alt="Impact Academy Logo"
              className="w-10 h-10"
            />
          </div>
          <div>
            <h1 className="font-bold text-foreground">
              {(user.email || "Teacher")
                .split("@")[0] // @ se pehle ka part
                .split(" ") // words me split
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)) // capitalize
                .join(" ")}{" "}
            </h1>

            <p className="text-xs text-muted-foreground">Teacher Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="gap-2 bg-transparent"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="flex gap-2 px-6 pb-4 overflow-x-auto border-t border-border">
        <Button
          variant="ghost"
          onClick={() => router.push("/teacher")}
          className={`rounded-none border-b-2 ${
            isActive("/teacher")
              ? "text-primary font-semibold border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          Dashboard
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push("/teacher/classes")}
          className={`rounded-none border-b-2 ${
            isActive("/teacher/classes")
              ? "text-primary font-semibold border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          Classes
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push("/teacher/attendance")}
          className={`rounded-none border-b-2 ${
            isActive("/teacher/attendance")
              ? "text-primary font-semibold border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          Attendance
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push("/teacher/my-attendance")}
          className={`rounded-none border-b-2 ${
            isActive("/teacher/my-attendance")
              ? "text-primary font-semibold border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          My Attendance
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push("/teacher/schedules?tab=quizzes")}
          className={`rounded-none border-b-2 ${
            isActiveStartsWith("/teacher/schedules")
              ? "text-primary font-semibold border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          Quizzes
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push("/teacher/chapters")}
          className={`rounded-none border-b-2 ${
            isActive("/teacher/chapters")
              ? "text-primary font-semibold border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          Exams Schedule
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push("/teacher/student-results")}
          className={`rounded-none border-b-2 ${
            isActiveStartsWith("/teacher/student-results")
              ? "text-primary font-semibold border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          Results
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push("/teacher/quiz-results")}
          className={`rounded-none border-b-2 ${
            isActiveStartsWith("/teacher/quiz-results")
              ? "text-primary font-semibold border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          Quiz Results
        </Button>
      </div>
    </header>
  );
}
