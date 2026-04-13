"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowLeft, Lock } from "lucide-react";

interface ResetPasswordClientProps {
  directEmail?: string;
}

export default function ResetPasswordClient({
  directEmail = "",
}: ResetPasswordClientProps) {
  const router = useRouter();
  const normalizedEmail = directEmail.trim().toLowerCase();
  const isDirectReset = Boolean(normalizedEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session));
    };

    checkSession();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!password || !confirmPassword) {
      setError("Both password fields are required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      if (isDirectReset) {
        const response = await fetch("/api/auth/reset-password-direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        });

        const json = await response.json();
        if (!response.ok || json.success === false) {
          setError(json.error || "Failed to update password");
          return;
        }
      } else {
        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });

        if (updateError) {
          setError(updateError.message);
          return;
        }
      }

      setMessage("Password updated successfully. Redirecting to login...");
      if (!isDirectReset) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update password",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200/70">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Add New Password</CardTitle>
          <CardDescription>
            Create a new password for your teacher account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSession && !isDirectReset ? (
            <div className="space-y-4">
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <AlertCircle className="mt-0.5 h-5 w-5" />
                <p className="text-sm">
                  This page can only be opened from a valid reset flow.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Return to login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {(error || message) && (
                <div
                  className={`flex gap-3 rounded-lg border p-3 ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                >
                  {error ? <AlertCircle className="mt-0.5 h-5 w-5" /> : null}
                  <p className="text-sm">{error || message}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">New password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save new password"}
              </Button>
            </form>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-blue-600 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
            <span className="text-muted-foreground">Teacher reset</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
