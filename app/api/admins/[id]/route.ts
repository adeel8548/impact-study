import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { id } = params;

  try {
    const { data, error } = await supabase
      .from("admins")
      .select("id, name, email")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Admin not found", success: false },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ ...data, success: true });
  } catch (error) {
    console.error("Error fetching admin:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch admin",
        success: false,
      },
      { status: 500 }
    );
  }
}
