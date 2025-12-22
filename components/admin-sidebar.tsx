"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  Users,
  BookOpen,
  Clock,
  DollarSign,
  Briefcase,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Home,
  Notebook,
  Book,
  Layers,
  Clipboard,
  Grid,
  FileText,
  Settings,
  Calendar,
  Trophy,
} from "lucide-react";
import Logo from "@/app/Assests/imgs/logo_2.png";
const menuItems = [
  // { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/teachers", label: "Teachers", icon: Briefcase },
  { href: "/admin/classes", label: "Classes", icon: Grid },
  { href: "/admin/attendance", label: "Attendance", icon: Clock },
  { href: "/admin/chat", label: "Chat", icon: MessageSquare },
  { href: "/admin/timetable", label: "Timetable", icon: Calendar },
  { href: "/admin/subjects", label: "Subjects", icon: Book },
  { href: "/admin/chapters", label: "Chapters Schedule ", icon: Layers },
  // { href: "/admin/revisions", label: "Revisions", icon: FileText },
  { href: "/admin/series-exams", label: " Schedules", icon: Clipboard },
  // { href: "/admin/quizzes", label: "Quizzes", icon: BookOpen },
  { href: "/admin/student-results", label: "Student Results", icon: Notebook },
  { href: "/admin/quiz-results", label: "Quiz Results", icon: Trophy },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  // { href: "/admin/fees", label: "Fees", icon: DollarSign },
  // { href: "/admin/salaries", label: "Salaries", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationIds, setConversationIds] = useState<string[]>([]);
  const supabase = useMemo(() => createClient(), []);

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

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;

      const { data: convs, error: convErr } = await supabase
        .from("conversations")
        .select("id")
        .eq("admin_id", userId);
      if (convErr) return;
      const ids = (convs || []).map((c) => c.id);
      setConversationIds(ids);

      if (ids.length > 0) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false)
          .neq("sender_id", userId)
          .in("conversation_id", ids);
        setUnreadCount(count || 0);
      }

      const channel = supabase
        .channel(`admin-messages-${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const row: any = payload.new;
            if (row.sender_id === userId) return;
            if (ids.includes(row.conversation_id)) setUnreadCount((c) => c + 1);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages" },
          (payload) => {
            const row: any = payload.new;
            if (row.is_read && row.sender_id !== userId && ids.includes(row.conversation_id)) {
              setUnreadCount((c) => Math.max(0, c - 1));
            }
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [supabase]);

  // Do not auto-signout on reload/close to avoid unintended logout
  // Users can use the explicit Logout button.

  return (
    <>
      <button
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-primary text-primary-foreground rounded-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-sidebar  border-r border-sidebar-border transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 border-b text-center border-sidebar-border">
          <div className="flex justify-center items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <img src={Logo.src} alt="SchoolHub Logo" className="w-10 h-10" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-sidebar-foreground">
            Impact Academy
          </h1>
        </div>

        <nav className="flex flex-col gap-1 p-4 flex-1 h-[380px] overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium flex items-center gap-2">
                  {item.label}
                  {item.href === "/admin/chat" && unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button
            onClick={handleLogout}
            className="w-full justify-center gap-2 bg-red-500 hover:bg-red-600 text-white"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}
