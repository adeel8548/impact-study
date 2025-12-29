import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const supabase = await createAdminClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch role and basic profile from Supabase
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email, role")
      .eq("id", user.id)
      .single();

    const token = await adminAuth().createCustomToken(user.id, {
      email: profile?.email || user.email || undefined,
      role: profile?.role || undefined,
      name: profile?.name || undefined,
    });
    return NextResponse.json({ token });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
