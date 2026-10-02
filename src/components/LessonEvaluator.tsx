/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Calendar, CheckSquare, Sparkles, UserCheck, UserX, 
  ChevronRight, ChevronLeft, ChevronDown, Save, ArrowLeft, RotateCcw, 
  Layers, School, Check, ArrowRight
} from 'lucide-react';
import { Class, Student, Lesson, Assessment, TimelineWeek, Grade } from '../types';
import { TIN_HOC_3_CURRICULUM, TIN_HOC_4_CURRICULUM, CONG_NGHE_5_CURRICULUM } from '../lib/curriculumData';

interface LessonEvaluatorProps {
  key?: React.Key;
  classes: Class[];
  grades: Grade[];
  students: Student[];
  lessons: Lesson[];
  assessments: Assessment[];
  timeline: TimelineWeek[];
  onSaveAssessments: (
    lessonId: string, 
    date: string, 
    assessments: Omit<Assessment, 'id' | 'lessonId' | 'date'>[]
  ) => void;
  onAddLesson: (lesson: Omit<Lesson, 'id'>) => Lesson;
}

export function LessonEvaluator({
  classes,
  grades,
  students,
  lessons,
  assessments,
  timeline,
  onSaveAssessments,
  onAddLesson
}: LessonEvaluatorProps) {
  // STRICT STEP ARCHITECTURE:
  // selectedGradeId === null -> BƯỚC 1: CHỌN KHỐI (Không hiển thị danh sách lớp)
  // selectedGradeId !== null && selectedClassId === null -> BƯỚC 2: CHỌN LỚP (Chỉ lớp thuộc khối đã chọn)
  // selectedGradeId !== null && selectedClassId !== null -> BƯỚC 3: PHIẾU ĐÁNH GIÁ TIẾT HỌC & ĐIỂM DANH
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // If the selected grade is no longer valid, reset to Step 1
  useEffect(() => {
    if (selectedGradeId && grades.length > 0 && !grades.some(g => g.id === selectedGradeId)) {
      setSelectedGradeId(null);
      setSelectedClassId(null);
    }
  }, [grades, selectedGradeId]);

  // Step 3 state: Form data
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const matched = timeline.find(w => w.startDate && w.endDate && todayStr >= w.startDate && todayStr <= w.endDate);
    return matched?.stt || 1;
  });
  const [lessonName, setLessonName] = useState('');
  const [lessonContent, setLessonContent] = useState('');

  // Step 3 state: Class Roster with temporary assessments
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [absentStudentIds, setAbsentStudentIds] = useState<string[]>([]);
  const [tempAssessments, setTempAssessments] = useState<Record<string, {
    completion: 'Hoàn thành tốt' | 'Hoàn thành' | 'Chưa hoàn thành';
    attitude: 'Tích cực' | 'Bình thường' | 'Chưa tập trung';
    skill: 'Thành thạo' | 'Đạt' | 'Cần hỗ trợ';
    cooperation: 'Tốt' | 'Đạt' | 'Cần cố gắng';
    note?: string;
  }>>({});

  const [notification, setNotification] = useState('');

  // Hàm tự động tìm tên bài giảng chính xác theo phân phối chương trình của lớp và tuần học
  const resolveLessonName = (weekNum: number, clsId: string): string => {
    if (!clsId) return '';
    const currentCls = classes.find(c => c.id === clsId);
    const currentGrd = grades.find(g => g.id === currentCls?.gradeId);
    const gradeName = currentGrd?.name || '';
    const isGrade5 = gradeName.includes('5');
    const isGrade4 = gradeName.includes('4');
    const subject = currentCls?.subject || (isGrade5 ? 'Công nghệ' : 'Tin học');

    // 1. Kiểm tra PPCT do giáo viên đưa lên: khớp chính xác theo classId
    if (timeline && timeline.length > 0) {
      const matchClass = timeline.find(w => {
        const isWeek = w.stt === weekNum || w.week === `Tuần ${weekNum}` || w.week === `${weekNum}`;
        return isWeek && w.classId === clsId && w.lessonName && w.lessonName.trim().length > 0;
      });
      if (matchClass?.lessonName?.trim()) return matchClass.lessonName.trim();

      // 2. Khớp theo gradeId của lớp
      const matchGrade = timeline.find(w => {
        const isWeek = w.stt === weekNum || w.week === `Tuần ${weekNum}` || w.week === `${weekNum}`;
        return isWeek && currentCls && w.gradeId === currentCls.gradeId && w.lessonName && w.lessonName.trim().length > 0;
      });
      if (matchGrade?.lessonName?.trim()) return matchGrade.lessonName.trim();

      // 3. Khớp theo môn học (Công nghệ / Tin học)
      const matchSubject = timeline.find(w => {
        const isWeek = w.stt === weekNum || w.week === `Tuần ${weekNum}` || w.week === `${weekNum}`;
        return isWeek && w.subject === subject && w.lessonName && w.lessonName.trim().length > 0;
      });
      if (matchSubject?.lessonName?.trim()) return matchSubject.lessonName.trim();

      // 4. Khớp theo tuần chung (không phân biệt lớp/khối)
      const matchGeneral = timeline.find(w => {
        const isWeek = w.stt === weekNum || w.week === `Tuần ${weekNum}` || w.week === `${weekNum}`;
        return isWeek && !w.classId && !w.gradeId && w.lessonName && w.lessonName.trim().length > 0;
      });
      if (matchGeneral?.lessonName?.trim()) return matchGeneral.lessonName.trim();
    }

    // 5. Nếu chưa có PPCT tùy chỉnh cho tuần này, tự động lấy theo PPCT chuẩn của môn/khối
    const weekIndex = Math.max(0, Math.min(34, weekNum - 1));
    if (isGrade5 || subject === 'Công nghệ') {
      if (CONG_NGHE_5_CURRICULUM[weekIndex]) return CONG_NGHE_5_CURRICULUM[weekIndex];
    } else if (isGrade4) {
      if (TIN_HOC_4_CURRICULUM[weekIndex]) return TIN_HOC_4_CURRICULUM[weekIndex];
    } else {
      if (TIN_HOC_3_CURRICULUM[weekIndex]) return TIN_HOC_3_CURRICULUM[weekIndex];
    }

    return `Bài học Tuần ${weekNum}`;
  };

  // Tự động cập nhật tên bài giảng từ PPCT khi đổi tuần hoặc đổi lớp
  useEffect(() => {
    if (!selectedClassId) return;
    const resolved = resolveLessonName(selectedWeek, selectedClassId);
    if (resolved) {
      setLessonName(resolved);
    }
  }, [selectedWeek, selectedClassId, timeline, classes, grades]);

  // Hành động chọn Khối (Bước 1 -> Bước 2)
  const handleSelectGrade = (gradeId: string) => {
    setSelectedGradeId(gradeId);
    setSelectedClassId(null);
  };

  // Nút quay lại: Chọn lại khối (Bước 2 hoặc 3 -> Bước 1)
  const handleBackToGrades = () => {
    setSelectedGradeId(null);
    setSelectedClassId(null);
  };

  // Hành động chọn Lớp (Bước 2 -> Bước 3)
  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    const filtered = students.filter(s => s.classId === classId);
    setClassStudents(filtered);
    setSelectedStudentIds(filtered.map(s => s.id));
    setAbsentStudentIds([]); // Đặt lại danh sách vắng khi chọn lớp mới

    // Nạp ngay tên bài học từ PPCT cho lớp này
    const resolved = resolveLessonName(selectedWeek, classId);
    if (resolved) {
      setLessonName(resolved);
    }

    // Khởi tạo đánh giá tạm thời cho từng học sinh
    const initial: typeof tempAssessments = {};
    filtered.forEach(s => {
      initial[s.id] = {
        completion: 'Hoàn thành',
        attitude: 'Bình thường',
        skill: 'Đạt',
        cooperation: 'Đạt',
        note: ''
      };
    });
    setTempAssessments(initial);
  };

  // Nút quay lại: Chọn lại lớp (Bước 3 -> Bước 2)
  const handleBackToClasses = () => {
    setSelectedClassId(null);
  };

  // Đánh dấu nhanh học sinh vắng / có mặt
  const handleToggleAbsent = (studentId: string) => {
    setAbsentStudentIds(prev => {
      const isCurrentlyAbsent = prev.includes(studentId);
      const next = isCurrentlyAbsent 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId];
      
      // Tự động điền ghi chú vắng hoặc khôi phục
      if (!isCurrentlyAbsent) {
        setTempAssessments(curr => ({
          ...curr,
          [studentId]: {
            ...curr[studentId],
            note: curr[studentId]?.note?.trim() || 'Vắng học'
          }
        }));
      } else {
        setTempAssessments(curr => ({
          ...curr,
          [studentId]: {
            ...curr[studentId],
            note: curr[studentId]?.note === 'Vắng học' ? '' : curr[studentId]?.note
          }
        }));
      }
      return next;
    });
  };

  // Đặt lại cả lớp đi học đầy đủ
  const handleResetAllPresent = () => {
    setAbsentStudentIds([]);
    setTempAssessments(curr => {
      const next = { ...curr };
      Object.keys(next).forEach(sId => {
        if (next[sId]?.note === 'Vắng học') {
          next[sId] = { ...next[sId], note: '' };
        }
      });
      return next;
    });
  };

  // Đặt nhanh giá trị đánh giá cho các học sinh đang được chọn (không vắng)
  const handleSetDefaultsAll = (level: 'excellent' | 'normal') => {
    const updated = { ...tempAssessments };
    classStudents.forEach(s => {
      if (selectedStudentIds.includes(s.id) && !absentStudentIds.includes(s.id)) {
        if (level === 'excellent') {
          updated[s.id] = {
            ...updated[s.id],
            completion: 'Hoàn thành tốt',
            attitude: 'Tích cực',
            skill: 'Thành thạo',
            cooperation: 'Tốt'
          };
        } else {
          updated[s.id] = {
            ...updated[s.id],
            completion: 'Hoàn thành',
            attitude: 'Bình thường',
            skill: 'Đạt',
            cooperation: 'Đạt'
          };
        }
      }
    });
    setTempAssessments(updated);
  };

  // Cập nhật từng trường đánh giá của học sinh
  const handleUpdateField = (
    studentId: string, 
    field: 'completion' | 'attitude' | 'skill' | 'cooperation' | 'note', 
    value: any
  ) => {
    setTempAssessments(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  // Lưu bài giảng và toàn bộ đánh giá học sinh
  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !lessonName.trim() || classStudents.length === 0) return;

    const todayDate = new Date().toISOString().split('T')[0];

    const absentStudents = classStudents.filter(s => absentStudentIds.includes(s.id));
    const absentSummary = absentStudents.map(s => s.name).join(', ');
    const attendanceNote = absentStudents.length > 0 
      ? `Sĩ số: ${classStudents.length} · Có mặt: ${classStudents.length - absentStudents.length} · Vắng (${absentStudents.length}): ${absentSummary}`
      : `Sĩ số: ${classStudents.length} (Đầy đủ)`;

    // 1. Tạo và lưu nhật ký bài giảng (Lesson) với thông tin điểm danh
    const newLesson = onAddLesson({
      date: todayDate,
      classId: selectedClassId,
      lessonName: lessonName.trim(),
      content: lessonContent.trim() || `Bài giảng Tuần ${selectedWeek}`,
      createdBy: 'Cô Nguyễn Thị Hà',
      week: `Tuần ${selectedWeek}`,
      notes: attendanceNote,
      absentStudentIds,
      absentStudentsSummary: absentSummary
    });

    // 2. Chuẩn bị và lưu danh sách đánh giá của từng học sinh
    const assessmentList = classStudents.map(s => {
      const isAbsent = absentStudentIds.includes(s.id);
      return {
        studentId: s.id,
        completion: isAbsent ? ('Chưa hoàn thành' as const) : (tempAssessments[s.id]?.completion || 'Hoàn thành'),
        attitude: isAbsent ? ('Bình thường' as const) : (tempAssessments[s.id]?.attitude || 'Bình thường'),
        skill: isAbsent ? ('Cần hỗ trợ' as const) : (tempAssessments[s.id]?.skill || 'Đạt'),
        cooperation: isAbsent ? ('Cần cố gắng' as const) : (tempAssessments[s.id]?.cooperation || 'Đạt'),
        note: isAbsent 
          ? (tempAssessments[s.id]?.note?.trim() || 'Vắng học') 
          : (tempAssessments[s.id]?.note?.trim() || ''),
        isAbsent
      };
    });

    onSaveAssessments(newLesson.id, todayDate, assessmentList);

    // Hiển thị thông báo thành công và quay lại Bước 2 (chọn lớp)
    setNotification(`Đã ghi nhận bài giảng Tuần ${selectedWeek} và toàn bộ đánh giá học sinh thành công!`);
    setTimeout(() => {
      setNotification('');
      setSelectedClassId(null);
      setLessonName('');
      setLessonContent('');
      setAbsentStudentIds([]);
    }, 2200);
  };

  // Sắp xếp danh sách khối lớp tự nhiên (Khối 3, Khối 4, Khối 5)
  const sortedGrades = [...grades].sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));

  const currentGrade = grades.find(g => g.id === selectedGradeId);
  const currentClass = classes.find(c => c.id === selectedClassId);
  const gradeClasses = selectedGradeId ? classes.filter(c => c.gradeId === selectedGradeId) : [];

  return (
    <div id="lesson-eval-container" className="space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className="p-4 bg-emerald-500 text-white rounded-2xl font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 animate-fadeIn">
          <Sparkles className="w-5 h-5 text-amber-300 animate-spin" /> {notification}
        </div>
      )}

      {/* Progress Flow Banner (Quy trình: Bước 1 → Bước 2 → Bước 3) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100 font-display">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>ĐÁNH GIÁ TIẾT HỌC & ĐIỂM DANH</span>
        </div>

        {/* Step Indicator Badges */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={handleBackToGrades}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
              selectedGradeId === null
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400 font-black'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 cursor-pointer'
            }`}
          >
            <span>1️⃣ Bước 1: Chọn Khối</span>
            {selectedGradeId && <span className="opacity-90">({currentGrade?.name})</span>}
          </button>

          <ChevronRight className="w-4 h-4 text-slate-300" />

          <button
            type="button"
            onClick={selectedGradeId ? handleBackToClasses : undefined}
            disabled={!selectedGradeId}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
              selectedGradeId !== null && selectedClassId === null
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400 font-black'
                : selectedClassId !== null
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 cursor-pointer'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>2️⃣ Bước 2: Chọn Lớp</span>
            {selectedClassId && <span className="opacity-90">(Lớp {currentClass?.name})</span>}
          </button>

          <ChevronRight className="w-4 h-4 text-slate-300" />

          <span
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${
              selectedClassId !== null
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            <span>3️⃣ Bước 3: Phiếu Đánh Giá</span>
          </span>
        </div>
      </div>

      {/* =========================================================================
          BƯỚC 1: CHỌN KHỐI LỚP ĐÁNH GIÁ (Render khi selectedGradeId === null)
          TUYỆT ĐỐI KHÔNG hiển thị danh sách lớp khi chưa chọn khối!
      ========================================================================= */}
      {selectedGradeId === null ? (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-left space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
              <span>BƯỚC 1 / 3</span>
            </div>
            <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight font-display flex items-center gap-2">
              <span>BƯỚC 1: CHỌN KHỐI LỚP ĐÁNH GIÁ</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Vui lòng bấm chọn một khối lớp dưới đây để mở danh sách lớp học tương ứng.
            </p>
          </div>

          {sortedGrades.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-400">
              Chưa có dữ liệu Khối lớp. Vui lòng thêm khối lớp trong mục "Quản lý Lớp học & Khối".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sortedGrades.map((g) => {
                const gClasses = classes.filter(c => c.gradeId === g.id);
                const gClassIds = new Set(gClasses.map(c => c.id));
                const countStudents = students.filter(s => gClassIds.has(s.classId)).length;
                const isGrade5 = g.name.includes('5');
                const isGrade4 = g.name.includes('4');
                const subjectTitle = isGrade5 ? 'Môn Công nghệ' : 'Môn Tin học';
                const iconSymbol = isGrade5 ? '🛠️' : '💻';

                return (
                  <div
                    key={g.id}
                    onClick={() => handleSelectGrade(g.id)}
                    className="relative group cursor-pointer bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white rounded-3xl p-7 border-2 border-slate-750 hover:border-cyan-400 hover:ring-4 hover:ring-cyan-500/20 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between min-h-[260px] overflow-hidden"
                  >
                    {/* Background subtle glow */}
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none"></div>

                    <div className="space-y-4">
                      {/* Top tag & icon row */}
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                          {iconSymbol}
                        </div>
                        <span className={`text-[11px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider border ${
                          isGrade5 
                            ? 'bg-amber-950/80 text-amber-300 border-amber-700/60' 
                            : 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                        }`}>
                          {subjectTitle}
                        </span>
                      </div>

                      {/* Grade Title */}
                      <div>
                        <h3 className="text-2xl lg:text-3xl font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors font-display">
                          {g.name.toUpperCase()}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 font-medium">
                          {isGrade5 ? 'Chương trình Công nghệ Tiểu học' : 'Chương trình Tin học Tiểu học'}
                        </p>
                      </div>

                      {/* Stats pills */}
                      <div className="flex items-center gap-2 pt-2">
                        <span className="px-3 py-1.5 rounded-xl bg-slate-800/90 text-blue-200 border border-blue-500/20 text-xs font-black">
                          📁 {gClasses.length} lớp
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-800/90 text-emerald-300 border border-emerald-500/20 text-xs font-black">
                          👥 {countStudents} HS
                        </span>
                      </div>
                    </div>

                    {/* Bottom action bar */}
                    <div className="pt-5 mt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-cyan-400 group-hover:text-cyan-200 transition-colors">
                      <span>Bấm để chọn lớp thuộc {g.name}</span>
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : selectedClassId === null ? (
        /* =========================================================================
            BƯỚC 2: CHỌN LỚP HỌC THUỘC KHỐI ĐÃ CHỌN (Render khi selectedGradeId có, selectedClassId === null)
            Chỉ hiển thị các lớp của khối đã chọn, TUYỆT ĐỐI không hiển thị lớp khác!
        ========================================================================= */
        <div className="space-y-6 animate-fadeIn">
          {/* Header Action Bar with Back Button */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToGrades}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-100 text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs border border-slate-200 dark:border-slate-600"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>← Chọn lại khối</span>
              </button>
              
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  <span>BƯỚC 2 / 3</span>
                </div>
                <h2 className="text-xl font-black text-slate-850 dark:text-slate-100 tracking-tight font-display">
                  CHỌN LỚP HỌC THUỘC {currentGrade?.name?.toUpperCase()}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {currentGrade?.name.includes('5') ? '🛠️ Môn Công nghệ' : '💻 Môn Tin học'}
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-extrabold">
                {gradeClasses.length} lớp học
              </span>
            </div>
          </div>

          {/* Grid of classes in this grade */}
          {gradeClasses.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed text-slate-500 space-y-3">
              <p className="text-base font-bold">Chưa có lớp nào thuộc {currentGrade?.name}.</p>
              <p className="text-xs text-slate-400">Thầy Cô vui lòng vào mục "Quản lý Lớp học & Khối" để thêm các lớp học cho khối này.</p>
              <button
                type="button"
                onClick={handleBackToGrades}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer"
              >
                ← Quay lại chọn khối khác
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4.5">
              {gradeClasses.map((c) => {
                const totalClassStudents = students.filter(s => s.classId === c.id).length;
                const isTech = currentGrade?.name.includes('5') || c.subject === 'Công nghệ';

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClass(c.id)}
                    className="p-5 bg-white dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-750/80 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-cyan-400 hover:shadow-lg text-left transition-all group flex flex-col justify-between h-44 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          isTech 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}>
                          {isTech ? '🛠️ Công nghệ' : '💻 Tin học'}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-400 transition-all">
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                      <h3 className="font-black text-slate-800 dark:text-slate-100 text-2xl group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors font-display">
                        Lớp {c.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Sĩ số: <strong className="text-slate-800 dark:text-slate-200 font-extrabold">{totalClassStudents}</strong> học sinh
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span className="truncate">GVCN: <span className="font-bold text-slate-700 dark:text-slate-300">{c.homeroomTeacher || 'Chưa rõ'}</span></span>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Đánh giá →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
            BƯỚC 3: PHIẾU ĐÁNH GIÁ TIẾT HỌC & ĐIỂM DANH (Render khi selectedGradeId & selectedClassId)
        ========================================================================= */
        <form onSubmit={handleSaveAll} className="space-y-6 animate-fadeIn">
          
          {/* Header Action Row */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleBackToClasses}
                className="px-3.5 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>← Quay lại chọn lớp ({currentGrade?.name})</span>
              </button>

              <button
                type="button"
                onClick={handleBackToGrades}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
              >
                Chọn lại khối khác
              </button>
            </div>

            <h2 className="text-base md:text-lg font-black text-slate-850 dark:text-slate-100 font-display flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Đánh giá: Lớp {currentClass?.name} ({currentGrade?.name})
            </h2>
          </div>

          {/* Section 1: Lesson Diary Entry - Tự động theo PPCT */}
          <div className="bg-slate-900 dark:bg-slate-950 p-5 rounded-2xl border border-slate-800 dark:border-slate-850 shadow-md space-y-4 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-blue-400 font-display flex items-center gap-2">
                  <span>1. Thông tin tiết học</span>
                  <span className="text-[11px] font-bold text-emerald-400 lowercase bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                    tự động theo PPCT
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chỉ cần chọn số tuần, tên bài giảng sẽ tự động khớp theo phân phối chương trình của lớp
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-blue-900/60 border border-blue-700/60 text-blue-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Lớp {currentClass?.name} • {currentGrade?.name}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-300">
                  {currentClass?.subject || (currentGrade?.name.includes('5') ? '🛠️ Công nghệ' : '💻 Tin học')}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                  {selectedWeek <= 18 ? 'Học kỳ 1' : 'Học kỳ 2'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Chọn Tuần học */}
              <div className="lg:col-span-4 bg-slate-850/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-200 uppercase tracking-wider">
                    Chọn số tuần học (PPCT)
                  </label>
                  <span className="text-[11px] font-bold text-blue-400">
                    Tuần {selectedWeek} / 35
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedWeek(prev => Math.max(1, prev - 1))}
                    disabled={selectedWeek <= 1}
                    className="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white border border-slate-700 transition-all flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs shrink-0"
                    title="Tuần trước"
                  >
                    <ChevronLeft className="w-4 h-4 mr-0.5" /> Trước
                  </button>

                  <div className="relative flex-1">
                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(Number(e.target.value))}
                      className="w-full h-10 px-3 py-1.5 text-center text-sm font-extrabold rounded-xl border border-blue-500/60 bg-blue-950/70 text-blue-200 outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-inner appearance-none"
                    >
                      <optgroup label="Học kỳ 1 (Tuần 1 - 18)">
                        {Array.from({ length: 18 }, (_, i) => i + 1).map((wNum) => (
                          <option key={wNum} value={wNum} className="bg-slate-900 text-white font-bold py-1">
                            Tuần {wNum}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Học kỳ 2 (Tuần 19 - 35)">
                        {Array.from({ length: 17 }, (_, i) => i + 19).map((wNum) => (
                          <option key={wNum} value={wNum} className="bg-slate-900 text-white font-bold py-1">
                            Tuần {wNum}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-blue-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedWeek(prev => Math.min(35, prev + 1))}
                    disabled={selectedWeek >= 35}
                    className="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white border border-slate-700 transition-all flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs shrink-0"
                    title="Tuần sau"
                  >
                    Sau <ChevronRight className="w-4 h-4 ml-0.5" />
                  </button>
                </div>

                {/* Các nút chọn nhanh tuần */}
                <div className="flex items-center justify-between gap-1 pt-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-400">Chọn nhanh:</span>
                  <div className="flex items-center gap-1">
                    {[1, 9, 18, 19, 35].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setSelectedWeek(w)}
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-all cursor-pointer ${
                          selectedWeek === w
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        T{w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tên bài giảng / Chủ đề */}
              <div className="lg:col-span-8 bg-slate-850/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-black text-slate-200 uppercase tracking-wider">
                      Tên bài giảng / Chủ đề theo PPCT
                    </label>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Khớp PPCT Tuần {selectedWeek}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedClassId) {
                        const res = resolveLessonName(selectedWeek, selectedClassId);
                        if (res) setLessonName(res);
                      }
                    }}
                    className="text-[11px] text-blue-300 hover:text-blue-100 flex items-center gap-1 cursor-pointer font-bold transition-all py-0.5 px-2 rounded-md hover:bg-slate-700/60 w-fit"
                    title="Nhấn để tải lại đúng tên bài theo phân phối chương trình"
                  >
                    <RotateCcw className="w-3 h-3" /> Lấy lại theo PPCT
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tên bài giảng tự động theo phân phối chương trình..."
                    value={lessonName}
                    onChange={(e) => setLessonName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm md:text-base rounded-xl border-2 border-slate-700 focus:border-blue-400 bg-slate-950 text-amber-300 font-extrabold outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner tracking-wide"
                    required
                  />
                </div>
                
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>💡</span>
                  <span>Tên bài giảng tự động đổi khi cô chọn tuần. Cô có thể sửa trực tiếp nếu có điều chỉnh.</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Nội dung / Hoạt động giảng dạy chính (tùy chọn)
              </label>
              <textarea
                placeholder="Ví dụ: Cho cả lớp thực hành phần mềm luyện gõ, hướng dẫn học sinh thao tác trên máy..."
                value={lessonContent}
                onChange={(e) => setLessonContent(e.target.value)}
                className="w-full h-14 p-3 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-xs md:text-sm focus:ring-2 focus:ring-blue-500/30 outline-none resize-none"
              ></textarea>
            </div>
          </div>

          {/* Section 2: Student Assessment Roster Grid with Attendance */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs overflow-hidden space-y-4">
            
            <div className="p-5 border-b border-slate-150 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 font-display">
                  <UserCheck className="w-5 h-5 text-emerald-500" /> 2. Đánh giá nhanh kết quả học sinh & Điểm danh
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Tích chọn các học sinh cần đánh giá hàng loạt rồi nhấn nút đặt nhanh để tiết kiệm thời gian!</p>
              </div>

              {/* Quick Preset Actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSetDefaultsAll('normal')}
                  disabled={selectedStudentIds.length === 0}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                >
                  Đặt đã chọn ({selectedStudentIds.filter(id => !absentStudentIds.includes(id)).length}): Kiến thức Đạt
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDefaultsAll('excellent')}
                  disabled={selectedStudentIds.length === 0}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 disabled:opacity-50 text-emerald-800 dark:text-emerald-300 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                >
                  🚀 Đặt đã chọn ({selectedStudentIds.filter(id => !absentStudentIds.includes(id)).length}): Kiến thức Tốt
                </button>
              </div>
            </div>

            {/* Attendance Summary Bar (Điểm danh sĩ số & học sinh vắng) */}
            <div className="mx-5 p-3.5 bg-slate-50 dark:bg-slate-750/70 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                  <UserCheck className="w-4 h-4 text-blue-500" />
                  <span>Sĩ số:</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold">{classStudents.length}</span>
                </div>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Có mặt:</span>
                  <span className="font-extrabold">{classStudents.length - absentStudentIds.length}</span>
                </div>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <div className={`flex items-center gap-1.5 font-bold ${absentStudentIds.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  <UserX className="w-4 h-4" />
                  <span>Vắng:</span>
                  <span className={`px-2 py-0.5 rounded-full font-black ${
                    absentStudentIds.length > 0 
                      ? 'bg-rose-500 text-white shadow-xs' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {absentStudentIds.length}
                  </span>
                </div>
              </div>

              {/* Danh sách học sinh vắng dạng chips để quan sát nhanh */}
              {absentStudentIds.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Học sinh vắng:</span>
                  {classStudents.filter(s => absentStudentIds.includes(s.id)).map(s => (
                    <span 
                      key={s.id}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300/70 dark:border-rose-800 text-xs font-bold"
                    >
                      {s.name}
                      <button
                        type="button"
                        onClick={() => handleToggleAbsent(s.id)}
                        className="hover:text-rose-950 dark:hover:text-white cursor-pointer ml-0.5 font-black text-sm"
                        title="Bỏ đánh dấu vắng"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={handleResetAllPresent}
                    className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline cursor-pointer ml-1 font-bold"
                  >
                    (Đặt lại đi học đầy đủ)
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    ✓ Toàn bộ học sinh có mặt đầy đủ
                  </span>
                </div>
              )}
            </div>

            {classStudents.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                Lớp học này hiện chưa có học sinh nào. Hãy quay lại danh sách học sinh để thêm các em vào lớp.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-750/50 border-b border-slate-150 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">
                      <th className="px-4 py-3 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={classStudents.length > 0 && classStudents.every(s => selectedStudentIds.includes(s.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds(classStudents.map(s => s.id));
                            } else {
                              setSelectedStudentIds([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-5 py-3">Học sinh</th>
                      <th className="px-4 py-3 text-center w-36 font-black text-rose-600 dark:text-rose-400">ĐIỂM DANH (VẮNG)</th>
                      <th className="px-5 py-3 text-center min-w-[190px] font-black text-blue-600 dark:text-blue-400">KIẾN THỨC</th>
                      <th className="px-5 py-3 text-center min-w-[190px]">Thái độ</th>
                      <th className="px-5 py-3 text-center min-w-[190px]">Kỹ năng</th>
                      <th className="px-5 py-3 text-center min-w-[190px]">Hợp tác</th>
                      <th className="px-5 py-3 min-w-[240px]">Ghi chú (lưu ý đặc biệt / lý do vắng)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                    {classStudents.map((s) => {
                      const isAbsent = absentStudentIds.includes(s.id);
                      const assess = tempAssessments[s.id] || {
                        completion: 'Hoàn thành',
                        attitude: 'Bình thường',
                        skill: 'Đạt',
                        cooperation: 'Đạt'
                      };
                      const isSelected = selectedStudentIds.includes(s.id);

                      return (
                        <tr 
                          key={s.id} 
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-750/20 transition-all ${
                            isAbsent 
                              ? 'bg-rose-50/60 dark:bg-rose-950/25 border-l-4 border-l-rose-500' 
                              : isSelected 
                              ? 'bg-blue-50/20 dark:bg-blue-900/10' 
                              : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedStudentIds(prev =>
                                  prev.includes(s.id)
                                    ? prev.filter(id => id !== s.id)
                                    : [...prev, s.id]
                                );
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>

                          {/* Student Info */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <p className={`font-semibold transition-colors ${isAbsent ? 'line-through text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-850 dark:text-slate-100'}`}>
                                {s.name}
                              </p>
                              {isAbsent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs">
                                  VẮNG
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{s.studentId}</p>
                          </td>

                          {/* Cột Điểm danh vắng (Chọn nhanh trạng thái vắng) */}
                          <td className="px-4 py-3.5 text-center">
                            <label 
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${
                                isAbsent 
                                  ? 'bg-rose-500 border-rose-600 text-white shadow-xs ring-2 ring-rose-500/20' 
                                  : 'bg-slate-50 hover:bg-rose-50 dark:bg-slate-750 dark:hover:bg-rose-950/40 border-slate-200 dark:border-slate-650 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-300'
                              }`}
                              title={isAbsent ? "Nhấn để bỏ đánh dấu vắng" : "Đánh dấu học sinh này vắng học"}
                            >
                              <input
                                type="checkbox"
                                checked={isAbsent}
                                onChange={() => handleToggleAbsent(s.id)}
                                className="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer accent-rose-600"
                              />
                              <span>{isAbsent ? 'Đang Vắng' : 'Vắng?'}</span>
                            </label>
                          </td>

                          {/* Completion Rating Block */}
                          <td className="px-5 py-3.5 text-center">
                            {isAbsent ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40">
                                🚫 Vắng tiết
                              </span>
                            ) : (
                              <div className="inline-flex bg-slate-100 dark:bg-slate-750 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(s.id, 'completion', 'Hoàn thành tốt')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    assess.completion === 'Hoàn thành tốt'
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  ✅ Tốt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(s.id, 'completion', 'Hoàn thành')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    assess.completion === 'Hoàn thành'
                                      ? 'bg-blue-500 text-white shadow-xs'
                                      : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  ✅ Đạt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(s.id, 'completion', 'Chưa hoàn thành')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    assess.completion === 'Chưa hoàn thành'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  ⚠️ Chưa đạt
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Attitude Block */}
                          <td className="px-5 py-3.5 text-center">
                            {isAbsent ? (
                              <span className="text-xs text-slate-400 font-mono italic">-</span>
                            ) : (
                              <div className="inline-flex bg-slate-100 dark:bg-slate-750 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(s.id, 'attitude', 'Tích cực')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    assess.attitude === 'Tích cực'
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  😊 Tích cực
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(s.id, 'attitude', 'Bình thường')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    assess.attitude === 'Bình thường'
                                      ? 'bg-slate-400 text-white shadow-xs'
                                      : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  😐 Thường
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(s.id, 'attitude', 'Chưa tập trung')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    assess.attitude === 'Chưa tập trung'
                                      ? 'bg-rose-500 text-white shadow-xs'
                                      : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  😟 Chưa tập trung
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Skill Block */}
                          <td className="px-5 py-3.5 text-center">
                            {isAbsent ? (
                              <span className="text-xs text-slate-400 font-mono italic">-</span>
                            ) : (
                              <div className="inline-flex bg-slate-100 dark:bg-slate-750 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(s.id, 'skill', 'Thành thạo')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    assess.skill === 'Thành thạo'
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  💻 Tốt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(s.id, 'skill', 'Đạt')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    assess.skill === 'Đạt'
                                      ? 'bg-blue-500 text-white shadow-xs'
                                      : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  🖱️ Đạt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(s.id, 'skill', 'Cần hỗ trợ')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    assess.skill === 'Cần hỗ trợ'
                                      ? 'bg-rose-500 text-white shadow-xs'
                                      : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  🆘 Yếu
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Cooperation Block */}
                          <td className="px-5 py-3.5 text-center">
                            {isAbsent ? (
                              <span className="text-xs text-slate-400 font-mono italic">-</span>
                            ) : (
                              <div className="inline-flex bg-slate-100 dark:bg-slate-750 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(s.id, 'cooperation', 'Tốt')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    assess.cooperation === 'Tốt'
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  🤝 Tốt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(s.id, 'cooperation', 'Đạt')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    assess.cooperation === 'Đạt'
                                      ? 'bg-blue-500 text-white shadow-xs'
                                      : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  👥 Đạt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(s.id, 'cooperation', 'Cần cố gắng')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    assess.cooperation === 'Cần cố gắng'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  ⚠️ Thấp
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Ghi chú trường hợp đặc biệt / lý do vắng */}
                          <td className="px-5 py-3.5 min-w-[240px]">
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder={isAbsent ? "Lý do vắng (nghỉ có phép, ốm, việc bận...)" : "Lưu ý đặc biệt (quên bài, tiếp thu tốt, cần kèm...)"}
                                value={assess.note || ''}
                                onChange={(e) => handleUpdateField(s.id, 'note', e.target.value)}
                                className={`w-full px-3 py-1.5 rounded-xl text-xs outline-none transition-all ${
                                  isAbsent
                                    ? 'bg-rose-50/80 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-850 text-rose-800 dark:text-rose-200 placeholder-rose-400 font-medium focus:ring-1 focus:ring-rose-500'
                                    : 'bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-650 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                }`}
                              />
                              {isAbsent && (
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateField(s.id, 'note', 'Vắng có phép')}
                                    className="px-2 py-0.5 rounded-md bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold cursor-pointer"
                                  >
                                    + Có phép
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateField(s.id, 'note', 'Vắng không phép')}
                                    className="px-2 py-0.5 rounded-md bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold cursor-pointer"
                                  >
                                    + Không phép
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Form Actions footer */}
          {classStudents.length > 0 && (
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleBackToClasses}
                className="px-6 py-3 border border-slate-250 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-5 h-5" /> Lưu Tiết Học & Đánh giá Roster
              </button>
            </div>
          )}

        </form>
      )}

    </div>
  );
}
