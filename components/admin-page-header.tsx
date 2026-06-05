import type React from "react";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn("mb-8 relative", className)}>
      <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-gradient-to-br from-purple-500/15 to-transparent blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-gradient-to-br from-blue-500/15 to-transparent blur-2xl pointer-events-none" />

      <div className="relative rounded-3xl border border-border/60 bg-card/50 backdrop-blur p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                {title}
              </h1>
              {badge && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-muted-foreground max-w-2xl">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
