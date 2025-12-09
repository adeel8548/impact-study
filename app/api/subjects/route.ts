import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - list subjects (optionally by classId)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const classId = request.nextUrl.searchParams.get("classId");

  try {
    let query = supabase.from("subjects").select("*").order("name", { ascending: true });
    if (classId) query = query.eq("class_id", classId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ subjects: data || [], success: true });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch subjects", success: false },
      { status: 500 },
    );
  }
}

// POST - create subject
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { name, class_id } = body;

    if (!name || !class_id) {
      return NextResponse.json(
        { error: "name and class_id are required", success: false },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("subjects")
      .insert({ name, class_id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error creating subject:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create subject", success: false },
      { status: 500 },
    );
  }
}

// PUT - update subject
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "id and name are required", success: false },
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
      { error: error instanceof Error ? error.message : "Failed to update subject", success: false },
      { status: 500 },
    );
  }
}

// DELETE - delete subject
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

    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subject:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete subject", success: false },
      { status: 500 },
    );
  }
}

