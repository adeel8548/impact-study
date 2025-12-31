"use client";

import React from "react";  
import Logo from "@/app/Assests/imgs/logo_2.png"
import Image from "next/image";
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
  arrearsMonthsLabel?: string;
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
  arrearsMonthsLabel,
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
    <>
      <style jsx>{`
        @media print {
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
        }
      `}</style>
      <div className="w-full max-w-[720px] print:flex-1 print:min-w-0 print:max-w-[calc(50%-4px)] border-2 border-black bg-white text-black font-serif p-4 print:p-1 flex flex-col h-full min-h-[100%] justify-between">
        {/* Header */}
        <div className="border-b-2 border-black "> 
        <div className="text-right font-bold text-sm uppercase">
          {copyType === "head" ? "Head Office Copy" : "Student Copy"}
        </div>
        </div>
        <div className="flex items-center justify-between  pb-2 ">
          <div className="flex items-center gap-3">
            <div className="relative w-20 h-20   overflow-hidden flex items-center justify-center">
              <img
                src={Logo.src}
                alt="Institute logo"
                className="w-full h-full object-contain p-1"
                style={{ 
                  display: 'block',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
                onError={(e) => {
                  // Fallback to logo_2.png if Logo.png doesn't ex:ist
                  const target = e.target as HTMLImageElement;
                  if (target.src !== '/Assests/imgs/logo_2.png') {
                    target.src = '/Assests/imgs/logo_2.png';
                  }
                }}
              />
            </div>
          <div className="text-left">
            <h1 className="text-xl font-bold uppercase">
              Impact Study Institute
            </h1>
            {/* <p className="text-xs font-medium tracking-wide">
              AYUB PARK # 04 NEAR ZAIQA BAKAERY OKARA — T 0300 5086344
            </p> */}
          </div>
        </div>
       
      </div>

      {/* Student Info */}
      <div className="grid grid-cols-3 gap-2 text-sm border-b border-black pb-2 mb-2">
        <div className="border-r border-black pr-2">
          <div className="font-bold border-b border-black">Roll No : <span className="text-xs font-normal">{rollNumber} </span></div>
          
        </div>
        <div className="border-r border-black pr-2">
          <span className="font-bold">Fee A/C</span>
          <div className="border-t border-black mt-1 pt-1"></div>
        </div>
        <div>
          <div className="font-bold border-b border-black pb-1">Serial No.<span className="text-xs font-normal"> {serialNumber}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm border-b border-black pb-2 mb-2">
        <div className="border-r border-black pr-2">
          <div className="font-bold border-b border-black pb-1">Issue Date : <span className="text-xs font-normal">{formatDate(issueDate)}</span></div>
          
        </div>
        <div>
          <div className="font-bold border-b border-black pb-1">Due Date :  <span className="text-xs font-normal">{formatDate(dueDate)}</span></div>
        </div>
      </div>

      <div className="border-b border-black pb-2 mb-2">
        <div className="font-normal text-xs uppercase">Student Name : <span className="text-sm font-bold">{studentName}</span></div>
      </div>

      <div className="border-b border-black pb-2 mb-2">
        <div className="font-normal text-xs uppercase">Father Name : <span className="text-sm font-bold">{fatherName}</span></div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm border-b border-black pb-2 mb-2">
        <div className="border-r border-black pr-2">
          <span className="font-bold">Class / Section</span>
          <div className="border-t border-black mt-1 pt-1 text-right">{className}</div>
        </div>
        <div className="border-r border-black pr-2">
          <span className="font-bold">Month</span>
          <div className="border-t border-black mt-1 pt-1 text-right">{month}</div>
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
        
        <div className="grid grid-cols-2 border-b border-black text-sm">
          <div className="font-bold border-r-2 border-black px-2 py-1">
            Arrears
            {arrearsMonthsLabel && (
              <div className="text-[11px] font-normal mt-1">
                ({arrearsMonthsLabel})
              </div>
            )}
          </div>
          <div className="text-right px-2 py-1">
            {arrears.toLocaleString()}
          </div>
        </div>
        
        <div className="grid grid-cols-2 border-b border-black">
          <div className="font-bold border-r-2 border-black px-2 py-1 text-sm">Fines</div>
          <div className="text-right px-2 py-1 text-sm">{fines.toLocaleString()}</div>
        </div>
        
        <div className="grid grid-cols-2 border-b border-black">
          <div className="font-bold border-r-2 border-black px-2 py-1 text-sm">Annual Charges</div>
          <div className="text-right px-2 py-1 text-sm">{annualCharges.toLocaleString()}</div>
        </div>
        
        {examFee > 0 && (
          <div className="grid grid-cols-2 border-b border-black">
            <div className="font-bold border-r-2 border-black px-2 py-1 text-sm">Exam Fee</div>
            <div className="text-right px-2 py-1 text-sm">{examFee.toLocaleString()}</div>
          </div>
        )}
        
        <div className="grid grid-cols-2 border-b border-black">
          <div className="font-bold border-r-2 border-black px-2 py-1 text-sm">Other Charges</div>
          <div className="text-right px-2 py-1 text-sm">{otherCharges.toLocaleString()}</div>
        </div>
        
        <div className="grid grid-cols-2 bg-gray-100">
          <div className="font-bold border-r-2 border-black px-2 py-1 text-sm">Total Amount</div>
          <div className="text-right px-2 py-1 font-bold text-sm">{totalAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* Late Fee Info */}
      <div className="border-2 border-black mb-2">
        <div className="grid grid-cols-2 border-b border-black">
          <div className="font-bold px-2 py-1 text-xs border-r-2 border-black">
            Amount After 12 of Month(Per day 20 x)
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

      {/* Footer Notes in Urdu and Address, all inside border */}
      <div>
        <div dir="rtl" className="text-right text-[10px] border-t gap-0 border-black pt-1 space-y-0.5 leading-tight">
          <div>۱۔ یہ رسید قبل از وقت بھی جمع کروائی جا سکتی ہے۔</div>
          <div>۲۔ اگر کسی رسید پر Received stamp نہ ہو تو اس کی کوئی قانونی حیثیت نہیں ہو گی۔</div>
          <div>۳۔ فیس 12 تاریخ کے بعد جمع کروانے پر 300 روپے اضافی ادا کرنا ہوں گے۔</div>
          <div>۴۔ ادا شدہ فیس سلپ 3 ماہ تک سنبھال کر رکھیں۔</div>
          <div>۵۔ رسید گم ہونے کی صورت میں ادارہ کسی قسم کا ذمہ دار نہیں ہو گا۔</div>
        </div>
        <div className="bg-black text-white text-center py-0.5 text-[10px] w-full mt-1 leading-tight">
          AYUB PARK # 04 NEAR ZAIQA BAKAERY OKARA  0300 5086344
        </div>
      </div>
    </div>
    </>
  );
}
