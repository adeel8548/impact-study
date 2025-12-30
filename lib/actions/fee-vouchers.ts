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
  fines: number;
  annualCharges: number;
  examFee: number;
  otherCharges: number;
  totalAmount: number;
  finePerDay: number;
  daysLate: number;
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
): Promise<{ data: FeeVoucherData | null; error: string | null }> {
  const supabase = await createClient();

  // Fetch student data with class info
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(`
      id,
      name,
      roll_number,
      guardian_name,
      class_id,
      classes(name)
    `)
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    return { data: null, error: "Student not found" };
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

  // Calculate arrears (previous months unpaid)
  let arrears = 0;
  let currentMonthFee = 0;

  fees?.forEach((fee) => {
    if (fee.year < currentYear || (fee.year === currentYear && fee.month < currentMonth)) {
      arrears += fee.amount;
    } else if (fee.year === currentYear && fee.month === currentMonth) {
      currentMonthFee = fee.amount;
    }
  });

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

  // Generate serial number
  const serialNumber = await generateSerialNumber();

  // Format dates
  const issueDate = now.toISOString().split("T")[0];
  const dueDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-12`;

  // Get month name
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = monthNames[currentMonth - 1];

  const voucherData: FeeVoucherData = {
    studentId: student.id,
    rollNumber: student.roll_number || "",
    studentName: student.name,
    fatherName: student.guardian_name || "",
    className: (student.classes as any)?.[0]?.name || "",
    month,
    serialNumber,
    issueDate,
    dueDate,
    monthlyFee: currentMonthFee,
    arrears,
    fines,
    annualCharges: 0,
    examFee: 0,
    otherCharges: 0,
    totalAmount: currentMonthFee + arrears + fines,
    finePerDay: FINE_PER_DAY,
    daysLate,
  };

  return { data: voucherData, error: null };
}

export async function getMultipleFeeVouchers(
  studentIds: string[],
  includeFine: boolean = false,
): Promise<{ data: FeeVoucherData[]; error: string | null }> {
  const vouchers: FeeVoucherData[] = [];

  for (const studentId of studentIds) {
    const { data, error } = await getFeeVoucherData(studentId, includeFine);
    if (data) {
      vouchers.push(data);
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
