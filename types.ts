
export interface ClassSession {
  id: string;
  className: string;
  topic: string;
  aiSummary?: string;
  timestamp: number;
  teacherId?: string; // Added for ownership security
}

export interface StudentAttendance {
  id: string;
  sessionId: string;
  teacherId: string; // Added for teacher-specific storage
  studentName: string;
  studentId: string;
  department: string;
  academicStage: string;
  branch: string;
  studyType: string;
  timestamp: number;
  aiMotivation?: string;
  uid?: string; // Added for ownership security
}

export interface QRCodeData {
  sessionId: string;
  teacherId: string; // Added for teacher-specific storage
  className: string;
  topic: string;
  timestamp?: number;
}

export interface StudentProfile {
  name: string;
  studentId: string;
  department: string;
  academicStage: 'First Year' | 'Second Year' | 'Third Year' | 'Fourth Year';
  branch: 'A' | 'B';
  studyType: 'Morning' | 'Evening';
  profileImage?: string;
  uid?: string; // Added for persistence
}

export interface TeacherProfile {
  name: string;
  email: string;
  className: string;
  profileImage?: string;
  googleSheetUrl?: string;
  uid?: string; // Added for persistence
}

export enum UserRole {
  NONE = 'NONE',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN'
}

export enum AppView {
  ROLE_SELECTION = 'ROLE_SELECTION',
  TEACHER_DASHBOARD = 'TEACHER_DASHBOARD',
  STUDENT_SCANNER = 'STUDENT_SCANNER',
  STUDENT_FORM = 'STUDENT_FORM',
  STUDENT_SUCCESS = 'STUDENT_SUCCESS',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD'
}
