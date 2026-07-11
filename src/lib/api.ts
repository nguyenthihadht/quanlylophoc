/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchoolYear, Grade, Class, Student, Lesson, Assessment, Comment, AppSettings, SystemBackup, SemesterScore, TimelineWeek } from '../types';
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
  timeline: [] as TimelineWeek[],
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

  // Timeline/Curriculum Distribution Framework
  public static getTimeline(): TimelineWeek[] {
    return this.cache.timeline || [];
  }

  public static saveTimeline(timeline: TimelineWeek[]): void {
    this.cache.timeline = timeline;
    this.persist();
  }

  public static addOrUpdateTimelineWeek(week: Partial<TimelineWeek>): TimelineWeek {
    const list = this.getTimeline();
    const existingIndex = list.findIndex(w => w.id === week.id);
    if (existingIndex !== -1) {
      list[existingIndex] = {
        ...list[existingIndex],
        ...week
      } as TimelineWeek;
      this.cache.timeline = [...list];
      this.persist();
      return list[existingIndex];
    } else {
      const newWeek: TimelineWeek = {
        id: week.id || generateUniqueId('timeline'),
        stt: week.stt || (list.length + 1),
        week: week.week || `Tuần ${list.length + 1}`,
        startDate: week.startDate || new Date().toISOString().split('T')[0],
        endDate: week.endDate || new Date().toISOString().split('T')[0],
        semester: week.semester || 'Học kỳ 1'
      };
      this.cache.timeline = [...list, newWeek];
      this.persist();
      return newWeek;
    }
  }

  public static deleteTimelineWeek(id: string): void {
    this.cache.timeline = this.getTimeline().filter(w => w.id !== id);
    this.persist();
  }

  public static clearTimeline(): void {
    this.cache.timeline = [];
    this.persist();
  }

  public static generateDefaultTimeline(startYearDateStr: string = '2025-09-01'): TimelineWeek[] {
    const timeline: TimelineWeek[] = [];
    const startDate = new Date(startYearDateStr);
    
    const defaultLessons = [
      "Bài 1: Thông tin và quyết định",
      "Bài 2: Khám phá máy tính và các bộ phận",
      "Bài 3: Làm quen với bàn phím và chuột máy tính",
      "Bài 4: Các thao tác cơ bản với máy tính",
      "Bài 5: Tập gõ bàn phím với phần mềm luyện ngón",
      "Bài 6: Thư mục và tệp tin trong máy tính",
      "Bài 7: Làm quen với hệ điều hành và giao diện Windows",
      "Bài 8: Khái niệm về mạng Internet",
      "Bài 9: Sử dụng trình duyệt Web cơ bản",
      "Bài 10: Tìm kiếm thông tin hữu ích trên Internet",
      "Bài 11: Lưu trữ thông tin và tải tệp từ Web an toàn",
      "Bài 12: An toàn thông tin khi tham gia môi trường số",
      "Bài 13: Làm quen với phần mềm soạn thảo văn bản Word",
      "Bài 14: Định dạng văn bản cơ bản (Phông chữ, cỡ chữ, màu sắc)",
      "Bài 15: Chèn hình ảnh minh họa và căn lề đoạn văn",
      "Bài 16: Tạo bảng biểu dữ liệu và lập danh sách",
      "Ôn tập thực hành tổng hợp học kỳ 1",
      "Đánh giá chất lượng Cuối Học kỳ 1",
      "Bài 17: Làm quen với ngôn ngữ lập trình trực quan Scratch",
      "Bài 18: Các câu lệnh di chuyển và vẽ hình học cơ bản",
      "Bài 19: Thiết lập cấu trúc vòng lặp trong Scratch",
      "Bài 20: Sử dụng biến số và thực hiện phép tính toán",
      "Bài 21: Tạo âm thanh sống động và sự kiện tương tác",
      "Bài 22: Thiết kế trò chơi Hứng quả táo rơi đơn giản",
      "Bài 23: Làm quen với phần mềm trình chiếu PowerPoint",
      "Bài 24: Tạo trang chiếu mới và định dạng văn bản",
      "Bài 25: Thiết kế bố cục và màu nền trang chiếu chuyên nghiệp",
      "Bài 26: Chèn hình ảnh, sơ đồ và tệp đa phương tiện vào slide",
      "Bài 27: Thiết lập hiệu ứng chuyển động chuyển trang sinh động",
      "Bài 28: Thực hành thiết kế bài thuyết trình giới thiệu bản thân",
      "Bài 29: Giải quyết vấn đề thực tế với sự trợ giúp của máy tính",
      "Bài 30: Quản lý tệp và thư mục bài tập thực hành nâng cao",
      "Ôn tập kiến thức thực hành tổng hợp học kỳ 2",
      "Đánh giá năng lực thực hành Cuối Học kỳ 2",
      "Tổng kết năm học học tập môn Tin học và trưng bày sản phẩm"
    ];

    // In Vietnam, standard school year starts around early September and has 35 weeks of active study
    for (let i = 1; i <= 35; i++) {
      const weekStart = new Date(startDate.getTime());
      weekStart.setDate(startDate.getDate() + (i - 1) * 7);
      
      const weekEnd = new Date(weekStart.getTime());
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];
      
      // Weeks 1-18 are Semester 1, 19-35 are Semester 2
      const semester = i <= 18 ? 'Học kỳ 1' : 'Học kỳ 2';
      
      timeline.push({
        id: `timeline_week_${i}_${Date.now()}`,
        stt: i,
        week: `Tuần ${i}`,
        startDate: startStr,
        endDate: endStr,
        semester,
        lessonName: defaultLessons[i - 1] || `Bài học Tuần ${i}`
      });
    }
    
    this.cache.timeline = timeline;
    this.persist();
    return timeline;
  }

  public static getTimelineForDate(dateStr: string): TimelineWeek | undefined {
    const list = this.getTimeline();
    const dateVal = new Date(dateStr).getTime();
    
    return list.find(w => {
      const sVal = new Date(w.startDate).getTime();
      const eVal = new Date(w.endDate).getTime();
      return dateVal >= sVal && dateVal <= eVal;
    });
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
      timeline: this.getTimeline(),
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
          timeline: backup.timeline || [],
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
  public static async generateAIComment(studentId: string, period?: string): Promise<string> {
    const student = this.getStudents().find(s => s.id === studentId);
    if (!student) throw new Error('Student not found');

    const clazz = this.getClasses().find(c => c.id === student.classId);
    const grade = clazz ? this.getGrades().find(g => g.id === clazz.gradeId) : null;
    const studentAssessments = this.getAssessments().filter(a => a.studentId === studentId);
    const studentScores = (this.cache.scores || []).filter(s => s.studentId === studentId);

    // Short summary of recent grades
    const assessmentsSummary = studentAssessments.slice(-10).map(a => ({
      date: a.date,
      completion: a.completion,
      attitude: a.attitude,
      skill: a.skill,
      cooperation: a.cooperation
    }));

    // Comprehensive learning process metrics
    const totalLessonsEvaluated = studentAssessments.length;
    const completionStats = {
      excellent: studentAssessments.filter(a => a.completion === 'Hoàn thành tốt').length,
      completed: studentAssessments.filter(a => a.completion === 'Hoàn thành').length,
      notCompleted: studentAssessments.filter(a => a.completion === 'Chưa hoàn thành').length
    };
    const attitudeStats = {
      positive: studentAssessments.filter(a => a.attitude === 'Tích cực').length,
      normal: studentAssessments.filter(a => a.attitude === 'Bình thường').length,
      needsImprovement: studentAssessments.filter(a => a.attitude === 'Chưa tập trung').length
    };
    const skillStats = {
      proficient: studentAssessments.filter(a => a.skill === 'Thành thạo').length,
      passed: studentAssessments.filter(a => a.skill === 'Đạt').length,
      needsImprovement: studentAssessments.filter(a => a.skill === 'Cần hỗ trợ').length
    };
    const cooperationStats = {
      good: studentAssessments.filter(a => a.cooperation === 'Tốt').length,
      passed: studentAssessments.filter(a => a.cooperation === 'Đạt').length,
      needsImprovement: studentAssessments.filter(a => a.cooperation === 'Cần cố gắng').length
    };

    try {
      const response = await fetch('/api/gemini/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student.name,
          gradeName: grade?.name || 'Chưa rõ',
          className: clazz?.name || 'Chưa rõ',
          totalLessonsEvaluated,
          completionStats,
          attitudeStats,
          skillStats,
          cooperationStats,
          assessments: assessmentsSummary,
          scores: studentScores.map(s => ({ semester: s.semester, score: s.score })),
          notes: student.note,
          currentTimelineWeek: this.getTimelineForDate(new Date().toISOString().split('T')[0]) || null,
          timeline: this.getTimeline(),
          period: period
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
