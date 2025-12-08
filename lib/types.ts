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

// Schedules
export interface RevisionSchedule {
  id: string;
  class_id: string;
  subject: string;
  topic: string;
  revision_date: string;
  teacher_id?: string | null;
  created_at?: string;
}

export interface SeriesExam {
  id: string;
  class_id: string;
  subject: string;
  start_date: string;
  end_date: string;
  duration_minutes?: number | null;
  paper_given_date?: string | null;
  notes?: string | null;
  teacher_id?: string | null;
  created_at?: string;
}

export interface DailyQuiz {
  id: string;
  class_id: string;
  subject: string;
  topic: string;
  quiz_date: string;
  duration_minutes?: number | null;
  teacher_id?: string | null;
  created_at?: string;
}

// Exam Results Management
export interface Exam {
  id: string;
  name: string;
  class_id: string;
  start_date: string;
  end_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface Subject {
  id: string;
  name: string;
  class_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentResult {
  id: string;
  student_id: string;
  subject_id: string;
  exam_id: string;
  marks: number | null;
  total_marks?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StudentResultsTable {
  studentId: string;
  studentName: string;
  [key: string]: string | number | null; // exam_subject_combo -> marks
}

// Exam Chapter Management
export interface ExamChapter {
  id: string;
  exam_id: string;
  subject_id: string;
  chapter_name: string;
  chapter_date: string;
  max_marks: number;
  created_at?: string;
  updated_at?: string;
}

export interface ExamResult {
  id: string;
  student_id: string;
  chapter_id: string;
  class_id: string;
  marks: number | null;
  student?: {
    id: string;
    name: string;
  };
  chapter?: {
    id: string;
    chapter_name: string;
    max_marks: number;
  };
  created_at?: string;
  updated_at?: string;
}