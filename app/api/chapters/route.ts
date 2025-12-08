import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET - Fetch chapters for a specific subject
 * Query params:
 * - subjectId: Filter chapters by subject
 * - examId: Filter chapters by exam
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const subjectId = request.nextUrl.searchParams.get("subjectId");
  const examId = request.nextUrl.searchParams.get("examId");

  try {
    let query = supabase.from("exam_chapters").select("*");

    if (subjectId) query = query.eq("subject_id", subjectId);
    if (examId) query = query.eq("exam_id", examId);

    const { data, error } = await query.order("created_at", { ascending: true });
    if (error) throw error;

    return NextResponse.json({ data: data || [], success: true });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch chapters", success: false },
      { status: 500 },
    );
  }
}

/**
 * POST - Create a new chapter for an exam
 * Body:
 * - exam_id: UUID of the exam
 * - subject_id: UUID of the subject
 * - chapter_name: Name of the chapter
 * - chapter_date: Date of the chapter exam
 * - max_marks: Maximum marks for this chapter
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from("exam_chapters")
      .insert(body)
      .select();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error creating chapter:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create chapter", success: false },
      { status: 500 },
    );
  }
}

/**
 * PUT - Update a chapter
 * Body:
 * - id: UUID of the chapter to update
 * - Other fields to update: chapter_name, chapter_date, max_marks
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Chapter ID is required", success: false },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("exam_chapters")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error updating chapter:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update chapter", success: false },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Delete a chapter
 * Query params:
 * - id: UUID of the chapter to delete
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Chapter ID is required", success: false },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("exam_chapters").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chapter:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete chapter", success: false },
      { status: 500 },
    );
  }
}
