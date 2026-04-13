import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next") || "/login";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing-code", url.origin));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const message = encodeURIComponent(error.message);
      return NextResponse.redirect(new URL(`/login?error=${message}`, url.origin));
    }

    return NextResponse.redirect(new URL(nextPath, url.origin));
  } catch (error: any) {
    const message = encodeURIComponent(error?.message || "Authentication failed");
    return NextResponse.redirect(new URL(`/login?error=${message}`, url.origin));
  }
}