"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AttendanceRangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStart?: string;
  initialEnd?: string;
  onApply: (start: string, end: string) => void;
  title?: string;
}

export function AttendanceRangeModal({
  open,
  onOpenChange,
  initialStart = "",
  initialEnd = "",
  onApply,
  title = "Custom Date Range",
}: AttendanceRangeModalProps) {
  const [start, setStart] = useState<string>(initialStart);
  const [end, setEnd] = useState<string>(initialEnd);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStart(initialStart || "");
    setEnd(initialEnd || "");
  }, [initialStart, initialEnd, open]);

  const handleApply = () => {
    if (!start || !end) return toast.error("Please select both start and end dates");
    if (new Date(start) > new Date(end)) return toast.error("Start date must be before end date");
    setLoading(true);
    try {
      onApply(start, end);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Choose a custom date range to filter attendance</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="start">Start Date</Label>
            <Input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end">End Date</Label>
            <Input id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={loading || !start || !end}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
