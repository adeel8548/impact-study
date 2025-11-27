import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.from("student_fees").select("*");

    if (error) throw error;

    return NextResponse.json({ fees: data || [], success: true });
  } catch (error) {
    console.error("Error fetching fees:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch fees",
        success: false,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { id, ...body } = await request.json();
    const { data, error } = await supabase
      .from("student_fees")
      .update(body)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json({ fee: data?.[0], success: true });
  } catch (error) {
    console.error("Error updating fee:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update fee",
        success: false,
      },
      { status: 500 },
    );
  }
}
