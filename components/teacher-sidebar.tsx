"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  BookOpen,
  Clock,
  Briefcase,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Home,
  Notebook,
  Book,
  Clipboard,
  Calendar,
  BookMarked,
  BarChart,
} from "lucide-react";
import Logo from "@/app/Assests/imgs/logo_2.png";

const menuItems = [
  { href: "/teacher", label: "Dashboard", icon: Home },
  { href: "/teacher/classes", label: "My Classes", icon: Users },
  { href: "/teacher/attendance", label: "Attendance", icon: Clock },
  { href: "/teacher/chapters", label: "My Chapters", icon: Book },
  { href: "/teacher/study-schedule", label: "Study Schedule", icon: BookMarked },
  { href: "/teacher/chat", label: "Chat", icon: MessageSquare },
  { href: "/teacher/timetable", label: "Timetable", icon: Calendar },
  { href: "/teacher/quizzes", label: "Quizzes", icon: Notebook },
  { href: "/teacher/my-attendance", label: "My Attendance", icon: BarChart },
  { href: "/teacher/series-exams", label: "Series Exams", icon: Clipboard },
];

export function TeacherSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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

      try {
        const { getUnreadCountForUser } = await import("@/lib/firestore-chat");
        const totalUnread = await getUnreadCountForUser(userId);
        setUnreadCount(totalUnread);
      } catch (err) {
        console.error("Error getting unread count:", err);
      }
    });
  }, [supabase]);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-primary text-primary-foreground rounded-lg"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <nav
        className={`fixed left-0 top-0 h-screen w-64 bg-background border-r border-border transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 overflow-y-auto`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center gap-2">
          <img src={Logo.src} alt="Logo" className="w-10 h-10" />
          <span className="font-bold text-foreground">Impact Study</span>
        </div>

        {/* Menu Items */}
        <div className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.href === "/teacher/chat" && unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Logout Button */}
        <div className="absolute bottom-4 left-4 right-4">
          <Button
            onClick={handleLogout}
            className="w-full gap-2 bg-red-600 hover:bg-red-700"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
