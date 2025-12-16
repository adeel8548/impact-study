import { TeacherHeader } from "@/components/teacher-header";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader />
      
      <div className="mt-16">
        <div className="p-4 md:p-8 space-y-6">
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
