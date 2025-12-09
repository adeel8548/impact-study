import { redirect } from "next/navigation";

export default function Page() {
  redirect("/teacher/schedules?tab=quizzes");
}
