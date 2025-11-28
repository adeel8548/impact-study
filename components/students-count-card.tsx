"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function StudentsCountCard() {
  const { data, error } = useSWR("/api/students/count", fetcher, {
    refreshInterval: 60_000,
  });

  let content = (
    <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
  );

  if (error) {
    content = (
      <span className="text-sm text-red-600">
        Failed to load
      </span>
    );
  } else if (data?.success) {
    content = <span className="text-3xl font-bold">{data.count}</span>;
  }

  return (
    <Card className="p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
        <Users className="w-6 h-6 text-indigo-600" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Total Students</p>
        {content}
      </div>
    </Card>
  );
}

