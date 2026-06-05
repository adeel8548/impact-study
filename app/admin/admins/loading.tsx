import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-page-header";
import { adminCardClass } from "@/lib/admin-ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Admins" description="Loading admins..." />

      <Card className={adminCardClass("p-8")}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
