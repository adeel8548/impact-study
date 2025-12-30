"use client";

import React, { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FeeVoucher } from "@/components/fee-voucher";
import { Loader2, Printer } from "lucide-react";
import { getFeeVoucherData } from "@/lib/actions/fee-vouchers";

interface FeeVoucherPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export function FeeVoucherPrintDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
}: FeeVoucherPrintDialogProps) {
  const [loading, setLoading] = useState(false);
  const [includeFine, setIncludeFine] = useState(false);
  const [voucherData, setVoucherData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const loadVoucherData = async () => {
    setLoading(true);
    try {
      const { data, error } = await getFeeVoucherData(studentId, includeFine);
      if (data) {
        setVoucherData(data);
      }
    } catch (err) {
      console.error("Error loading voucher data:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      loadVoucherData();
    }
  }, [open, includeFine]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print Fee Voucher - {studentName}</DialogTitle>
          <DialogDescription>
            Configure and print the fee voucher
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="includeFine"
              checked={includeFine}
              onCheckedChange={(checked) => setIncludeFine(checked as boolean)}
            />
            <label
              htmlFor="includeFine"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include fine (20 Rs per day after 12th)
            </label>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : voucherData ? (
            <>
              {/* Print Preview */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold mb-4">Preview</h3>
                <div ref={printRef} className="bg-white">
                  <div className="flex gap-4">
                    <FeeVoucher {...voucherData} copyType="head" />
                    <FeeVoucher {...voucherData} copyType="student" />
                  </div>
                </div>
              </div>

              {/* Print Button */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print Voucher
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No fee data available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
