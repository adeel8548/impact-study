import { NextResponse } from "next/server";
import { checkFeeExpiration } from "@/lib/actions/fees";

export async function POST() {
  try {
    const { error } = await checkFeeExpiration();

    if (error) {
      console.error("[cron] Failed to reset student fees:", error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[cron] Error in reset-student-fees:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
