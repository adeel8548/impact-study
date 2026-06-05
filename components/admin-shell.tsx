"use client";

import type React from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

interface AdminShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminShell({ children, className }: AdminShellProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-blue-500/10 to-transparent blur-3xl" />
        <div className="absolute top-1/4 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-500/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-gradient-to-br from-purple-500/8 to-transparent blur-3xl" />
      </div>

      <AdminSidebar />

      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle dark mode"
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-card/80 backdrop-blur border border-border/70 text-foreground hover:bg-accent transition-colors"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="md:pl-64 relative w-full">
        <div className={cn("p-4 md:p-8 w-full", className)}>{children}</div>
      </div>
    </div>
  );
}
