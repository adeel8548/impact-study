"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await response.json();

      if (!response.ok || json.success === false) {
        setError(json.error || "Failed to verify teacher email");
        return;
      }

      setMessage(json.message || "Teacher email verified");
      router.push(
        `/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to verify teacher email",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200/70">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            Enter your teacher email. If it exists, you will go to the Add New
            Password screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <label className="text-sm font-medium">Teacher email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="teacher@school.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Checking..." : "Continue"}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-blue-600 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
            <span className="text-muted-foreground">Teachers only</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
