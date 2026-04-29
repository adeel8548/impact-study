import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const classId = request.nextUrl.searchParams.get("classId");
  const subject = request.nextUrl.searchParams.get("subject");
  const subjectLike = request.nextUrl.searchParams.get("subjectLike");
  const subjectId = request.nextUrl.searchParams.get("subjectId");
  const teacherId = request.nextUrl.searchParams.get("teacherId");
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  try {
    let query = supabase.from("series_exams").select("*");

    if (classId) query = query.eq("class_id", classId);
    if (teacherId) query = query.eq("teacher_id", teacherId);

    // The `series_exams` table stores `subject` as text (not `subject_id`).
    // If the caller provides `subjectId`, translate it to subject name and filter on `subject`.
    if (subjectId && !subject && !subjectLike) {
      try {
        const { data: subjectRow, error: subjectErr } = await supabase
          .from("subjects")
          .select("name")
          .eq("id", subjectId)
          .single();

        if (!subjectErr && subjectRow?.name) {
          query = query.ilike("subject", subjectRow.name);
        }
      } catch (e) {
        // If lookup fails, we'll just continue without subject filtering.
      }
    }

    if (subject) query = query.ilike("subject", subject);
    if (subjectLike) query = query.ilike("subject", `%${subjectLike}%`);
    if (startDate && endDate)
      query = query.gte("start_date", startDate).lte("end_date", endDate);

    const { data, error } = await query.order("start_date", {
      ascending: true,
    });
    if (error) throw error;

    return NextResponse.json({ data: data || [], success: true });
  } catch (error) {
    console.error("Error fetching series_exams:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch",
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
    const payload = Array.isArray(body) ? body : [body];

    // `series_exams` table does not include `subject_id` (stores `subject` text).
    // Strip `subject_id` from payload to avoid DB column errors.
    const sanitizedPayload = payload.map((row: any) => {
      if (!row || typeof row !== "object") return row;
      const { subject_id: _subjectId, ...rest } = row;
      return rest;
    });

    const { data, error } = await supabase
      .from("series_exams")
      .insert(sanitizedPayload)
      .select();
    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error creating series_exams:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create",
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
    const { id, ...updatesRest } = body;
    if (!id) {
      return NextResponse.json(
        { error: "id is required", success: false },
        { status: 400 },
      );
    }

    // `series_exams` stores `subject` text; ignore/strip `subject_id` if present.
    let updates: Record<string, any> = updatesRest;
    if ("subject_id" in updates) {
      const { subject_id: _subjectId, ...rest } = updates as any;
      updates = rest;
    }

    const { data, error } = await supabase
      .from("series_exams")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error updating series_exams:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update",
        success: false,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "id is required", success: false },
        { status: 400 },
      );
    }
    const { error } = await supabase.from("series_exams").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting series_exams:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete",
        success: false,
      },
      { status: 500 },
    );
  }
}
