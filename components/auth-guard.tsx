"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        // Clear any stale tokens/data
        localStorage.removeItem("currentUser");
        localStorage.removeItem("accessToken");
        router.replace("/");
        return;
      }

      // Keep local cache in sync if desired
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      setChecking(false);
    };

    verify();
  }, [router]);

  if (checking) return null; // Could render a skeleton/spinner here
  return <>{children}</>;
}
