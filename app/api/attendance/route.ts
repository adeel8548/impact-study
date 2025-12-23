import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { isTeacherInchargeOfClass } from "@/lib/server/teacher-permissions";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const classId = request.nextUrl.searchParams.get("classId");
  const studentId = request.nextUrl.searchParams.get("studentId");
  const teacherId = request.nextUrl.searchParams.get("teacherId");
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  try {
    // If classId is provided and teacherId is provided, verify the teacher is incharge of this class
    if (classId && teacherId) {
      const isIncharge = await isTeacherInchargeOfClass(teacherId, classId);
      if (!isIncharge) {
        return NextResponse.json(
          {
            error: "Unauthorized: Teacher is not incharge of this class",
            success: false,
          },
          { status: 403 },
        );
      }
    }

    let query = supabase.from("student_attendance").select("*");

    if (studentId) {
      query = query.eq("student_id", studentId);
    } else if (classId) {
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
    // Support both array payloads and single-record payloads
    const teacherId = body?.teacherId;
    const records = Array.isArray(body?.records)
      ? body.records
      : Array.isArray(body)
        ? body
        : body && body.student_id && body.date && body.status
          ? [body]
          : [];

    if (records.length === 0) {
      return NextResponse.json(
        {
          error:
            "Invalid request body. Provide 'records' array or a single attendance object.",
          success: false,
        },
        { status: 400 },
      );
    }

    // Verify teacher is incharge of the class being marked for attendance
    if (records.length > 0 && teacherId) {
      const firstRecord = records[0];
      if (firstRecord.class_id) {
        const isIncharge = await isTeacherInchargeOfClass(
          teacherId,
          firstRecord.class_id,
        );
        if (!isIncharge) {
          return NextResponse.json(
            {
              error: "Unauthorized: Teacher is not incharge of this class",
              success: false,
            },
            { status: 403 },
          );
        }
      }
    }

    // Upsert per student/date to avoid wiping other students' records for the day
    const { data, error } = await supabase
      .from("student_attendance")
      .upsert(records, { onConflict: ["student_id", "date"] })
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
