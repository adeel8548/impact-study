import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const classId = request.nextUrl.searchParams.get("classId");
  const subject = request.nextUrl.searchParams.get("subject");
  const teacherId = request.nextUrl.searchParams.get("teacherId");
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  try {
    let query = supabase.from("series_exams").select("*");

    if (classId) query = query.eq("class_id", classId);
    if (teacherId) query = query.eq("teacher_id", teacherId);
    if (subject) query = query.ilike("subject", subject);
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
    const { data, error } = await supabase
      .from("series_exams")
      .insert(payload)
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
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json(
        { error: "id is required", success: false },
        { status: 400 },
      );
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
