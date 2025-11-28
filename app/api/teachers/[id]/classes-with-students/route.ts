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

    // 1. Get teacher's class_ids from profiles table
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("class_ids")
      .eq("id", teacherId)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json(
        { classes: [], students: [], success: false },
        { status: 500 },
      );
    }

    const classIds: string[] = (profile?.class_ids as string[]) || [];
    console.log("Teacher class_ids from profiles:", classIds);

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
