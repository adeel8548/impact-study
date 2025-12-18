"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, Clock } from "lucide-react";

export default function SchoolSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolStartTime, setSchoolStartTime] = useState("15:00");
  const [schoolEndTime, setSchoolEndTime] = useState("14:00");
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/school-settings`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettingsId(data.settings.id);
          setSchoolStartTime(data.settings.school_start_time || "15:00");
          setSchoolEndTime(data.settings.school_end_time || "14:00");
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load school settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!schoolStartTime || !schoolEndTime) {
      toast.error("Please enter both start and end times");
      return;
    }

    if (schoolStartTime >= schoolEndTime) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/school-settings", {
        method: settingsId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: settingsId,
          school_start_time: schoolStartTime,
          school_end_time: schoolEndTime,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }

      const data = await response.json();
      setSettingsId(data.settings.id);
      
      toast.success("School settings saved successfully");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">School Settings</h1>
            <p className="text-muted-foreground mt-2">
              Configure school timing and other settings
            </p>
          </div>

          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">School Timings</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="start-time">School Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={schoolStartTime}
                    onChange={(e) => setSchoolStartTime(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Students arriving after this time + 15 minutes will be marked as late
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time">School End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={schoolEndTime}
                    onChange={(e) => setSchoolEndTime(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Classes end at this time
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              📋 Note
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• School start time is used to automatically mark students as late</li>
              <li>• Students marked present after start time + 15 minutes will be auto-marked as late</li>
              <li>• These settings apply to all attendance marking across the school</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
