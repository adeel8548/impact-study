"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";
import { adminCardClass } from "@/lib/admin-ui";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function StudentsCountCard() {
  const { data, error } = useSWR("/api/students/count", fetcher, {
    // Disable automatic polling in dev to avoid frequent requests.
    // Use dedupingInterval to avoid duplicate concurrent requests
    // and prevent revalidation on window focus.
    refreshInterval: 0,
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
  });

  let content = (
    <Loader2
      className="h-6 w-6 animate-spin text-primary"
      aria-label="Loading"
    />
  );

  if (error) {
    content = <span className="text-sm text-red-600">Failed to load</span>;
  } else if (data?.success) {
    content = <span className="text-3xl font-bold">{data.count}</span>;
  }

  return (
    <Card className={adminCardClass("p-6 flex items-center gap-4")}>
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/0 border border-indigo-500/25 flex items-center justify-center">
        <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Total Students</p>
        {content}
      </div>
    </Card>
  );
}
