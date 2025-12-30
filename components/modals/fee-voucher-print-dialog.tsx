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
   const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const loadVoucherData = async () => {
    setLoading(true);
    try {
      setError(null);
      // Don't reset voucherData if it already exists (to avoid flicker when toggling fine)

      const { data, error } = await getFeeVoucherData(studentId, includeFine);

      if (error) {
        console.error("Error from getFeeVoucherData:", error);
        setError(error || "Failed to load voucher data");
        setVoucherData(null);
      } else if (data) {
        setVoucherData(data);
      } else {
        setError("No fee data available for this student.");
        setVoucherData(null);
      }
    } catch (err) {
      console.error("Error loading voucher data:", err);
      setError("Failed to load voucher data");
      setVoucherData(null);
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
      <DialogContent className="!max-w-[100vw] w-screen h-screen max-h-screen overflow-y-auto p-1 ">
        {!voucherData && (
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Print Fee Voucher - {studentName}</DialogTitle>
            <DialogDescription>
              Configure and print the fee voucher
            </DialogDescription>
          </DialogHeader>
        )}

        <div className="space-y-4 px-6">
          {/* Include fine option - always visible */}
          <div className="flex items-center gap-2 pt-3">
            <Checkbox
              id="includeFine"
              checked={includeFine}
              onCheckedChange={(checked) => {
                setIncludeFine(checked as boolean);
                // Reload voucher data when fine option changes
                if (voucherData) {
                  loadVoucherData();
                }
              }}
            />
            <label
              htmlFor="includeFine"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 "
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
              {/* Print Preview - side by side, A4 landscape-friendly, full screen */}
              <div className="w-full h-[calc(100vh-120px)] overflow-y-auto p-4 bg-gray-50">
                <div
                  ref={printRef}
                  className="bg-white flex flex-row gap-2 justify-between items-start print:w-full print:h-[105mm] print:p-1 print:flex-row print:gap-1 print:max-w-full"
                >
                  <FeeVoucher {...voucherData} copyType="head" />
                  <FeeVoucher {...voucherData} copyType="student" />
                </div>
              </div>

              {/* Print Button - Fixed at bottom */}
              <div className="flex justify-end gap-2 pb-4 bg-background border-t pt-4">
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
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-muted-foreground">
                {error || "No fee data available"}
              </p>
              {error === "Student not found" && (
                <p className="text-xs text-muted-foreground">
                  Please make sure this student exists in the{" "}
                  <span className="font-medium">students</span> table and that
                  the ID in the list matches the database record.
                </p>
              )}
            </div>
          )}
        </div>

        <style jsx global>{`
          @media print {
            @page {
              size: A6 landscape;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            * {
              box-sizing: border-box;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
