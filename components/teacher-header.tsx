"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Bell } from "lucide-react";
import Logo from "@/app/Assests/imgs/logo_2.png";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function TeacherHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [hasInchargeClasses, setHasInchargeClasses] = useState(false);
  const [hasAssignedSubjects, setHasAssignedSubjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const user =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("currentUser") || "{}")
            : {};

        if (!user.id) {
          setLoading(false);
          return;
        }

        // Fetch teacher's incharge_class_ids and assigned subjects
        const res = await fetch(`/api/teachers/${user.id}/permissions`);
        const json = await res.json();

        setHasInchargeClasses(
          Array.isArray(json.incharge_class_ids) &&
            json.incharge_class_ids.length > 0,
        );
        setHasAssignedSubjects(
          Array.isArray(json.assigned_subjects) &&
            json.assigned_subjects.length > 0,
        );
      } catch (err) {
        console.error("Failed to fetch teacher permissions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  useEffect(() => {
    const loadUnreadCount = async () => {
      const user =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("currentUser") || "{}")
          : {};
      
      const userId = user?.id;
      if (!userId) {
        console.log("No user ID found");
        return;
      }

      console.log("Loading unread count for user:", userId);

      try {
        // Import Firebase functions
        const { collection, query, where, onSnapshot } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        
        console.log("Firebase imported, setting up listeners");
        
        // Get all conversations where this teacher is involved
        const q = query(
          collection(db, "conversations"),
          where("teacherId", "==", userId)
        );
        
        const convSubsRef: Record<string, () => void> = {};
        
        const unsubscribe = onSnapshot(q, (snap) => {
          console.log("Conversations loaded:", snap.docs.length);
          const convIds = snap.docs.map(doc => doc.id);
          
          // Clean up subscriptions for removed conversations
          Object.keys(convSubsRef).forEach((id) => {
            if (!convIds.includes(id)) {
              convSubsRef[id]();
              delete convSubsRef[id];
            }
          });
          
          // Subscribe to unread messages for each conversation in real-time
          const unreadByConv: Record<string, number> = {};
          
          convIds.forEach((convId) => {
            if (convSubsRef[convId]) return; // Already subscribed
            
            console.log("Setting up unread listener for conversation:", convId);
            
            const msgsQ = query(
              collection(db, "conversations", convId, "messages"),
              where("isRead", "==", false)
            );
            
            convSubsRef[convId] = onSnapshot(msgsQ, (msgsSnap) => {
              // Count messages NOT from this teacher (i.e., from admin)
              let unread = 0;
              msgsSnap.docs.forEach(msgDoc => {
                if (msgDoc.data().senderId !== userId) {
                  unread++;
                }
              });
              
              unreadByConv[convId] = unread;
              
              // Calculate total unread from all conversations
              const totalUnread = Object.values(unreadByConv).reduce((sum, count) => sum + count, 0);
              console.log("Teacher header unread count updated:", totalUnread, "in conversation", convId);
              setUnreadCount(totalUnread);
            });
          });
          
          // If no conversations, set unread to 0
          if (convIds.length === 0) {
            console.log("No conversations found, setting unread to 0");
            setUnreadCount(0);
          }
        });
        
        return unsubscribe;
      } catch (err) {
        console.error("Error getting unread count:", err);
      }
    };
    
    let unsubscribe: (() => void) | undefined;
    
    loadUnreadCount().then((unsub) => {
      unsubscribe = unsub;
      console.log("Unread count listener setup complete");
    });
    
    return () => {
      if (unsubscribe) {
        console.log("Cleaning up unread count listeners");
        unsubscribe();
      }
    };
  }, []);

  const clearUser = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
  };

  const logoutEverywhere = async (keepalive = false) => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        keepalive,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Failed to sign out:", err);
    } finally {
      clearUser();
    }
  };

  const handleLogout = async () => {
    await logoutEverywhere();
    router.push("/");
  };

  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("currentUser") || "{}")
      : {};

  // Avoid auto-signout on reload/close; rely on explicit logout action

  const displayName = useMemo(() => {
    const metaName = (user as any)?.user_metadata?.name;
    if (metaName) return metaName;
    if (user?.name) return user.name;
    const emailName = (user?.email || "Teacher").split("@")[0];
    return emailName
      .split(" ")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }, [user]);

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
            <h1 className="font-bold text-foreground">{displayName}</h1>

            <p className="text-xs text-muted-foreground">Teacher Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/teacher/chat")}
            title="Messages"
            className="relative"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
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

        {/* Show Classes & Attendance only if teacher is incharge of classes */}
        {hasInchargeClasses && (
          <>
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
          </>
        )}

        {/* My Attendance - always visible */}
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
          onClick={() => router.push("/teacher/chat")}
          className={`rounded-none border-b-2 ${
            isActive("/teacher/chat")
              ? "text-primary font-semibold border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          Chat
        </Button>

          {/* Timetable - always visible */}
          <Button
            variant="ghost"
            onClick={() => router.push("/teacher/timetable")}
            className={`rounded-none border-b-2 ${
              isActive("/teacher/timetable")
                ? "text-primary font-semibold border-primary"
                : "text-muted-foreground hover:text-foreground border-transparent"
            }`}
          >
            Timetable
          </Button>

        {/* Show Quizzes, Exams, Results only if teacher has assigned subjects */}
        {hasAssignedSubjects && (
          <>
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
          </>
        )}
      </div>
    </header>
  );
}
