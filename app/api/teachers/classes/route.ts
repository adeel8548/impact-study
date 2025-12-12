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
    // Read class assignments from profiles table. Support legacy `class_ids`,
    // new `incharge_class_ids` array, and fallback single `incharge_class_id`.
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("class_ids, incharge_class_ids, incharge_class_id")
      .eq("id", teacherId)
      .maybeSingle();

    if (profileError) throw profileError;

    const legacyClassIds: string[] = Array.isArray(profile?.class_ids)
      ? (profile?.class_ids as string[])
      : [];
    const inchargeArray: string[] = Array.isArray(profile?.incharge_class_ids)
      ? (profile?.incharge_class_ids as string[])
      : profile?.incharge_class_id
        ? [String(profile.incharge_class_id)]
        : [];

    // Combine both arrays and remove duplicates
    const combined = Array.from(
      new Set<string>([...legacyClassIds, ...inchargeArray].filter(Boolean)),
    );

    // Also include classes where the teacher has subject assignments
    const { data: assignedRows, error: assignedErr } = await adminClient
      .from("assign_subjects")
      .select("class_id")
      .eq("teacher_id", teacherId);

    if (
      !assignedErr &&
      Array.isArray(assignedRows) &&
      assignedRows.length > 0
    ) {
      const assignedClassIds = Array.from(
        new Set(assignedRows.map((r: any) => r.class_id).filter(Boolean)),
      );
      assignedClassIds.forEach((id) => combined.push(id));
    }

    // dedupe again
    const uniqueCombined = Array.from(new Set(combined));

    // If no class assignments are present on the profile, return early
    if (combined.length === 0) {
      return NextResponse.json({ success: true, classes: [] });
    }

    // Fetch full class objects with id and name
    const { data: classes, error: classError } = await adminClient
      .from("classes")
      .select("id, name")
      .in("id", uniqueCombined);

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
