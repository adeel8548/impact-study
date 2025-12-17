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
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const verifyWithRetry = async () => {
      // Custom 1-hour expiry logic
      try {
        const issuedAtRaw = localStorage.getItem("accessTokenIssuedAt");
        const issuedAt = issuedAtRaw ? parseInt(issuedAtRaw, 10) : NaN;
        const oneHourMs = 60 * 60 * 1000;
        if (!Number.isNaN(issuedAt)) {
          const now = Date.now();
          if (now - issuedAt >= oneHourMs) {
            // Expired: sign out and redirect
            await supabase.auth.signOut();
            localStorage.removeItem("currentUser");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("accessTokenIssuedAt");
            router.replace("/");
            return;
          } else {
            // Schedule auto-logout at expiry boundary
            const remaining = oneHourMs - (now - issuedAt);
            const timeout = window.setTimeout(async () => {
              await supabase.auth.signOut();
              localStorage.removeItem("currentUser");
              localStorage.removeItem("accessToken");
              localStorage.removeItem("accessTokenIssuedAt");
              router.replace("/");
            }, Math.max(remaining, 0));
            // Clear on unmount
            return () => window.clearTimeout(timeout);
          }
        }
      } catch (e) {
        // If anything goes wrong, fall through to normal session checks
      }

      // If we have an access token in localStorage, be patient before redirecting
      const hasLocalToken = !!localStorage.getItem("accessToken");
      const maxAttempts = hasLocalToken ? 6 : 3; // ~1.5s vs ~750ms
      const delayMs = 250;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          setIsAuthed(true);
          setChecking(false);
          return;
        }

        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          setIsAuthed(true);
          setChecking(false);
          return;
        }

        // Wait and retry
        await sleep(delayMs);
      }

      // After retries, consider unauthenticated
      setIsAuthed(false);
      setChecking(false);
    };

    const cleanup = verifyWithRetry();
    return () => {
      // If verifyWithRetry returned a cleanup (timer), call it
      if (typeof cleanup === "function") {
        try {
          cleanup();
        } catch {}
      }
    };
  }, [router]);

  // While checking, render nothing to avoid flicker/false redirects
  if (checking) return null;

  if (isAuthed) {
    return <>{children}</>;
  }

  // Confirmed unauthenticated: perform redirect and render nothing
  if (typeof window !== "undefined") {
    // Avoid clearing tokens until confirmed unauth
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
    router.replace("/");
  }
  return null;
}
