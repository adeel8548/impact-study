import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  const supabase = await createClient();
  // params may sometimes be undefined depending on how the request is routed.
  // Fall back to parsing the URL path if needed.
  let { examId } = params || { examId: undefined };
  if (!examId) {
    try {
      const url = new URL(request.url);
      const parts = url.pathname.split("/").filter(Boolean);
      // expect ['api','series-exams','<examId>']
      examId = decodeURIComponent(parts[2] || "");
    } catch (e) {
      // ignore and keep examId undefined
    }
  }

  try {
    if (!examId) {
      return NextResponse.json(
        { error: "Exam ID is required", success: false },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("series_exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Exam not found", success: false },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error fetching series exam:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch exam",
        success: false,
      },
      { status: 500 }
    );
  }
}
