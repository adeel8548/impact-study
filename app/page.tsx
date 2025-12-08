"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircle, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/app/Assests/imgs/logo_2.png";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [envError, setEnvError] = useState("");
  const router = useRouter();
  const year = new Date().getFullYear();
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      setEnvError(
        "Supabase configuration missing. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment variables.",
      );
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (envError) {
      setError(envError);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

      if (authError) {
        setError(authError.message);
      } else if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (!profileError && profileData) {
          const userWithRole = { ...data.user, role: profileData.role };

          // Save user info + access token
          localStorage.setItem("currentUser", JSON.stringify(userWithRole));
          localStorage.setItem("accessToken", data.session?.access_token || "");

          // Redirect
          router.push(
            profileData.role === "admin" ? "/admin/students" : "/teacher",
          );
        } else {
          setError("Failed to fetch user profile");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-lg ">
          <div className="text-center mb-8">
            <div className="  rounded-lg flex items-center justify-center mx-auto mb-4 ">
              <img
                src={Logo.src}
                alt="Impact Academy Logo"
                className="w-20 h-20 md:w-48 md:h-48"
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Impact Academy
            </h1>
            <p className="text-muted-foreground mt-2">Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 ">
            {(error || envError) && (
              <div className="flex gap-3 p-3  bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error || envError}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <Input
                type="email"
                placeholder="admin@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                required
              />
            </div>
            <div className="">
              <Button
                type="submit"
                disabled={isLoading || !!envError}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-2 rounded-lg hover:shadow-lg transition-all "
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </form>
        </Card>

        <p className=" text-center text-sm text-muted-foreground mt-6">
          Design & Developed by Adeel Tariq All rights reserved © {year}
        </p>
      </div>
    </div>
  );
}
