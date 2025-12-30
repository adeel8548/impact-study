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

  const loadVouchersData = async () => {
    setLoading(true);
    try {
      let studentIds: string[] = [];

      if (printType === "all") {
        // All students (unpaid only)
        studentIds = students
          .filter((s) => s.currentFee?.status === "unpaid")
          .map((s) => s.id);
      } else if (printType === "class" && selectedClass) {
        // Only selected class (unpaid only)
        studentIds = students
          .filter((s) => String(s.class_id) === selectedClass && s.currentFee?.status === "unpaid")
          .map((s) => s.id);
      }

      if (studentIds.length === 0) {
        setVouchersData([]);
        alert("No unpaid students found in selected filter");
        setLoading(false);
        return;
      }

      const { data, error } = await getMultipleFeeVouchers(studentIds, includeFine);
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Print Fee Vouchers</DialogTitle>
          <DialogDescription>
            {printType === "all" 
              ? "Print fee vouchers for all unpaid students" 
              : "Print fee vouchers for selected class (unpaid only)"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Print Options */}
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

          {/* Print Preview */}
          {vouchersData.length > 0 && (
            <>
              <div className="border rounded-lg p-4 bg-gray-50 max-h-[400px] overflow-y-auto">
                <h3 className="text-sm font-semibold mb-4">
                  Preview ({vouchersData.length} vouchers)
                </h3>
                <div ref={printRef} className="bg-white space-y-8">
                  {vouchersData.map((voucher, index) => (
                    <div key={index} className="page-break">
                      <div className="flex gap-4">
                        <FeeVoucher {...voucher} copyType="head" />
                        <FeeVoucher {...voucher} copyType="student" />
                      </div>
                      {index < vouchersData.length - 1 && (
                        <div className="border-b-2 border-dashed border-gray-300 my-4" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Print Button */}
              <div className="flex justify-end gap-2">
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
            .page-break {
              page-break-after: always;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
