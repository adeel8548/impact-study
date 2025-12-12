import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Returns subject-teacher pairs for a class
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminClient = await createAdminClient();
  const { id: classId } = await params;

  try {
    if (!classId) {
      return NextResponse.json(
        { success: false, error: "classId is required" },
        { status: 400 },
      );
    }

    const { data, error } = await adminClient
      .from("assign_subjects")
      .select(
        `id, teacher_id, subject_id, subjects(id, name), profiles:teacher_id (id, name)`,
      )
      .eq("class_id", classId);

    if (error) throw error;

    const assignments = (data || []).map((row: any) => ({
      id: row.id,
      teacher_id: row.teacher_id,
      teacher_name: row.profiles?.name || null,
      subject_id: row.subject_id,
      subject_name: row.subjects?.name || null,
    }));

    return NextResponse.json({ success: true, assignments });
  } catch (err) {
    console.error("Error fetching class assignments:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch assignments" },
      { status: 500 },
    );
  }
}

