import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { access_token, refresh_token } = await request.json();
    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { success: false, error: "Missing tokens" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("/api/auth/session", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Session sync failed" },
      { status: 500 },
    );
  }
}
