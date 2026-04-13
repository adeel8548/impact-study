import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    const { id } = await context.params;
    const teacherId = String(id || "").trim();

    if (
      !teacherId ||
      teacherId === "undefined" ||
      !UUID_PATTERN.test(teacherId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid teacher id" },
        { status: 400 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { success: false, error: profileError.message },
        { status: 500 },
      );
    }

    if (!currentProfile || currentProfile.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can change teacher passwords" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const password = String(body?.password || "");

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const { data: targetTeacher, error: teacherError } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", teacherId)
      .maybeSingle();

    if (teacherError) {
      return NextResponse.json(
        { success: false, error: teacherError.message },
        { status: 500 },
      );
    }

    if (!targetTeacher || targetTeacher.role !== "teacher") {
      return NextResponse.json(
        { success: false, error: "Teacher not found" },
        { status: 404 },
      );
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      teacherId,
      { password },
    );

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Teacher password updated successfully",
    });
  } catch (error: any) {
    console.error("/api/teachers/[id]/change-password", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to change password" },
      { status: 500 },
    );
  }
}
