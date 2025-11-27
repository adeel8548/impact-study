import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const classId = request.nextUrl.searchParams.get("classId");
  const teacherId = request.nextUrl.searchParams.get("teacherId");
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  try {
    let query = supabase.from("student_attendance").select("*");

    if (classId) {
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", classId);
      const studentIds = students?.map((s) => s.id) || [];
      query = query.in("student_id", studentIds);
    }

    if (startDate && endDate) {
      query = query.gte("date", startDate).lte("date", endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ attendance: data || [], success: true });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch attendance",
        success: false,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { records } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        {
          error: "Invalid request body. Expected 'records' array.",
          success: false,
        },
        { status: 400 },
      );
    }

    // First, delete existing attendance records for these students/teachers on these dates
    if (records.length > 0) {
      const firstRecord = records[0];
      if (firstRecord.class_id) {
        const { error: deleteError } = await supabase
          .from("student_attendance")
          .delete()
          .eq("class_id", firstRecord.class_id)
          .eq("date", firstRecord.date);

        if (deleteError) {
          console.error("Error deleting old records:", deleteError);
        }
      }
    }

    // Insert new attendance records
    const { data, error } = await supabase
      .from("student_attendance")
      .insert(records)
      .select();

    if (error) throw error;

    return NextResponse.json({ attendance: data, success: true });
  } catch (error) {
    console.error("Error creating attendance:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create attendance",
        success: false,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Attendance ID is required", success: false },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("student_attendance")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ attendance: data, success: true });
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update attendance",
        success: false,
      },
      { status: 500 },
    );
  }
}
