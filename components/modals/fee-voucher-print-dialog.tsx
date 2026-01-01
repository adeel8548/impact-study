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
  const [removeArrears, setRemoveArrears] = useState(false);
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

      const { data, error } = await getFeeVoucherData(studentId, includeFine, undefined, removeArrears);

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
  }, [open, includeFine, removeArrears]);

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

          {/* Remove arrears option */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="removeArrears"
              checked={removeArrears}
              onCheckedChange={(checked) => {
                setRemoveArrears(checked as boolean);
                // Reload voucher data when arrears option changes
                if (voucherData) {
                  loadVoucherData();
                }
              }}
            />
            <label
              htmlFor="removeArrears"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 "
            >
              Remove Arrears
            </label>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : voucherData ? (
            <>
              {/* Print Preview - single or double voucher, A4 friendly */}
              <div className="w-full h-[calc(100vh-120px)] overflow-y-auto p-4 bg-gray-50">
                <div
                  ref={printRef}
                  className={`voucher-print-wrapper bg-white ${voucherData?.singleVoucher ? 'single-voucher' : 'flex flex-row gap-2 justify-between items-start print:p-1 print:flex-row print:gap-5 print:max-w-full'}`}
                >
                  {voucherData?.singleVoucher ? (
                    <FeeVoucher {...voucherData} copyType="student" />
                  ) : (
                    <>
                      <FeeVoucher {...voucherData} copyType="head" />
                      <FeeVoucher {...voucherData} copyType="student" />
                    </>
                  )}
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
              size: A4 landscape;
              margin: 0;
            }
            html,
            body {
              width: 297mm;
              height: 210mm;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box;
            }
            * {
              box-sizing: border-box;
            }
            .voucher-print-wrapper {
              width: 280mm;
              height: 200mm;
              display: block !important;
              overflow: visible !important;
              margin: 5mm auto 0 auto;
              padding: 0;
              page-break-after: avoid;
            }
            .voucher-print-wrapper > * {
              display: inline-block !important;
              vertical-align: top;
              width: 135mm;
              height: 200mm;
              max-width: 135mm;
              max-height: 180mm;
              margin: 0 2mm;
              box-sizing: border-box;
              overflow: visible !important;
              border: 2px solid #000 !important;
            }
            .voucher-print-wrapper.single-voucher {
              width: 210mm;
              height: 297mm;
              margin: 0 auto;
              display: flex !important;
              align-items: center;
              justify-content: center;
              page-break-after: always;
            }
            .voucher-print-wrapper.single-voucher > * {
              width: 180mm;
              height: 270mm;
              max-width: 180mm;
              max-height: 270mm;
              border: 2px solid #000 !important;
              margin: 0 auto;
              display: block !important;
            }
            .page-break {
              page-break-after: always;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
