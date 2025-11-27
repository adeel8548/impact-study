// User roles and authentication types
export type UserRole = "admin" | "teacher";

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Student types
export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  classId: string;
  schoolId: string;
  email?: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Teacher types
export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  classIds: string[]; // Classes assigned to this teacher
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Class types
export interface Class {
  id: string;
  name: string;
  section: string;
  teacherId: string;
  schoolId: string;
  studentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Attendance types
export interface StudentAttendance {
  id: string;
  studentId: string;
  classId: string;
  date: Date;
  status: "present" | "absent" | "leave";
  remarks?: string;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherAttendance {
  id: string;
  teacherId: string;
  date: Date;
  status: "present" | "absent" | "leave";
  remarks?: string;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Fees types
export interface StudentFees {
  id: string;
  studentId: string;
  month: number; // 1-12
  year: number;
  amount: number;
  status: "paid" | "unpaid";
  paidDate?: Date;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Salary types
export interface TeacherSalary {
  id: string;
  teacherId: string;
  month: number; // 1-12
  year: number;
  amount: number;
  status: "paid" | "unpaid";
  paidDate?: Date;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard stats
export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalFeesCollected: number;
  monthlyFeesCollected: number;
  totalFeesPending: number;
  totalSalaryPaid: number;
  monthlySalaryPaid: number;
  remainingBalance: number;
}
