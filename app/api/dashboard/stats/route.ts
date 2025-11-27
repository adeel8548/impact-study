import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
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
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found", success: false },
        { status: 404 },
      );
    }

    // Get counts
    const [
      { count: studentCount },
      { count: teacherCount },
      { count: classCount },
    ] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "teacher"),
      supabase.from("classes").select("*", { count: "exact", head: true }),
    ]);

    // Get fee stats
    const { data: feeData } = await supabase
      .from("student_fees")
      .select("paid, amount");

    const totalFees =
      feeData?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
    const paidFees =
      feeData?.reduce((sum, f) => sum + (f.paid ? f.amount || 0 : 0), 0) || 0;

    return NextResponse.json({
      stats: {
        students: studentCount || 0,
        teachers: teacherCount || 0,
        classes: classCount || 0,
        fees: {
          total: totalFees,
          paid: paidFees,
          pending: totalFees - paidFees,
        },
      },
      success: true,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch stats",
        success: false,
      },
      { status: 500 },
    );
  }
}
