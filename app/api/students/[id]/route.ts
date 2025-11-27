import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { id } = await params;

  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from("students")
      .update(body)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json({ student: data?.[0], success: true });
  } catch (error) {
    console.error("Error updating student:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update student",
        success: false,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { id } = await params;

  try {
    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete student",
        success: false,
      },
      { status: 500 },
    );
  }
}
