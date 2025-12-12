import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { id: teacherId } = await params;

  try {
    const { data, error } = await supabase
      .from("assign_subjects")
      .select(
        `id, class_id, subject_id, created_at, classes(id, name), subjects(id, name)`,
      )
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // map to friendlier shape
    const items = (data || []).map((row: any) => ({
      id: row.id,
      class_id: row.class_id,
      class_name: row.classes?.name || null,
      subject_id: row.subject_id,
      subject_name: row.subjects?.name || null,
      created_at: row.created_at,
    }));

    return NextResponse.json({ success: true, assignments: items });
  } catch (err) {
    console.error("Error fetching assignments:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load" },
      { status: 500 },
    );
  }
}
