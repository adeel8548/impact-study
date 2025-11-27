import { createClient, createAdminClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();
  const { id: teacherId } = await params;

  try {
    console.log("Fetching classes and students for teacher:", teacherId);

    // 1. Get teacher's class_ids from profile
    const { data: profileData, error: profileErr } = await adminClient
      .from("profiles")
      .select("class_ids")
      .eq("id", teacherId)
      .single();

    if (profileErr) {
      console.error("Error fetching profile:", profileErr);
      return NextResponse.json(
        { classes: [], students: [], success: false },
        { status: 200 },
      );
    }

    const classIds: string[] = (profileData as any)?.class_ids || [];
    console.log("Teacher class_ids:", classIds);

    if (classIds.length === 0) {
      return NextResponse.json({ classes: [], students: [], success: true });
    }

    // 2. Fetch classes by IDs
    const { data: classes, error: classesErr } = await supabase
      .from("classes")
      .select("id, name")
      .in("id", classIds);

    if (classesErr) {
      console.error("Error fetching classes:", classesErr);
      return NextResponse.json(
        { error: classesErr.message, classes: [], students: [] },
        { status: 500 },
      );
    }

    console.log("Fetched classes:", classes);

    // 3. Fetch all students for these classes
    const { data: students, error: studentsErr } = await supabase
      .from("students")
      .select("*")
      .in("class_id", classIds)
      .order("roll_number", { ascending: true });

    if (studentsErr) {
      console.error("Error fetching students:", studentsErr);
      return NextResponse.json(
        { error: studentsErr.message, classes, students: [] },
        { status: 500 },
      );
    }

    console.log("Fetched students:", students?.length || 0, "students");

    return NextResponse.json({
      classes: classes || [],
      students: students || [],
      success: true,
    });
  } catch (error) {
    console.error("Error in classes-with-students endpoint:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        success: false,
      },
      { status: 500 },
    );
  }
}
