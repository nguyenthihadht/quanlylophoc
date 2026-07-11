/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchoolYear, Grade, Class, Student, Lesson, Assessment, Comment, AppSettings, SystemBackup, SemesterScore } from '../types';
import { loadStateFromFirestore, saveStateToFirestore } from './firebase';

function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Default mock database state in case server is loading or offline
const DEFAULT_STATE = {
  schoolYears: [] as SchoolYear[],
  grades: [] as Grade[],
  classes: [] as Class[],
  students: [] as Student[],
  lessons: [] as Lesson[],
  assessments: [] as Assessment[],
  comments: [] as Comment[],
  scores: [] as SemesterScore[],
  settings: {
    schoolName: 'Trường Tiểu học Thuận Giao',
    teacherName: 'Cô Nguyễn Thị Hà',
    theme: 'light' as 'light' | 'dark',
    adminPassword: '123456',
    requirePassword: true
  } as AppSettings
};

// API Service class
export class ClassTrackerAPI {
  private static cache: typeof DEFAULT_STATE = { ...DEFAULT_STATE };
  private static isLoaded = false;
  private static onStateChangeListeners: (() => void)[] = [];

  // Register listener for reactive updates
  public static subscribe(listener: () => void) {
    this.onStateChangeListeners.push(listener);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter(l => l !== listener);
    };
  }

  private static notify() {
    this.onStateChangeListeners.forEach(listener => listener());
  }

  private static sanitizeDuplicateStudentIds() {
    if (!this.cache || !this.cache.students) return;
    const seenIds = new Set<string>();
    const duplicates = new Set<string>();
    
    this.cache.students.forEach(s => {
      if (seenIds.has(s.id)) {
        duplicates.add(s.id);
      } else {
        seenIds.add(s.id);
      }
    });

    if (duplicates.size === 0) return;

    console.log(`Sanitizing database: found duplicates for student IDs:`, Array.from(duplicates));

    const usedIds = new Set(this.cache.students.map(s => s.id));
    const processedIds = new Set<string>();
    
    this.cache.students = this.cache.students.map((s, index) => {
      if (processedIds.has(s.id)) {
        let newId = s.id;
        while (true) {
          newId = `student_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`;
          if (!usedIds.has(newId)) {
            break;
          }
        }
        usedIds.add(newId);
        return { ...s, id: newId };
      } else {
        processedIds.add(s.id);
        return s;
      }
    });

    this.persist();
  }

  // Load complete state from Firestore (with server and LocalStorage as robust fallbacks)
  public static async init() {
    // 1. Try Firestore first
    try {
      const firestoreData = await loadStateFromFirestore();
      if (firestoreData && Object.keys(firestoreData).length > 0) {
        this.cache = firestoreData;
        this.isLoaded = true;
        this.sanitizeDuplicateStudentIds();
        localStorage.setItem('class_tracker_backup', JSON.stringify(this.cache));
        this.notify();
        return this.cache;
      }
    } catch (error) {
      console.warn('Could not load data from Firestore, trying fallback paths', error);
    }

    // 2. Fallback to Express backend
    try {
      const response = await fetch('/api/db');
      if (response.ok) {
        const data = await response.json();
        this.cache = data;
        this.isLoaded = true;
        this.sanitizeDuplicateStudentIds();
        // Save to LocalStorage as a local backup copy
        localStorage.setItem('class_tracker_backup', JSON.stringify(data));
        this.notify();
        return this.cache;
      }
    } catch (error) {
      console.warn('Could not load data from Express server, using LocalStorage backup or defaults', error);
    }

    // 3. Fallback to LocalStorage
    const local = localStorage.getItem('class_tracker_backup');
    if (local) {
      try {
        this.cache = JSON.parse(local);
        this.isLoaded = true;
        this.sanitizeDuplicateStudentIds();
        this.notify();
        return this.cache;
      } catch (e) {
        console.error('Failed to parse localStorage data', e);
      }
    }

    // Default or seed data
    this.cache = { ...DEFAULT_STATE };
    this.isLoaded = true;
    this.sanitizeDuplicateStudentIds();
    this.notify();
    return this.cache;
  }

  // Save changes to Firestore, Server and LocalStorage
  private static async persist() {
    localStorage.setItem('class_tracker_backup', JSON.stringify(this.cache));
    this.notify();

    // 1. Save to Firestore
    try {
      await saveStateToFirestore(this.cache);
    } catch (error) {
      console.warn('Failed to sync state to Firestore:', error);
    }

    // 2. Save to local Express backup
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.cache)
      });
    } catch (e) {
      console.warn('Failed to sync state to server, saved locally in browser and Firestore', e);
    }
  }

  // Current State Getters
  public static getState() {
    return this.cache;
  }

  // Manually push current local state to Firebase Firestore
  public static async forceSyncToFirestore(): Promise<boolean> {
    try {
      const success = await saveStateToFirestore(this.cache);
      return success;
    } catch (e) {
      console.error('Failed manual sync to Firestore:', e);
      return false;
    }
  }

  // Manually fetch and load state from Firebase Firestore
  public static async forceLoadFromFirestore(): Promise<boolean> {
    try {
      const firestoreData = await loadStateFromFirestore();
      if (firestoreData && Object.keys(firestoreData).length > 0) {
        this.cache = firestoreData;
        this.notify();
        localStorage.setItem('class_tracker_backup', JSON.stringify(firestoreData));
        return true;
      }
    } catch (e) {
      console.error('Failed manual load from Firestore:', e);
    }
    return false;
  }

  // School Years
  public static getSchoolYears(): SchoolYear[] {
    return this.cache.schoolYears || [];
  }

  public static addSchoolYear(name: string): SchoolYear {
    const years = this.getSchoolYears();
    const isCurrent = years.length === 0; // default current if first
    const newYear: SchoolYear = {
      id: generateUniqueId('year'),
      name,
      isCurrent
    };
    this.cache.schoolYears = [...years, newYear];
    this.persist();
    return newYear;
  }

  public static updateSchoolYear(id: string, name: string): void {
    this.cache.schoolYears = this.getSchoolYears().map(y => y.id === id ? { ...y, name } : y);
    this.persist();
  }

  public static deleteSchoolYear(id: string): void {
    this.cache.schoolYears = this.getSchoolYears().filter(y => y.id !== id);
    this.persist();
  }

  public static setCurrentSchoolYear(id: string): void {
    this.cache.schoolYears = this.getSchoolYears().map(y => ({
      ...y,
      isCurrent: y.id === id
    }));
    this.persist();
  }

  public static getCurrentSchoolYear(): SchoolYear | undefined {
    return this.getSchoolYears().find(y => y.isCurrent);
  }

  // Grades
  public static getGrades(): Grade[] {
    return this.cache.grades || [];
  }

  public static addGrade(name: string): Grade {
    const newGrade: Grade = {
      id: generateUniqueId('grade'),
      name
    };
    this.cache.grades = [...this.getGrades(), newGrade];
    this.persist();
    return newGrade;
  }

  public static updateGrade(id: string, name: string): void {
    this.cache.grades = this.getGrades().map(g => g.id === id ? { ...g, name } : g);
    this.persist();
  }

  public static deleteGrade(id: string): void {
    this.cache.grades = this.getGrades().filter(g => g.id !== id);
    // Cascade delete classes
    const classesToDelete = this.getClasses().filter(c => c.gradeId === id);
    this.cache.classes = this.getClasses().filter(c => c.gradeId !== id);
    
    // Cascade delete students in those classes
    const classIds = classesToDelete.map(c => c.id);
    this.cache.students = this.getStudents().filter(s => !classIds.includes(s.classId));
    this.persist();
  }

  // Classes
  public static getClasses(): Class[] {
    return this.cache.classes || [];
  }

  public static addClass(name: string, gradeId: string, homeroomTeacher?: string): Class {
    const newClass: Class = {
      id: generateUniqueId('class'),
      name,
      gradeId,
      homeroomTeacher
    };
    this.cache.classes = [...this.getClasses(), newClass];
    this.persist();
    return newClass;
  }

  public static updateClass(id: string, name: string, gradeId: string, homeroomTeacher?: string): void {
    this.cache.classes = this.getClasses().map(c => c.id === id ? { ...c, name, gradeId, homeroomTeacher } : c);
    this.persist();
  }

  public static deleteClass(id: string): void {
    this.cache.classes = this.getClasses().filter(c => c.id !== id);
    // Cascade delete students
    this.cache.students = this.getStudents().filter(s => s.classId !== id);
    this.persist();
  }

  // Students
  public static getStudents(): Student[] {
    return this.cache.students || [];
  }

  public static addStudent(student: Omit<Student, 'id'>): Student {
    const newStudent: Student = {
      ...student,
      id: generateUniqueId('student')
    };
    this.cache.students = [...this.getStudents(), newStudent];
    this.persist();
    return newStudent;
  }

  public static updateStudent(id: string, updatedFields: Partial<Omit<Student, 'id'>>): void {
    this.cache.students = this.getStudents().map(s => s.id === id ? { ...s, ...updatedFields } : s);
    this.persist();
  }

  public static deleteStudent(id: string): void {
    this.cache.students = this.getStudents().filter(s => s.id !== id);
    // Cascade delete assessments and comments
    this.cache.assessments = (this.cache.assessments || []).filter(a => a.studentId !== id);
    this.cache.comments = (this.cache.comments || []).filter(c => c.studentId !== id);
    this.persist();
  }

  // Lessons & Diaries
  public static getLessons(): Lesson[] {
    return this.cache.lessons || [];
  }

  public static addLesson(lesson: Omit<Lesson, 'id'>): Lesson {
    const newLesson: Lesson = {
      ...lesson,
      id: generateUniqueId('lesson')
    };
    this.cache.lessons = [...this.getLessons(), newLesson];
    this.persist();
    return newLesson;
  }

  public static updateLesson(id: string, lessonName: string, content: string, date: string): void {
    this.cache.lessons = this.getLessons().map(l => l.id === id ? { ...l, lessonName, content, date } : l);
    this.persist();
  }

  public static deleteLesson(id: string): void {
    this.cache.lessons = this.getLessons().filter(l => l.id !== id);
    // Delete associated assessments
    this.cache.assessments = (this.cache.assessments || []).filter(a => a.lessonId !== id);
    this.persist();
  }

  // Assessments
  public static getAssessments(): Assessment[] {
    return this.cache.assessments || [];
  }

  public static saveAssessments(lessonId: string, date: string, studentAssessments: Omit<Assessment, 'id' | 'lessonId' | 'date'>[]): void {
    const currentAssessments = this.getAssessments().filter(a => a.lessonId !== lessonId);
    
    const newAssessments: Assessment[] = studentAssessments.map((sa, idx) => ({
      id: `assess_${lessonId}_${sa.studentId || idx}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      lessonId,
      date,
      studentId: sa.studentId,
      completion: sa.completion,
      attitude: sa.attitude,
      skill: sa.skill,
      cooperation: sa.cooperation
    }));

    this.cache.assessments = [...currentAssessments, ...newAssessments];
    this.persist();
  }

  // Comments
  public static getComments(): Comment[] {
    return this.cache.comments || [];
  }

  public static addComment(studentId: string, content: string, type: 'AI' | 'Thủ công'): Comment {
    const newComment: Comment = {
      id: generateUniqueId('comment'),
      studentId,
      content,
      createdBy: this.cache.settings?.teacherName || 'Giáo viên',
      date: new Date().toISOString().split('T')[0],
      type
    };
    this.cache.comments = [...this.getComments(), newComment];
    this.persist();
    return newComment;
  }

  public static deleteComment(id: string): void {
    this.cache.comments = this.getComments().filter(c => c.id !== id);
    this.persist();
  }

  // Scores
  public static getScores(): SemesterScore[] {
    return this.cache.scores || [];
  }

  public static addOrUpdateScore(studentId: string, semester: 'Cuối học kỳ 1' | 'Cuối học kỳ 2', score: number): SemesterScore {
    if (!this.cache.scores) {
      this.cache.scores = [];
    }
    const existingIndex = this.cache.scores.findIndex(s => s.studentId === studentId && s.semester === semester);
    const date = new Date().toISOString().split('T')[0];
    if (existingIndex > -1) {
      this.cache.scores[existingIndex] = {
        ...this.cache.scores[existingIndex],
        score,
        date
      };
      this.persist();
      return this.cache.scores[existingIndex];
    } else {
      const newScore: SemesterScore = {
        id: generateUniqueId('score'),
        studentId,
        semester,
        score,
        date
      };
      this.cache.scores = [...this.cache.scores, newScore];
      this.persist();
      return newScore;
    }
  }

  // Settings
  public static getSettings(): AppSettings {
    return this.cache.settings || {
      schoolName: 'Trường Tiểu học Nguyễn Du',
      teacherName: 'Cô Nguyễn Thị Hà',
      theme: 'light'
    };
  }

  public static updateSettings(settings: Partial<AppSettings>): void {
    this.cache.settings = {
      ...this.getSettings(),
      ...settings
    };
    this.persist();
  }

  // Backup & Restore
  public static exportBackup(): string {
    const backup: SystemBackup = {
      schoolYears: this.getSchoolYears(),
      grades: this.getGrades(),
      classes: this.getClasses(),
      students: this.getStudents(),
      lessons: this.getLessons(),
      assessments: this.getAssessments(),
      comments: this.getComments(),
      scores: this.getScores(),
      settings: this.getSettings(),
      backupDate: new Date().toISOString()
    };
    return JSON.stringify(backup, null, 2);
  }

  public static importBackup(jsonString: string): boolean {
    try {
      const backup = JSON.parse(jsonString) as SystemBackup;
      if (
        Array.isArray(backup.schoolYears) &&
        Array.isArray(backup.grades) &&
        Array.isArray(backup.classes) &&
        Array.isArray(backup.students)
      ) {
        this.cache = {
          schoolYears: backup.schoolYears,
          grades: backup.grades,
          classes: backup.classes,
          students: backup.students,
          lessons: backup.lessons || [],
          assessments: backup.assessments || [],
          comments: backup.comments || [],
          scores: backup.scores || [],
          settings: backup.settings || {
            schoolName: 'Trường Tiểu học Thuận Giao',
            teacherName: 'Cô Nguyễn Thị Hà',
            theme: 'light',
            adminPassword: '123456',
            requirePassword: true
          }
        };
        this.persist();
        return true;
      }
    } catch (e) {
      console.error('Restore failed: invalid backup format', e);
    }
    return false;
  }

  // AI Integration
  public static async generateAIComment(studentId: string): Promise<string> {
    const student = this.getStudents().find(s => s.id === studentId);
    if (!student) throw new Error('Student not found');

    const clazz = this.getClasses().find(c => c.id === student.classId);
    const grade = clazz ? this.getGrades().find(g => g.id === clazz.gradeId) : null;
    const studentAssessments = this.getAssessments().filter(a => a.studentId === studentId);
    const studentScores = (this.cache.scores || []).filter(s => s.studentId === studentId);

    // Short summary of recent grades
    const assessmentsSummary = studentAssessments.slice(-5).map(a => ({
      date: a.date,
      completion: a.completion,
      attitude: a.attitude,
      skill: a.skill,
      cooperation: a.cooperation
    }));

    try {
      const response = await fetch('/api/gemini/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student.name,
          gradeName: grade?.name || 'Chưa rõ',
          className: clazz?.name || 'Chưa rõ',
          assessments: assessmentsSummary,
          scores: studentScores.map(s => ({ semester: s.semester, score: s.score })),
          notes: student.note
        })
      });

      if (!response.ok) {
        throw new Error('API server failed');
      }

      const data = await response.json();
      return data.comment;
    } catch (error) {
      console.error('Failed to call Gemini AI comment generator, falling back to client simulation', error);
      // Clean fallback generator if server is down
      const completions = studentAssessments.map(a => a.completion);
      const isGood = completions.filter(c => c === 'Hoàn thành tốt').length >= completions.length * 0.5;
      const isOk = completions.filter(c => c === 'Hoàn thành').length >= completions.length * 0.4;
      
      const scoreStr = studentScores.length > 0 
        ? ` (Điểm thi: ${studentScores.map(s => `${s.semester}: ${s.score}/10`).join(', ')})`
        : '';

      if (isGood) {
        return `Em ${student.name} có nhận thức rất nhanh nhạy về môn Tin học. Trong học kỳ qua, em hoàn thành xuất sắc các nội dung thực hành gõ phím và kỹ năng thực tế, tích cực giúp đỡ bạn bè xung quanh học tập.${scoreStr}`;
      } else if (isOk || completions.length === 0) {
        return `Em ${student.name} chăm ngoan, hoàn thành đầy đủ bài thực hành trên lớp. Kỹ năng máy tính đạt yêu cầu chuẩn kiến thức kỹ năng tiểu học, chú ý nghe cô giảng bài.${scoreStr}`;
      } else {
        return `Em ${student.name} cần chú ý tập trung hơn trong giờ học thực hành máy tính. Em vẫn hoàn thành bài nhưng kỹ năng gõ phím còn chậm, cần rèn luyện thêm.${scoreStr}`;
      }
    }
  }

  // Parse Excel/CSV data for students import
  public static parseCSVAndImport(csvText: string, classId: string): { successCount: number; errors: string[] } {
    const lines = csvText.split('\n');
    let successCount = 0;
    const errors: string[] = [];

    // Header validation
    if (lines.length < 2) {
      return { successCount, errors: ['Tệp rỗng hoặc không đúng định dạng'] };
    }

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle split by comma or semi-colon
      const parts = line.split(/[,;\t]/).map(p => p.replace(/^["']|["']$/g, '').trim());
      
      // Expected: Mã HS, Họ tên, Giới tính, Ngày sinh (YYYY-MM-DD), Ghi chú
      if (parts.length < 2) {
        errors.push(`Dòng ${i + 1}: Không đủ thông tin (cần ít nhất Mã HS và Họ tên)`);
        continue;
      }

      const [studentId, name, genderRaw, dobRaw, note] = parts;
      const gender: 'Nam' | 'Nữ' = (genderRaw === 'Nữ' || genderRaw === 'Female') ? 'Nữ' : 'Nam';
      
      // Validate dob format or default to 2017-01-01
      let dob = '2017-01-01';
      if (dobRaw && /^\d{4}-\d{2}-\d{2}$/.test(dobRaw)) {
        dob = dobRaw;
      } else if (dobRaw && /^\d{2}\/\d{2}\/\d{4}$/.test(dobRaw)) {
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const [d, m, y] = dobRaw.split('/');
        dob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      this.addStudent({
        studentId: studentId || `HS${Date.now().toString().slice(-5)}${i}`,
        name: name || 'Học sinh mới',
        gender,
        dob,
        classId,
        note: note || ''
      });
      successCount++;
    }

    return { successCount, errors };
  }
}
