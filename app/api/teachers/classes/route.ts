import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const teacherId = request.nextUrl.searchParams.get("teacherId");
  if (!teacherId) {
    return NextResponse.json(
      { success: false, error: "teacherId is required" },
      { status: 400 },
    );
  }

  const adminClient = await createAdminClient();

  try {
    // First try to get class_ids from profiles table
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("class_ids")
      .eq("id", teacherId)
      .maybeSingle();

    if (profileError) throw profileError;

    const classIds: string[] = Array.isArray(profile?.class_ids)
      ? (profile?.class_ids as string[])
      : [];

    // If no class assignments are present on the profile, return early
    if (classIds.length === 0) {
      return NextResponse.json({ success: true, classes: [] });
    }

    // Fetch full class objects with id and name
    const { data: classes, error: classError } = await adminClient
      .from("classes")
      .select("id, name")
      .in("id", classIds);

    if (classError) throw classError;

    return NextResponse.json({ success: true, classes: classes ?? [] });
  } catch (error) {
    console.error("Error fetching teacher classes:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch classes",
      },
      { status: 500 },
    );
  }
}
