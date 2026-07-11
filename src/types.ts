/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SchoolYear {
  id: string;
  name: string; // e.g., "2025-2026", "2026-2027"
  isCurrent: boolean;
}

export interface Grade {
  id: string;
  name: string; // e.g., "Khối 3", "Khối 4", "Khối 5"
}

export interface Class {
  id: string;
  name: string; // e.g., "3A1", "3A2", "4A1"
  gradeId: string;
  homeroomTeacher?: string; // Giáo viên chủ nhiệm
}

export interface Student {
  id: string;
  studentId: string; // Mã học sinh
  name: string;
  gender: 'Nam' | 'Nữ';
  dob: string; // Ngày sinh YYYY-MM-DD
  classId: string;
  note?: string;
  avatar?: string;
}

export interface Lesson {
  id: string;
  date: string; // YYYY-MM-DD
  classId: string;
  lessonName: string; // Tên bài học
  content: string; // Nội dung bài học
  createdBy: string;
}

export interface Assessment {
  id: string;
  studentId: string;
  lessonId: string;
  date: string; // YYYY-MM-DD
  completion: 'Hoàn thành tốt' | 'Hoàn thành' | 'Chưa hoàn thành';
  attitude: 'Tích cực' | 'Bình thường' | 'Chưa tập trung';
  skill: 'Thành thạo' | 'Đạt' | 'Cần hỗ trợ';
  cooperation: 'Tốt' | 'Đạt' | 'Cần cố gắng';
}

export interface Comment {
  id: string;
  studentId: string;
  content: string;
  createdBy: string;
  date: string;
  type: 'AI' | 'Thủ công';
}

export interface SemesterScore {
  id: string;
  studentId: string;
  semester: 'Cuối học kỳ 1' | 'Cuối học kỳ 2';
  score: number; // e.g. 0 to 10
  date: string;
}

export interface AppSettings {
  schoolName: string;
  teacherName: string;
  theme: 'light' | 'dark';
  adminPassword?: string;
  requirePassword?: boolean;
}

export interface SystemBackup {
  schoolYears: SchoolYear[];
  grades: Grade[];
  classes: Class[];
  students: Student[];
  lessons: Lesson[];
  assessments: Assessment[];
  comments: Comment[];
  scores?: SemesterScore[];
  settings: AppSettings;
  backupDate: string;
}
