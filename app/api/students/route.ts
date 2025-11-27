import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const classId = request.nextUrl.searchParams.get("classId");

  try {
    let query = supabase.from("students").select("*");

    if (classId) {
      query = query.eq("class_id", classId);
    }

    query = query.order("created_at", { ascending: false, nullsLast: true });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ students: data || [], success: true });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch students",
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found", success: false },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("students")
      .insert({
        ...body,
        school_id: profile.school_id,
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ student: data?.[0], success: true });
  } catch (error) {
    console.error("Error creating student:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create student",
        success: false,
      },
      { status: 500 },
    );
  }
}
