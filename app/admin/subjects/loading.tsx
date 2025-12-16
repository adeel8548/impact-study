import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="md:pl-64">
        <div className="p-4 md:p-8 space-y-6">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Subjects
              </h1>
              <p className="text-muted-foreground">
                Loading subjects...
              </p>
            </div>
          </div>

          <Card className="p-8">
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Loading data...</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
