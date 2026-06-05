import { cn } from "@/lib/utils";

export const adminGlassCard =
  "bg-card/70 backdrop-blur border-border/60 hover:shadow-md transition-shadow";

export function adminCardClass(className?: string) {
  return cn(adminGlassCard, className);
}
