import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient();
    const { id: teacherId } = await params;

    // Get teacher's incharge_class_ids
    const { data: teacher, error: teacherErr } = await supabase
      .from("profiles")
      .select("incharge_class_ids, incharge_class_id, class_ids")
      .eq("id", teacherId)
      .single();

    if (teacherErr) {
      return NextResponse.json({ error: teacherErr.message }, { status: 400 });
    }

    const inchargeArr = Array.isArray(teacher?.incharge_class_ids)
      ? (teacher?.incharge_class_ids as string[])
      : [];
    const legacySingle = teacher?.incharge_class_id
      ? [String(teacher.incharge_class_id)]
      : [];
    const legacyClassIds = Array.isArray(teacher?.class_ids)
      ? (teacher?.class_ids as string[])
      : [];

    // Merge all possible incharge/class assignment fields (handles legacy data)
    const incharge_class_ids = Array.from(
      new Set(
        [...inchargeArr, ...legacySingle, ...legacyClassIds].filter(Boolean),
      ),
    );

    // Get teacher's assigned subjects
    const { data: assignments, error: assignErr } = await supabase
      .from("assign_subjects")
      .select("subject_id")
      .eq("teacher_id", teacherId);

    if (assignErr) {
      return NextResponse.json({ error: assignErr.message }, { status: 400 });
    }

    const assigned_subjects = Array.from(
      new Set((assignments || []).map((a: any) => a.subject_id)),
    );

    return NextResponse.json({
      incharge_class_ids,
      assigned_subjects,
    });
  } catch (err) {
    console.error("Error fetching teacher permissions:", err);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 },
    );
  }
}
