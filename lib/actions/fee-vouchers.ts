"use server";

import { createClient } from "@/lib/supabase/server";

interface FeeVoucherData {
  studentId: string;
  rollNumber: string;
  studentName: string;
  fatherName: string;
  className: string;
  month: string;
  serialNumber: number;
  issueDate: string;
  dueDate: string;
  monthlyFee: number;
  arrears: number;
  /** Human readable breakdown like "Jan 2025, Feb 2025" for pending months */
  arrearsMonthsLabel?: string;
  fines: number;
  annualCharges: number;
  examFee: number;
  otherCharges: number;
  totalAmount: number;
  finePerDay: number;
  daysLate: number;
  acNumber?: string;
}

export async function generateSerialNumber(): Promise<number> {
  const supabase = await createClient();

  // Get the latest voucher serial number from the database
  const { data, error } = await supabase
    .from("fee_vouchers")
    .select("serial_number")
    .order("serial_number", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "no rows returned"
    console.error("Error fetching serial number:", error);
    return 1;
  }

  return (data?.serial_number || 0) + 1;
}

export async function getFeeVoucherData(
  studentId: string,
  includeFine: boolean = false,
  serialNumber?: number,
  removeArrears: boolean = false,
): Promise<{ data: FeeVoucherData | null; error: string | null }> {
  const supabase = await createClient();

  // Fetch basic student data first (without relying on Supabase FK relationship names)
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, name, roll_number, guardian_name, class_id, ac_number")
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    console.error("getFeeVoucherData: student lookup failed", {
      studentId,
      studentError,
    });
    return { data: null, error: "Student not found" };
  }

  // Try to resolve class name separately (non-fatal if it fails)
  let className = "";
  if (student.class_id) {
    const { data: classRow, error: classError } = await supabase
      .from("classes")
      .select("name")
      .eq("id", student.class_id)
      .single();

    if (classError) {
      console.warn("getFeeVoucherData: class lookup failed", {
        studentId,
        classId: student.class_id,
        classError,
      });
    } else {
      className = classRow?.name || "";
    }
  }

  // Get current date
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Fetch all unpaid fees for this student
  const { data: fees, error: feesError } = await supabase
    .from("student_fees")
    .select("*")
    .eq("student_id", studentId)
    .eq("status", "unpaid")
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  if (feesError) {
    return { data: null, error: "Error fetching fees data" };
  }

  // If no unpaid fees found, check if student has ANY fees (for current month)
  let currentMonthFeeRecord = null;
  if (!fees || fees.length === 0) {
    const { data: currentFee } = await supabase
      .from("student_fees")
      .select("*")
      .eq("student_id", studentId)
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .single();
    
    if (currentFee) {
      currentMonthFeeRecord = currentFee;
    }
  }

  // Calculate arrears (previous months unpaid) and collect month labels
  let arrears = 0;
  let currentMonthFee = 0;
  const arrearsMonthLabels: string[] = [];

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  fees?.forEach((fee) => {
    const isPreviousMonth =
      fee.year < currentYear ||
      (fee.year === currentYear && fee.month < currentMonth);

    if (isPreviousMonth && !removeArrears) {
      arrears += fee.amount;
      const label = `${monthNames[fee.month - 1]} ${fee.year}`;
      if (!arrearsMonthLabels.includes(label)) {
        arrearsMonthLabels.push(label);
      }
    } else if (fee.year === currentYear && fee.month === currentMonth) {
      currentMonthFee = fee.amount;
    }
  });

  // If currentMonthFee is still 0, use the current month fee record (even if paid)
  if (currentMonthFee === 0 && currentMonthFeeRecord) {
    currentMonthFee = currentMonthFeeRecord.amount;
  }

  // Calculate fine if enabled
  let fines = 0;
  let daysLate = 0;
  const FINE_PER_DAY = 20;
  
  if (includeFine) {
    const dueDate = new Date(currentYear, currentMonth - 1, 12);
    const today = new Date();
    
    if (today > dueDate) {
      daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      fines = daysLate * FINE_PER_DAY;
    }
  }

  // Generate serial number if not provided
  const finalSerialNumber = serialNumber ?? await generateSerialNumber();

  // Format dates
  const issueDate = now.toISOString().split("T")[0];
  const dueDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-12`;

  // Get current month name
  const month = monthNames[currentMonth - 1];

  const voucherData: FeeVoucherData = {
    studentId: student.id,
    rollNumber: student.roll_number || "",
    studentName: student.name,
    fatherName: student.guardian_name || "",
    className,
    month,
    serialNumber: finalSerialNumber,
    issueDate,
    dueDate,
    monthlyFee: currentMonthFee,
    arrears,
    arrearsMonthsLabel:
      arrears > 0 && arrearsMonthLabels.length > 0
        ? arrearsMonthLabels.join(", ")
        : undefined,
    fines,
    annualCharges: 0,
    examFee: 0,
    otherCharges: 0,
    totalAmount: currentMonthFee + arrears + fines,
    finePerDay: FINE_PER_DAY,
    daysLate,
    acNumber: student.ac_number || undefined,
  };

  return { data: voucherData, error: null };
}

export async function getMultipleFeeVouchers(
  studentIds: string[],
  includeFine: boolean = false,
  removeArrears: boolean = false,
): Promise<{ data: FeeVoucherData[]; error: string | null }> {
  const vouchers: FeeVoucherData[] = [];

  // Generate sequential serial numbers for all students
  let currentSerialNumber = await generateSerialNumber();

  for (const studentId of studentIds) {
    const { data, error } = await getFeeVoucherData(studentId, includeFine, currentSerialNumber, removeArrears);
    if (data) {
      vouchers.push(data);
      // Increment serial number for next student
      currentSerialNumber++;
    }
  }

  return { data: vouchers, error: null };
}

export async function saveFeeVoucher(voucherData: FeeVoucherData): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("fee_vouchers")
    .insert({
      serial_number: voucherData.serialNumber,
      student_id: voucherData.studentId,
      issue_date: voucherData.issueDate,
      due_date: voucherData.dueDate,
      monthly_fee: voucherData.monthlyFee,
      arrears: voucherData.arrears,
      fines: voucherData.fines,
      annual_charges: voucherData.annualCharges,
      exam_fee: voucherData.examFee,
      other_charges: voucherData.otherCharges,
      total_amount: voucherData.totalAmount,
      month: voucherData.month,
    });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
