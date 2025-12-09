import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET - Fetch subjects for a specific class
 * Path params:
 * - id: UUID of the class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { id: classId } = await params;

  try {
    // First, try to fetch from subjects table
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("class_id", classId)
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ subjects: data || [], success: true });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch subjects",
        success: false,
      },
      { status: 500 },
    );
  }
}

/**
 * POST - Create a new subject for a class
 * Body:
 * - name: Name of the subject
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { id: classId } = await params;

  try {
    if (!classId) {
      return NextResponse.json(
        { error: "Class id is required", success: false },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Subject name is required", success: false },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("subjects")
      .insert({ name, class_id: classId })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error creating subject:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create subject",
        success: false,
      },
      { status: 500 },
    );
  }
}

/**
 * PUT - Update a subject
 * Body:
 * - id: UUID of the subject to update
 * - name: New name of the subject
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { id: classId } = await params;

  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "Subject id and name are required", success: false },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("subjects")
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error updating subject:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update subject",
        success: false,
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Delete a subject
 * Query params:
 * - id: UUID of the subject to delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { id: classId } = await params;

  try {
    const subjectId = request.nextUrl.searchParams.get("id");

    if (!subjectId) {
      return NextResponse.json(
        { error: "Subject id is required", success: false },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", subjectId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subject:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete subject",
        success: false,
      },
      { status: 500 },
    );
  }
}
