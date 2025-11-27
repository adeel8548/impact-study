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

    // Monthly fees data
    const { data: monthlyFeesData } = await supabase
      .from("student_fees")
      .select("paid, amount, created_at");

    const monthlyFees = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthData = monthlyFeesData?.filter((f) => {
        const date = new Date(f.created_at);
        return date.getMonth() + 1 === month;
      });
      return {
        month: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ][i],
        collected:
          monthData?.reduce(
            (sum, f) => sum + (f.paid ? f.amount || 0 : 0),
            0,
          ) || 0,
      };
    });

    // Weekly attendance data
    const weeklyAttendance = Array.from({ length: 7 }, (_, i) => ({
      day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
      present: Math.floor(Math.random() * 100) + 50,
      absent: Math.floor(Math.random() * 50),
    }));

    // Fee status
    const { data: feeData } = await supabase
      .from("student_fees")
      .select("paid");

    const paidCount = feeData?.filter((f) => f.paid).length || 0;
    const pendingCount = feeData?.filter((f) => !f.paid).length || 0;

    const feeStatus = [
      { name: "Paid", value: paidCount },
      { name: "Pending", value: pendingCount },
    ];

    // Classes distribution
    const { data: classData } = await supabase
      .from("classes")
      .select("id, name");
    const { data: studentData } = await supabase
      .from("students")
      .select("class_id");

    const classDistribution =
      classData?.map((cls) => ({
        name: cls.name,
        students: studentData?.filter((s) => s.class_id === cls.id).length || 0,
      })) || [];

    return NextResponse.json({
      charts: {
        monthlyFees,
        weeklyAttendance,
        feeStatus,
        classDistribution,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch chart data",
        success: false,
      },
      { status: 500 },
    );
  }
}
