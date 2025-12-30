"use client";

import React, { useRef } from "react";

interface FeeVoucherProps {
  rollNumber: string;
  serialNumber: number;
  issueDate: string;
  dueDate: string;
  studentName: string;
  fatherName: string;
  className: string;
  month: string;
  monthlyFee: number;
  arrears: number;
  fines: number;
  annualCharges: number;
  examFee: number;
  otherCharges: number;
  totalAmount: number;
  finePerDay: number;
  copyType: "head" | "student";
}

export function FeeVoucher({
  rollNumber,
  serialNumber,
  issueDate,
  dueDate,
  studentName,
  fatherName,
  className,
  month,
  monthlyFee,
  arrears,
  fines,
  annualCharges,
  examFee,
  otherCharges,
  totalAmount,
  finePerDay,
  copyType,
}: FeeVoucherProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  return (
    <div className="w-[450px] h-[650px] border-2 border-black bg-white text-black font-serif p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-16 h-16 border border-black flex items-center justify-center bg-gray-100">
            <span className="text-2xl font-bold">ISI</span>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold uppercase">Impact Study Institute</h1>
          </div>
        </div>
        <div className="text-right font-bold">
          {copyType === "head" ? "Head Office" : "Student Copy"}
        </div>
      </div>

      {/* Student Info */}
      <div className="grid grid-cols-3 gap-2 text-sm border-b border-black pb-2 mb-2">
        <div className="border-r border-black pr-2">
          <span className="font-bold">Roll No.</span>
          <div className="border-t border-black mt-1 pt-1">{rollNumber}</div>
        </div>
        <div className="border-r border-black pr-2">
          <span className="font-bold">Fee A/C</span>
          <div className="border-t border-black mt-1 pt-1"></div>
        </div>
        <div>
          <span className="font-bold">Serial No.</span>
          <div className="border-t border-black mt-1 pt-1">{serialNumber}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm border-b border-black pb-2 mb-2">
        <div className="border-r border-black pr-2">
          <span className="font-bold">Issue Date</span>
          <div className="border-t border-black mt-1 pt-1">{formatDate(issueDate)}</div>
        </div>
        <div>
          <span className="font-bold">Due Date</span>
          <div className="border-t border-black mt-1 pt-1">{formatDate(dueDate)}</div>
        </div>
      </div>

      <div className="border-b border-black pb-2 mb-2">
        <div className="font-bold text-sm">Student Name</div>
        <div className="border-t border-black mt-1 pt-1 text-sm">{studentName}</div>
      </div>

      <div className="border-b border-black pb-2 mb-2">
        <div className="font-bold text-sm">Father Name</div>
        <div className="border-t border-black mt-1 pt-1 text-sm">{fatherName}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm border-b border-black pb-2 mb-2">
        <div className="border-r border-black pr-2">
          <span className="font-bold">Class / Section</span>
          <div className="border-t border-black mt-1 pt-1">{className}</div>
        </div>
        <div>
          <span className="font-bold">Month</span>
          <div className="border-t border-black mt-1 pt-1">{month}</div>
        </div>
      </div>

      {/* Fee Details Table */}
      <div className="border-2 border-black mb-2">
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="font-bold text-center border-r-2 border-black py-1 text-sm">Detail</div>
          <div className="font-bold text-center py-1 text-sm">Amount</div>
        </div>
        
        {monthlyFee > 0 && (
          <div className="grid grid-cols-2 border-b border-black">
            <div className="font-bold border-r-2 border-black px-2 py-1 text-sm">Monthly Fee</div>
            <div className="text-right px-2 py-1 text-sm">{monthlyFee.toLocaleString()}</div>
          </div>
        )}
        
        {arrears > 0 && (
          <div className="grid grid-cols-2 border-b border-black">
            <div className="font-bold border-r-2 border-black px-2 py-1 text-sm">Arrears</div>
            <div className="text-right px-2 py-1 text-sm">{arrears.toLocaleString()}</div>
          </div>
        )}
        
        {fines > 0 && (
          <div className="grid grid-cols-2 border-b border-black">
            <div className="font-bold border-r-2 border-black px-2 py-1 text-sm">Fines</div>
            <div className="text-right px-2 py-1 text-sm">{fines.toLocaleString()}</div>
          </div>
        )}
        
        {annualCharges > 0 && (
          <div className="grid grid-cols-2 border-b border-black">
            <div className="font-bold border-r-2 border-black px-2 py-1 text-sm">Annual Charges</div>
            <div className="text-right px-2 py-1 text-sm">{annualCharges.toLocaleString()}</div>
          </div>
        )}
        
        {examFee > 0 && (
          <div className="grid grid-cols-2 border-b border-black">
            <div className="font-bold border-r-2 border-black px-2 py-1 text-sm">Exam Fee</div>
            <div className="text-right px-2 py-1 text-sm">{examFee.toLocaleString()}</div>
          </div>
        )}
        
        {otherCharges > 0 && (
          <div className="grid grid-cols-2 border-b border-black">
            <div className="font-bold border-r-2 border-black px-2 py-1 text-sm">Other Charges</div>
            <div className="text-right px-2 py-1 text-sm">{otherCharges.toLocaleString()}</div>
          </div>
        )}
        
        <div className="grid grid-cols-2 bg-gray-100">
          <div className="font-bold border-r-2 border-black px-2 py-1 text-sm">Total Amount</div>
          <div className="text-right px-2 py-1 font-bold text-sm">{totalAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* Late Fee Info */}
      <div className="border-2 border-black mb-2">
        <div className="grid grid-cols-2 border-b border-black">
          <div className="font-bold px-2 py-1 text-xs border-r-2 border-black">
            Amount After 07 of Month(Per day 20 x __)
          </div>
          <div className="px-2 py-1 text-xs"></div>
        </div>
        <div className="grid grid-cols-2">
          <div className="font-bold px-2 py-1 text-xs border-r-2 border-black">
            Amount After 25 of Month
          </div>
          <div className="px-2 py-1 text-xs"></div>
        </div>
      </div>

      {/* Footer Notes in Urdu */}
      <div className="text-right text-xs space-y-1 border-t border-black pt-2">
        <p>❌ یہ رسید قبل از وقت بھی جمع کروائی جا سکتی ہے۔</p>
        <p>❌ اگر کوئی stamp پر Received stamp نہ ہو تو اس کی کوئی قانونی حیثیت نہیں ہو گی۔</p>
        <p>❌ فیس کی جمع کرانے کے بعد 7 تاریخ کے بعد یا 300 روپے اضافی کرنے ہوں گے۔</p>
        <p>❌ ادھم فیس پر سختی سے عمل کیا جائے گا۔</p>
      </div>

      {/* Address */}
      <div className="bg-black text-white text-center py-1 text-xs mt-auto">
        AYUB PARK # 04 NEAR ZAIQA BAKAERY OKARA T 0300 5086344
      </div>
    </div>
  );
}
