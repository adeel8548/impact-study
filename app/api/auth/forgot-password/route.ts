import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const GENERIC_SUCCESS_MESSAGE =
  "If a teacher account exists for this email, password reset instructions have been sent.";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("email", email)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { success: false, error: profileError.message },
        { status: 500 },
      );
    }

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
    }

    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.searchParams.set("next", "/reset-password");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      emailRedirectTo: callbackUrl.toString(),
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
  } catch (error: any) {
    console.error("/api/auth/forgot-password", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to send reset email" },
      { status: 500 },
    );
  }
}