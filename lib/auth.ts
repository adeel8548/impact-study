// Simple in-memory authentication (for demo; use database in production)
let currentUser: any = null;

export const mockUsers = [
  {
    id: "1",
    email: "admin@school.com",
    password: "admin123",
    name: "School Admin",
    role: "admin" as const,
  },
  {
    id: "2",
    email: "teacher@school.com",
    password: "teacher123",
    name: "John Teacher",
    role: "teacher" as const,
  },
];

export function login(email: string, password: string) {
  const user = mockUsers.find(
    (u) => u.email === email && u.password === password,
  );
  if (user) {
    currentUser = user;
    return user;
  }
  return null;
}

export function logout() {
  currentUser = null;
}

export function getCurrentUser() {
  return currentUser;
}

export function isAuthenticated() {
  return currentUser !== null;
}
