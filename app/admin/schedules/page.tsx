import { Suspense } from "react";
import { AdminSchedulesContent } from "./schedules-content";
import { Loader2 } from "lucide-react";

export default function AdminSchedulesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <AdminSchedulesContent />
    </Suspense>
  );
}

