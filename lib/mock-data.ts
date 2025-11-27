// Mock database data
export const mockClasses = [
  { id: "1", name: "Class A", section: "10-A", teacherId: "2", studentCount: 35 },
  { id: "2", name: "Class B", section: "10-B", teacherId: "2", studentCount: 32 },
  { id: "3", name: "Class C", section: "9-A", teacherId: "3", studentCount: 38 },
]

export const mockStudents = [
  { id: "1", name: "Rajesh Kumar", rollNumber: "001", classId: "1", email: "rajesh@school.com" },
  { id: "2", name: "Priya Singh", rollNumber: "002", classId: "1", email: "priya@school.com" },
  { id: "3", name: "Amit Patel", rollNumber: "003", classId: "1", email: "amit@school.com" },
  { id: "4", name: "Neha Verma", rollNumber: "001", classId: "2", email: "neha@school.com" },
  { id: "5", name: "Vikram Sharma", rollNumber: "002", classId: "2", email: "vikram@school.com" },
]

export const mockTeachers = [
  { id: "2", name: "John Teacher", email: "john@school.com", classIds: ["1", "2"] },
  { id: "3", name: "Sarah William", email: "sarah@school.com", classIds: ["3"] },
]

export const mockAttendance = [
  { id: "1", studentId: "1", classId: "1", date: new Date("2025-11-24"), status: "present" as const },
  { id: "2", studentId: "2", classId: "1", date: new Date("2025-11-24"), status: "present" as const },
  { id: "3", studentId: "3", classId: "1", date: new Date("2025-11-24"), status: "absent" as const },
]

export const mockFees = [
  {
    id: "1",
    studentId: "1",
    month: 11,
    year: 2025,
    amount: 5000,
    status: "paid" as const,
    paidDate: new Date("2025-11-15"),
  },
  {
    id: "2",
    studentId: "2",
    month: 11,
    year: 2025,
    amount: 5000,
    status: "paid" as const,
    paidDate: new Date("2025-11-10"),
  },
  { id: "3", studentId: "3", month: 11, year: 2025, amount: 5000, status: "unpaid" as const },
  { id: "4", studentId: "1", month: 10, year: 2025, amount: 5000, status: "paid" as const },
]

export const mockSalaries = [
  {
    id: "1",
    teacherId: "2",
    month: 11,
    year: 2025,
    amount: 50000,
    status: "paid" as const,
    paidDate: new Date("2025-11-01"),
  },
  { id: "2", teacherId: "3", month: 11, year: 2025, amount: 45000, status: "unpaid" as const },
]
