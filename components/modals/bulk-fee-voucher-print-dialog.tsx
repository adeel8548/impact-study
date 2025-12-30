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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeeVoucher } from "@/components/fee-voucher";
import { Loader2, Printer } from "lucide-react";
import { getMultipleFeeVouchers } from "@/lib/actions/fee-vouchers";
import type { Class as SchoolClass } from "@/lib/types";
import Logo from "@/app/Assests/imgs/logo_2.png"
interface BulkFeeVoucherPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: any[];
  classes: SchoolClass[];
}

export function BulkFeeVoucherPrintDialog({
  open,
  onOpenChange,
  students,
  classes,
}: BulkFeeVoucherPrintDialogProps) {
  const [loading, setLoading] = useState(false);
  const [includeFine, setIncludeFine] = useState(false);
  const [printType, setPrintType] = useState<"all" | "class">("all");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [vouchersData, setVouchersData] = useState<any[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const loadVouchersData = async (fineValue?: boolean) => {
    setLoading(true);
    try {
      // Use the passed fineValue or fall back to current state
      const shouldIncludeFine = fineValue !== undefined ? fineValue : includeFine;
      
      let studentIds: string[] = [];

      if (printType === "all") {
        // All students who have unpaid fees for the current month
        studentIds = students
          .filter((s) => s.currentFee && s.currentFee.status === "unpaid")
          .map((s) => s.id);
      } else if (printType === "class" && selectedClass) {
        // Only selected class with unpaid fees
        studentIds = students
          .filter(
            (s) =>
              String(s.class_id) === selectedClass &&
              s.currentFee &&
              s.currentFee.status === "unpaid",
          )
          .map((s) => s.id);
      }

      if (studentIds.length === 0) {
        setVouchersData([]);
        alert("No students with fee records found in selected filter");
        setLoading(false);
        return;
      }

      const { data, error } = await getMultipleFeeVouchers(studentIds, shouldIncludeFine);
      if (data) {
        setVouchersData(data);
      }
    } catch (err) {
      console.error("Error loading vouchers data:", err);
      alert("Error loading vouchers data");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePreview = () => {
    loadVouchersData();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[100vw] w-screen h-screen max-h-[99vh] overflow-y-auto p-0">
        {vouchersData.length === 0 && (
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Bulk Print Fee Vouchers</DialogTitle>
            <DialogDescription>
              {printType === "all"
                ? "Print fee vouchers for all students with unpaid fees (including previous months arrears)."
                : "Print fee vouchers for selected class with unpaid fees (including previous months arrears)."}
            </DialogDescription>
          </DialogHeader>
        )}

        <div className="space-y-4 px-6">
          {/* Print Options - Hide when vouchers are loaded */}
          {vouchersData.length === 0 && (
            <div className="space-y-4 border rounded-lg p-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Print Type</label>
                <Select value={printType} onValueChange={(value: any) => setPrintType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select print type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="class">By Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {printType === "class" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Class</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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

              <Button onClick={handleGeneratePreview} disabled={loading || (printType === "class" && !selectedClass)}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  "Generate Preview"
                )}
              </Button>
            </div>
          )}

          {/* Include fine option - always visible even when vouchers are loaded */}
          {vouchersData.length > 0 && (
            <div className="flex items-center gap-2 border-b pb-4 pt-3">
              <Checkbox
                id="includeFineLoaded"
                checked={includeFine}
                onCheckedChange={(checked) => {
                  const newFineValue = checked as boolean;
                  setIncludeFine(newFineValue);
                  // Reload vouchers when fine option changes, passing the new value directly
                  loadVouchersData(newFineValue);
                }}
              />
              <label
                htmlFor="includeFineLoaded"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include fine (20 Rs per day after 12th)
              </label>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}

          {/* Print Preview - Full screen when loaded */}
          {vouchersData.length > 0 && (
            <>
              <div className="w-full h-[calc(100vh-120px)] overflow-y-auto p-4 bg-gray-50">
                <div
                  ref={printRef}
                  className="bg-white flex flex-col gap-8 items-center print:w-full print:h-[105mm] print:p-1 print:max-w-full"
                >
                  {vouchersData.map((voucher, index) => (
                    <div key={index} className="page-break w-full flex flex-row gap-1 justify-between items-start print:flex-row print:gap-1 print:w-full print:max-w-full">
                      <FeeVoucher {...voucher} copyType="head" />
                      <FeeVoucher {...voucher} copyType="student" />
                      {index < vouchersData.length - 1 && (
                        <div className="border-b-2 border-dashed border-gray-300 my-4" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Print Button - Fixed at bottom */}
              <div className="flex justify-end gap-2 pb-4 bg-background border-t pt-4">
                <Button variant="outline" onClick={() => {
                  setVouchersData([]);
                  setSelectedClass("");
                  setPrintType("all");
                }}>
                  Back
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print All ({vouchersData.length})
                </Button>
              </div>
            </>
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
            .page-break {
              page-break-after: always;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
