/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchoolYear, Grade, Class, Student, Lesson, Assessment, Comment, AppSettings, SystemBackup, SemesterScore, TimelineWeek, WheelSpinRecord, EvaluationLevel } from '../types';
import { loadStateFromFirestore, saveStateToFirestore, setupRealtimeSync } from './firebase';

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
  wheelRecords: [] as WheelSpinRecord[],
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
  private static realtimeUnsubscribe: (() => void) | null = null;
  private static isSyncing = false;

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

  // Self-healing migration: Automatically guarantee that every saved lesson has assessment records for all its students
  public static repairAllLessonAssessments(): boolean {
    if (!this.cache || !this.cache.lessons || !this.cache.students) return false;
    if (!this.cache.assessments) this.cache.assessments = [];

    const existingAssessments = this.cache.assessments;
    let hasRepaired = false;
    const newAssessments: Assessment[] = [];

    this.cache.lessons.forEach(lesson => {
      const currentForLesson = existingAssessments.filter(a => a.lessonId === lesson.id);
      if (currentForLesson.length === 0) {
        const classStudents = this.cache.students.filter(s => s.classId === lesson.classId);
        if (classStudents.length > 0) {
          const absentSet = new Set(lesson.absentStudentIds || []);
          classStudents.forEach((student, idx) => {
            const isAbsent = absentSet.has(student.id);
            newAssessments.push({
              id: `assess_auto_${lesson.id}_${student.id}_${idx}`,
              lessonId: lesson.id,
              date: lesson.date,
              studentId: student.id,
              completion: isAbsent ? 'Chưa hoàn thành' : 'Hoàn thành',
              attitude: 'Bình thường',
              skill: isAbsent ? 'Cần hỗ trợ' : 'Đạt',
              cooperation: isAbsent ? 'Cần cố gắng' : 'Đạt',
              note: isAbsent ? 'Vắng học' : '',
              isAbsent
            });
          });
          hasRepaired = true;
        }
      }
    });

    if (hasRepaired) {
      this.cache.assessments = [...existingAssessments, ...newAssessments];
      this.persist();
      return true;
    }
    return false;
  }

  // Multi-Device Non-Destructive Merge:
  // Merges remote state into local cache without overwriting new local edits
  private static mergeIncomingState(remote: Partial<typeof DEFAULT_STATE>): boolean {
    if (!remote) return false;
    let hasChanges = false;

    // 1. Merge Lessons across devices
    if (Array.isArray(remote.lessons) && remote.lessons.length > 0) {
      const currentLessons = this.cache.lessons || [];
      const lessonMap = new Map<string, Lesson>();

      // Add remote lessons first
      remote.lessons.forEach(l => {
        if (l && l.id) lessonMap.set(l.id, l);
      });

      // Add/preserve local lessons
      currentLessons.forEach(l => {
        if (l && l.id) {
          const existing = lessonMap.get(l.id);
          if (!existing) {
            lessonMap.set(l.id, l);
          } else {
            // Keep local changes if existing
            lessonMap.set(l.id, { ...existing, ...l });
          }
        }
      });

      const mergedLessons = Array.from(lessonMap.values());
      if (mergedLessons.length !== currentLessons.length || JSON.stringify(mergedLessons) !== JSON.stringify(currentLessons)) {
        this.cache.lessons = mergedLessons;
        hasChanges = true;
      }
    }

    // 2. Merge Assessments across devices
    if (Array.isArray(remote.assessments) && remote.assessments.length > 0) {
      const currentAssessments = this.cache.assessments || [];
      const assessMap = new Map<string, Assessment>();

      remote.assessments.forEach(a => {
        if (a && a.id) assessMap.set(a.id, a);
        else if (a && a.lessonId && a.studentId) assessMap.set(`${a.lessonId}_${a.studentId}`, a);
      });

      currentAssessments.forEach(a => {
        if (a && a.id) assessMap.set(a.id, a);
        else if (a && a.lessonId && a.studentId) assessMap.set(`${a.lessonId}_${a.studentId}`, a);
      });

      const mergedAssessments = Array.from(assessMap.values());
      if (mergedAssessments.length !== currentAssessments.length) {
        this.cache.assessments = mergedAssessments;
        hasChanges = true;
      }
    }

    // 3. Merge metadata (classes, students, timeline) if provided
    if (Array.isArray(remote.classes) && remote.classes.length > (this.cache.classes?.length || 0)) {
      this.cache.classes = remote.classes;
      hasChanges = true;
    }
    if (Array.isArray(remote.students) && remote.students.length > (this.cache.students?.length || 0)) {
      this.cache.students = remote.students;
      hasChanges = true;
    }
    if (Array.isArray(remote.timeline) && remote.timeline.length > (this.cache.timeline?.length || 0)) {
      this.cache.timeline = remote.timeline;
      hasChanges = true;
    }

    if (hasChanges) {
      try {
        localStorage.setItem('class_tracker_backup', JSON.stringify(this.cache));
      } catch (e) {
        console.warn('Could not update localStorage on merge:', e);
      }
      this.notify();
    }

    return hasChanges;
  }

  // Multi-device Remote Sync: pull latest changes and merge seamlessly
  public static async syncWithRemote(): Promise<boolean> {
    if (this.isSyncing) return false;
    this.isSyncing = true;
    try {
      const remoteState = await loadStateFromFirestore();
      if (remoteState && Object.keys(remoteState).length > 0) {
        const changed = this.mergeIncomingState(remoteState);
        this.repairAllLessonAssessments();
        return changed;
      }
    } catch (err) {
      console.warn('Background sync with remote encountered error:', err);
    } finally {
      this.isSyncing = false;
    }
    return false;
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
        this.repairAllLessonAssessments();
        localStorage.setItem('class_tracker_backup', JSON.stringify(this.cache));
        this.notify();
        this.setupBackgroundSync();
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
        this.repairAllLessonAssessments();
        // Save to LocalStorage as a local backup copy
        localStorage.setItem('class_tracker_backup', JSON.stringify(data));
        this.notify();
        this.setupBackgroundSync();
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
        this.repairAllLessonAssessments();
        this.notify();
        this.setupBackgroundSync();
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
    this.setupBackgroundSync();
    return this.cache;
  }

  private static setupBackgroundSync() {
    if (typeof window === 'undefined') return;

    // 1. Real-time Firestore sync
    if (!this.realtimeUnsubscribe) {
      this.realtimeUnsubscribe = setupRealtimeSync(async (remoteLessons) => {
        if (Array.isArray(remoteLessons)) {
          // If remote lessons changed, pull full remote state to get matching assessments
          await this.syncWithRemote();
        }
      });
    }

    // 2. Sync on browser tab focus / visibility
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncWithRemote();
      }
    });

    window.addEventListener('focus', () => {
      this.syncWithRemote();
    });

    // 3. Periodic sync every 25 seconds
    setInterval(() => {
      this.syncWithRemote();
    }, 25000);
  }

  private static isPersisting = false;
  private static hasPendingPersist = false;

  // Save changes to Firestore, Server and LocalStorage safely without race conditions
  private static async persist() {
    // 1. Immediately write to LocalStorage and trigger local state subscribers
    try {
      localStorage.setItem('class_tracker_backup', JSON.stringify(this.cache));
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
    }
    this.notify();

    // If a network persistence call is already in progress, mark pending and exit
    if (this.isPersisting) {
      this.hasPendingPersist = true;
      return;
    }

    this.isPersisting = true;
    try {
      do {
        this.hasPendingPersist = false;
        // Take a clean snapshot of the latest cache to avoid mutations during flight
        const snapshot = JSON.parse(JSON.stringify(this.cache));

        // 1. Save to Firestore with multi-device merging
        try {
          const res = await saveStateToFirestore(snapshot, { mergeWithRemote: true });
          if (res.success && res.mergedLessons) {
            // Update cache with merged remote + local lessons so local cache stays unified
            this.cache.lessons = res.mergedLessons;
            if (res.mergedAssessments) {
              this.cache.assessments = res.mergedAssessments;
            }
            try {
              localStorage.setItem('class_tracker_backup', JSON.stringify(this.cache));
            } catch (_) {}
            this.notify();
          }
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
      } while (this.hasPendingPersist);
    } finally {
      this.isPersisting = false;
    }
  }

  // Current State Getters
  public static getState() {
    return this.cache;
  }

  // Manually push current local state to Firebase Firestore
  public static async forceSyncToFirestore(): Promise<boolean> {
    try {
      const res = await saveStateToFirestore(this.cache, { mergeWithRemote: true });
      if (res.success && res.mergedLessons) {
        this.cache.lessons = res.mergedLessons;
        if (res.mergedAssessments) {
          this.cache.assessments = res.mergedAssessments;
        }
        localStorage.setItem('class_tracker_backup', JSON.stringify(this.cache));
        this.notify();
      }
      return res.success;
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
        this.repairAllLessonAssessments();
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
    const classIdsToDelete = new Set(this.getClasses().filter(c => c.gradeId === id).map(c => c.id));
    const studentIdsToDelete = new Set(this.getStudents().filter(s => classIdsToDelete.has(s.classId)).map(s => s.id));
    
    this.cache.grades = this.getGrades().filter(g => g.id !== id);
    this.cache.classes = this.getClasses().filter(c => c.gradeId !== id);
    this.cache.students = this.getStudents().filter(s => !classIdsToDelete.has(s.classId));
    this.cache.lessons = (this.cache.lessons || []).filter(l => !classIdsToDelete.has(l.classId));
    this.cache.timeline = (this.cache.timeline || []).filter(t => t.gradeId !== id && (!t.classId || !classIdsToDelete.has(t.classId)));
    this.cache.assessments = (this.cache.assessments || []).filter(a => !studentIdsToDelete.has(a.studentId));
    this.cache.comments = (this.cache.comments || []).filter(c => !studentIdsToDelete.has(c.studentId));
    this.cache.scores = (this.cache.scores || []).filter(s => !studentIdsToDelete.has(s.studentId));
    this.persist();
  }

  // Classes
  public static getClasses(): Class[] {
    return this.cache.classes || [];
  }

  public static addClass(name: string, gradeId: string, homeroomTeacher?: string, subject?: string): Class {
    const newClass: Class = {
      id: generateUniqueId('class'),
      name,
      gradeId,
      homeroomTeacher,
      subject
    };
    this.cache.classes = [...this.getClasses(), newClass];
    this.persist();
    return newClass;
  }

  public static updateClass(id: string, name: string, gradeId: string, homeroomTeacher?: string, subject?: string): void {
    this.cache.classes = this.getClasses().map(c => c.id === id ? { ...c, name, gradeId, homeroomTeacher, subject } : c);
    this.persist();
  }

  public static deleteClass(id: string): void {
    const studentIdsToDelete = new Set(this.getStudents().filter(s => s.classId === id).map(s => s.id));
    this.cache.classes = this.getClasses().filter(c => c.id !== id);
    // Cascade delete students and associated records
    this.cache.students = this.getStudents().filter(s => s.classId !== id);
    this.cache.lessons = (this.cache.lessons || []).filter(l => l.classId !== id);
    this.cache.timeline = (this.cache.timeline || []).filter(t => t.classId !== id);
    this.cache.assessments = (this.cache.assessments || []).filter(a => !studentIdsToDelete.has(a.studentId));
    this.cache.comments = (this.cache.comments || []).filter(c => !studentIdsToDelete.has(c.studentId));
    this.cache.scores = (this.cache.scores || []).filter(s => !studentIdsToDelete.has(s.studentId));
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

  public static updateLesson(
    id: string, 
    lessonNameOrFields: string | Partial<Omit<Lesson, 'id'>>, 
    content?: string, 
    date?: string
  ): Lesson | undefined {
    if (typeof lessonNameOrFields === 'string') {
      this.cache.lessons = this.getLessons().map(l => 
        l.id === id ? { ...l, lessonName: lessonNameOrFields, content: content ?? l.content, date: date ?? l.date } : l
      );
    } else {
      this.cache.lessons = this.getLessons().map(l => 
        l.id === id ? { ...l, ...lessonNameOrFields } : l
      );
    }
    this.persist();
    return this.getLessons().find(l => l.id === id);
  }

  public static deleteLesson(id: string): void {
    this.cache.lessons = this.getLessons().filter(l => l.id !== id);
    // Delete associated assessments
    this.cache.assessments = (this.cache.assessments || []).filter(a => a.lessonId !== id);
    this.persist();
  }

  // ATOMIC LESSON & ASSESSMENTS PERSISTENCE
  // Ensures both lesson metadata and all student assessments are written together in a single atomic snapshot
  public static saveLessonWithAssessments(
    lessonData: {
      id?: string;
      classId: string;
      lessonName: string;
      content: string;
      date: string;
      createdBy?: string;
      week?: string;
      notes?: string;
      absentStudentIds?: string[];
      absentStudentsSummary?: string;
      isDraft?: boolean;
    },
    studentAssessments: Omit<Assessment, 'id' | 'lessonId' | 'date'>[]
  ): Lesson {
    let targetLessonId = lessonData.id;
    let savedLesson: Lesson;

    if (targetLessonId) {
      // Update existing lesson
      this.cache.lessons = this.getLessons().map(l => 
        l.id === targetLessonId ? { ...l, ...lessonData, id: targetLessonId! } : l
      );
      savedLesson = this.getLessons().find(l => l.id === targetLessonId)!;
    } else {
      // Create new lesson
      targetLessonId = generateUniqueId('lesson');
      savedLesson = {
        ...lessonData,
        id: targetLessonId,
        createdBy: lessonData.createdBy || this.cache.settings?.teacherName || 'Cô Nguyễn Thị Hà'
      };
      this.cache.lessons = [...this.getLessons(), savedLesson];
    }

    // Simultaneously update assessments for this lesson
    const currentAssessments = this.getAssessments().filter(a => a.lessonId !== targetLessonId);
    const newAssessments: Assessment[] = studentAssessments.map((sa, idx) => ({
      id: `assess_${targetLessonId}_${sa.studentId || idx}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      lessonId: targetLessonId!,
      date: lessonData.date,
      studentId: sa.studentId,
      completion: sa.completion,
      attitude: sa.attitude,
      skill: sa.skill,
      cooperation: sa.cooperation,
      note: sa.note || '',
      isAbsent: sa.isAbsent ?? false
    }));

    this.cache.assessments = [...currentAssessments, ...newAssessments];
    this.persist();
    return savedLesson;
  }

  // Auto-recovery: If a lesson has 0 saved assessments, populate default assessments from class students
  public static ensureLessonAssessments(lessonId: string): Assessment[] {
    const existing = this.getAssessments().filter(a => a.lessonId === lessonId);
    if (existing.length > 0) return existing;

    const targetLesson = this.getLessons().find(l => l.id === lessonId);
    if (!targetLesson) return [];

    const classStudents = this.getStudents().filter(s => s.classId === targetLesson.classId);
    if (classStudents.length === 0) return [];

    const absentSet = new Set(targetLesson.absentStudentIds || []);
    const recovered: Assessment[] = classStudents.map((s, idx) => {
      const isAbsent = absentSet.has(s.id);
      return {
        id: `assess_rec_${lessonId}_${s.id}_${Date.now()}_${idx}`,
        lessonId,
        date: targetLesson.date,
        studentId: s.id,
        completion: isAbsent ? 'Chưa hoàn thành' : 'Hoàn thành',
        attitude: 'Bình thường',
        skill: isAbsent ? 'Cần hỗ trợ' : 'Đạt',
        cooperation: isAbsent ? 'Cần cố gắng' : 'Đạt',
        note: isAbsent ? 'Vắng học' : '',
        isAbsent
      };
    });

    this.cache.assessments = [...(this.cache.assessments || []), ...recovered];
    this.persist();
    return recovered;
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
      cooperation: sa.cooperation,
      note: sa.note || '',
      isAbsent: sa.isAbsent ?? false
    }));

    this.cache.assessments = [...currentAssessments, ...newAssessments];
    this.persist();
  }

  // Comments
  public static getComments(): Comment[] {
    return this.cache.comments || [];
  }

  public static addComment(
    studentId: string, 
    content: string, 
    type: 'AI' | 'Thủ công',
    period?: 'Giữa học kỳ I' | 'Cuối học kỳ I' | 'Giữa học kỳ II' | 'Cuối học kỳ II' | string,
    level?: EvaluationLevel
  ): Comment {
    if (!this.cache.comments) {
      this.cache.comments = [];
    }

    const date = new Date().toISOString().split('T')[0];
    const createdBy = this.cache.settings?.teacherName || 'Giáo viên';

    // If period is provided, look for existing comment for this period to update
    if (period) {
      const existingIndex = this.cache.comments.findIndex(
        c => c.studentId === studentId && c.period === period
      );

      if (existingIndex > -1) {
        this.cache.comments[existingIndex] = {
          ...this.cache.comments[existingIndex],
          content: content !== undefined ? content : this.cache.comments[existingIndex].content,
          type,
          createdBy,
          date,
          level: level !== undefined ? level : this.cache.comments[existingIndex].level
        };
        this.persist();
        return this.cache.comments[existingIndex];
      }
    }

    const newComment: Comment = {
      id: generateUniqueId('comment'),
      studentId,
      content,
      createdBy,
      date,
      type,
      period,
      level
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

  public static getTimelineForDate(dateStr: string, classId?: string): TimelineWeek | undefined {
    const list = this.getTimeline();
    const dateVal = new Date(dateStr).getTime();
    
    const matchingWeeks = list.filter(w => {
      const sVal = new Date(w.startDate).getTime();
      const eVal = new Date(w.endDate).getTime();
      return dateVal >= sVal && dateVal <= eVal;
    });

    if (matchingWeeks.length === 0) return undefined;
    if (!classId) return matchingWeeks[0];

    const targetClass = this.getClasses().find(c => c.id === classId);

    // 1. Exact classId match
    const exactClassMatch = matchingWeeks.find(w => w.classId === classId);
    if (exactClassMatch) return exactClassMatch;

    // 2. Grade match
    if (targetClass) {
      const gradeMatch = matchingWeeks.find(w => w.gradeId === targetClass.gradeId);
      if (gradeMatch) return gradeMatch;

      // 3. Subject match
      if (targetClass.subject) {
        const subjectMatch = matchingWeeks.find(w => w.subject === targetClass.subject);
        if (subjectMatch) return subjectMatch;
      }
    }

    // 4. Default general week or first matching
    return matchingWeeks.find(w => !w.classId && !w.gradeId) || matchingWeeks[0];
  }

  // Lucky Wheel Records & Assessment Synchronization
  public static getWheelRecords(classId?: string): WheelSpinRecord[] {
    const list = this.cache.wheelRecords || [];
    if (!classId) return list;
    return list.filter(r => r.classId === classId);
  }

  public static addWheelRecord(record: Omit<WheelSpinRecord, 'id'>): WheelSpinRecord {
    if (!this.cache.wheelRecords) {
      this.cache.wheelRecords = [];
    }
    const newRecord: WheelSpinRecord = {
      ...record,
      id: generateUniqueId('wheel')
    };
    this.cache.wheelRecords = [newRecord, ...this.cache.wheelRecords];

    // Automatically synchronize answer note and rating to the class/lesson assessment
    this.syncWheelToAssessment(newRecord);

    this.persist();
    return newRecord;
  }

  public static clearWheelRecords(classId?: string): void {
    if (!this.cache.wheelRecords) return;
    if (classId) {
      this.cache.wheelRecords = this.cache.wheelRecords.filter(r => r.classId !== classId);
    } else {
      this.cache.wheelRecords = [];
    }
    this.persist();
  }

  private static syncWheelToAssessment(record: WheelSpinRecord): void {
    if (!this.cache.assessments) this.cache.assessments = [];
    if (!this.cache.lessons) this.cache.lessons = [];

    const todayDate = record.date || new Date().toISOString().split('T')[0];
    
    // Find or create lesson for this class today
    let targetLesson = this.cache.lessons.find(l => l.classId === record.classId && l.date === todayDate);
    if (!targetLesson) {
      // Find the latest lesson of this class or create today's lesson
      const classLessons = this.cache.lessons.filter(l => l.classId === record.classId);
      if (classLessons.length > 0) {
        targetLesson = [...classLessons].sort((a, b) => b.date.localeCompare(a.date))[0];
      }
    }

    if (!targetLesson) {
      targetLesson = {
        id: generateUniqueId('lesson'),
        date: todayDate,
        classId: record.classId,
        lessonName: `Tiết học ngày ${todayDate}`,
        content: 'Hoạt động học tập & Vòng xoay gọi tên ngẫu nhiên',
        createdBy: this.cache.settings?.teacherName || 'Cô Nguyễn Thị Hà',
        notes: `Ghi nhận từ Vòng Xoay Kỳ Diệu`
      };
      this.cache.lessons.push(targetLesson);
    }

    // Map star rating to completion & attitude
    const completion = record.stars === 3 ? 'Hoàn thành tốt' : record.stars === 2 ? 'Hoàn thành' : 'Chưa hoàn thành';
    const attitude = record.stars >= 2 ? 'Tích cực' : 'Bình thường';
    const noteFormatted = record.note && record.note.trim() 
      ? `[Vòng quay ⭐x${record.stars} - ${record.ratingText}]: ${record.note.trim()}`
      : `[Vòng quay ⭐x${record.stars}]: ${record.ratingText}`;

    const existingAssessIndex = this.cache.assessments.findIndex(
      a => a.studentId === record.studentId && a.lessonId === targetLesson!.id
    );

    if (existingAssessIndex > -1) {
      const current = this.cache.assessments[existingAssessIndex];
      const combinedNote = current.note 
        ? `${current.note}; ${noteFormatted}` 
        : noteFormatted;
      this.cache.assessments[existingAssessIndex] = {
        ...current,
        completion,
        attitude,
        note: combinedNote
      };
    } else {
      const newAssessment: Assessment = {
        id: generateUniqueId('assess'),
        studentId: record.studentId,
        lessonId: targetLesson.id,
        date: todayDate,
        completion,
        attitude,
        skill: record.stars === 3 ? 'Thành thạo' : 'Đạt',
        cooperation: 'Tốt',
        note: noteFormatted,
        isAbsent: false
      };
      this.cache.assessments.push(newAssessment);
    }
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
      wheelRecords: this.getWheelRecords(),
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
          wheelRecords: backup.wheelRecords || [],
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
  public static async generateAIComment(studentId: string, period?: string, level?: EvaluationLevel): Promise<string> {
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

    const subjectName = clazz?.subject || (grade?.name?.includes('5') ? 'Công nghệ' : 'Tin học');

    try {
      const response = await fetch('/api/gemini/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student.name,
          gradeName: grade?.name || 'Chưa rõ',
          className: clazz?.name || 'Chưa rõ',
          subject: subjectName,
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
          period: period,
          level: level
        })
      });

      if (!response.ok) {
        throw new Error('API server failed');
      }

      const data = await response.json();
      let text = (data.comment || '').trim().replace(/^["'“”]+|["'“”]+$/g, '');
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length > 30) {
        text = words.slice(0, 28).join(' ') + '...';
      }
      return text;
    } catch (error) {
      console.error('Failed to call Gemini AI comment generator, falling back to client simulation', error);
      // Clean fallback generator strictly under 30 words, positive and encouraging
      const isGood = level === 'T';
      const isNeedEffort = level === 'C';
      
      const isTech = subjectName.toLowerCase().includes('công nghệ');
      const subjectLabel = isTech ? 'Công nghệ' : 'Tin học';

      if (isGood) {
        if (period === 'Giữa học kỳ I') {
          return `Em ${student.name} chăm ngoan, tiếp thu bài nhanh, làm quen với môn ${subjectLabel} rất tốt và luôn tích cực trong giờ học.`;
        } else if (period === 'Cuối học kỳ I') {
          return `Em ${student.name} chăm ngoan, hoàn thành xuất sắc các bài thực hành môn ${subjectLabel} học kỳ I, tích cực phát biểu.`;
        } else if (period === 'Giữa học kỳ II') {
          return `Em ${student.name} có nhiều tiến bộ, thao tác máy tính nhanh nhẹn, sáng tạo và luôn hào hứng trong các tiết học.`;
        } else if (period === 'Cuối học kỳ II') {
          return `Em ${student.name} hoàn thành xuất sắc chương trình môn ${subjectLabel}, kỹ năng thực hành vững vàng, chăm chỉ rèn luyện.`;
        }
        return `Em ${student.name} chăm ngoan, tiếp thu bài nhanh, hoàn thành xuất sắc các bài thực hành và luôn tích cực trong giờ học.`;
      } else if (isNeedEffort) {
        // Positive and encouraging, ABSOLUTELY NO CRITICIZING
        if (period === 'Giữa học kỳ I') {
          return `Em ${student.name} ngoan ngoãn, có nhiều cố gắng làm quen môn ${subjectLabel}, chú ý nghe giảng. Hãy tự tin phát huy nhé!`;
        } else if (period === 'Cuối học kỳ I') {
          return `Em ${student.name} chăm ngoan, luôn nỗ lực trong các tiết thực hành môn ${subjectLabel}. Em hãy tiếp tục cố gắng hơn nữa nhé!`;
        } else if (period === 'Giữa học kỳ II') {
          return `Em ${student.name} có tiến bộ trong học tập, chăm chỉ nghe giảng và thực hành. Hãy tự tin tương tác nhiều hơn nhé!`;
        } else if (period === 'Cuối học kỳ II') {
          return `Em ${student.name} ngoan ngoãn, hoàn thành bài học và luôn có ý thức rèn luyện môn ${subjectLabel}. Tiếp tục cố gắng em nhé!`;
        }
        return `Em ${student.name} chăm ngoan, có nhiều cố gắng trong học tập, chú ý nghe giảng. Hãy tự tin phát huy hơn nữa nhé!`;
      } else {
        // Level H (Hoàn thành)
        if (period === 'Giữa học kỳ I') {
          return `Em ${student.name} chăm ngoan, nề nếp học tập tốt, hoàn thành đầy đủ các bài thực hành môn ${subjectLabel} đầu năm.`;
        } else if (period === 'Cuối học kỳ I') {
          return `Em ${student.name} nắm vững kiến thức môn ${subjectLabel}, hoàn thành tốt các bài thực hành trên lớp. Tiếp tục phát huy nhé!`;
        } else if (period === 'Giữa học kỳ II') {
          return `Em ${student.name} tiếp thu bài tốt, chăm chỉ thực hành môn ${subjectLabel} và tích cực tham gia các hoạt động nhóm.`;
        } else if (period === 'Cuối học kỳ II') {
          return `Em ${student.name} hoàn thành tốt nội dung chương trình môn ${subjectLabel}, kỹ năng thực hành đạt chuẩn, chăm ngoan.`;
        }
        return `Em ${student.name} chăm ngoan, chú ý nghe giảng, nắm vững kiến thức và hoàn thành tốt các bài thực hành trên lớp.`;
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
