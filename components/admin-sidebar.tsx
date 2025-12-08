"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Users,
  BookOpen,
  Clock,
  DollarSign,
  Briefcase,
  LogOut,
  Menu,
  X,
  Home,
} from "lucide-react";
import { useState } from "react";
import Logo from "@/app/Assests/imgs/logo_2.png";
const menuItems = [
  // { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/teachers", label: "Teachers", icon: Briefcase },
  { href: "/admin/classes", label: "Classes", icon: BookOpen },
  { href: "/admin/attendance", label: "Attendance", icon: Clock },
  { href: "/admin/revisions", label: "Revisions", icon: BookOpen },
  { href: "/admin/series-exams", label: "Series Exams", icon: BarChart3 },
  { href: "/admin/quizzes", label: "Quizzes", icon: Home },
  // { href: "/admin/fees", label: "Fees", icon: DollarSign },
  // { href: "/admin/salaries", label: "Salaries", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    router.push("/");
  };

  return (
    <>
      <button
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-primary text-primary-foreground rounded-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 z-40 ${
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

        <nav className="flex flex-col gap-1 p-4 flex-1">
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
                <span className="font-medium">{item.label}</span>
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
