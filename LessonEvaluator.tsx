/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, CheckSquare, Sparkles, UserCheck, UserX, ChevronRight, ChevronLeft, ChevronDown, Save, ThumbsUp, AlertCircle, ArrowLeft, RotateCcw, Layers } from 'lucide-react';
import { Class, Student, Lesson, Assessment, TimelineWeek, Grade } from '../types';
import { TIN_HOC_3_CURRICULUM, TIN_HOC_4_CURRICULUM, CONG_NGHE_5_CURRICULUM } from '../lib/curriculumData';

interface LessonEvaluatorProps {
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
  // Step 1: Grade and Class Selection
  const [selectedGradeId, setSelectedGradeId] = useState<string>(() => {
    const g3 = grades.find(g => g.name.includes('3'));
    return g3?.id || grades[0]?.id || '';
  });
  const [selectedClassId, setSelectedClassId] = useState('');

  // Keep selectedGradeId valid if grades change
  useEffect(() => {
    if (!selectedGradeId && grades.length > 0) {
      const g3 = grades.find(g => g.name.includes('3'));
      setSelectedGradeId(g3?.id || grades[0].id);
    }
  }, [grades, selectedGradeId]);
  
  // Step 2: Lesson Diary Form (Chọn tuần thay vì chọn ngày)
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const matched = timeline.find(w => w.startDate && w.endDate && todayStr >= w.startDate && todayStr <= w.endDate);
    return matched?.stt || 1;
  });
  const [lessonName, setLessonName] = useState('');
  const [lessonContent, setLessonContent] = useState('');

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
  
  // Step 3: Class Roster with temporary assessments
  const [isClassSelected, setIsClassSelected] = useState(false);
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

  // Handle class pick
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

    // Initialize temporary assessments for every student with note field
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
    setIsClassSelected(true);
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

  // Set default values for all students at once to save time
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

  // Update specific student field (including note)
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

  // Save Lesson and Assessments
  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !lessonName.trim() || classStudents.length === 0) return;

    const todayDate = new Date().toISOString().split('T')[0];

    const absentStudents = classStudents.filter(s => absentStudentIds.includes(s.id));
    const absentSummary = absentStudents.map(s => s.name).join(', ');
    const attendanceNote = absentStudents.length > 0 
      ? `Sĩ số: ${classStudents.length} · Có mặt: ${classStudents.length - absentStudents.length} · Vắng (${absentStudents.length}): ${absentSummary}`
      : `Sĩ số: ${classStudents.length} (Đầy đủ)`;

    // 1. Create and Save the lesson diary entry with week and attendance info
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

    // 2. Prepare and save associated student assessments (including note and absent flag)
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

    // Show success & reset
    setNotification(`Đã ghi nhận bài giảng Tuần ${selectedWeek} và toàn bộ đánh giá học sinh thành công!`);
    setTimeout(() => {
      setNotification('');
      setIsClassSelected(false);
      setSelectedClassId('');
      setLessonName('');
      setLessonContent('');
      setAbsentStudentIds([]);
    }, 2500);
  };

  return (
    <div id="lesson-eval-container" className="space-y-6">
      
      {/* Notifications */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-300 rounded-xl font-bold text-center flex items-center justify-center gap-2 transition-all shadow-xs">
          <Sparkles className="w-5 h-5 text-emerald-500 animate-bounce" /> {notification}
        </div>
      )}

      {!isClassSelected ? (
        // STEP 1: Select Grade then Select Class Screen
        <div className="space-y-6">
          <div className="text-left">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Đánh Giá Tiết Học & Điểm Danh
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Quy trình: <strong>Bước 1: Chọn Khối lớp</strong> → <strong>Bước 2: Chọn Lớp học cần đánh giá</strong>
            </p>
          </div>

          {/* BƯỚC 1: CHỌN KHỐI LỚP */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <span>1️⃣</span> Bước 1: Chọn Khối Lớp Đánh Giá:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  (Bấm chọn khối trước để lọc danh sách lớp)
                </span>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Đang chọn: {grades.find(g => g.id === selectedGradeId)?.name || 'Chưa chọn'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {grades.map(g => {
                const isSelected = selectedGradeId === g.id;
                const gradeClasses = classes.filter(c => c.gradeId === g.id);
                const gradeClassIds = gradeClasses.map(c => c.id);
                const countStudents = students.filter(s => gradeClassIds.includes(s.classId)).length;
                const isTech = g.name.includes('5');

                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGradeId(g.id)}
                    className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer shadow-xs flex items-center gap-3 border ${
                      isSelected
                        ? isTech
                          ? 'bg-amber-500 text-slate-950 font-black shadow-amber-500/25 ring-2 ring-amber-400 border-amber-600 scale-[1.02]'
                          : 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-400 border-blue-600 scale-[1.02]'
                        : 'bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-650'
                    }`}
                  >
                    <span className="text-xl">{isTech ? '🛠️' : '💻'}</span>
                    <div className="text-left">
                      <div className="font-extrabold text-sm">{g.name}</div>
                      <div className={`text-[11px] font-medium ${isSelected ? (isTech ? 'text-slate-900' : 'text-blue-100') : 'text-slate-500 dark:text-slate-400'}`}>
                        {isTech ? 'Môn Công nghệ' : 'Môn Tin học'} • {gradeClasses.length} lớp
                      </div>
                    </div>
                    <span className={`ml-2 text-xs px-2.5 py-1 rounded-full font-bold ${
                      isSelected
                        ? isTech ? 'bg-black/20 text-slate-950' : 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-650 text-slate-600 dark:text-slate-300'
                    }`}>
                      {countStudents} HS
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BƯỚC 2: CHỌN LỚP HỌC */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>2️⃣</span> Bước 2: Chọn Lớp Học Thuộc {grades.find(g => g.id === selectedGradeId)?.name || 'Khối Đã Chọn'}:
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                (Bấm vào lớp học để mở phiếu đánh giá)
              </span>
            </div>

            {classes.filter(c => c.gradeId === selectedGradeId).length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 border-dashed text-slate-400">
                Chưa có lớp nào thuộc {grades.find(g => g.id === selectedGradeId)?.name || 'khối này'}.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {classes.filter(c => c.gradeId === selectedGradeId).map((c) => {
                  const totalClassStudents = students.filter(s => s.classId === c.id).length;
                  const isTech = grades.find(g => g.id === c.gradeId)?.name.includes('5') || c.subject === 'Công nghệ';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClass(c.id)}
                      className="p-5 bg-white dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-750 rounded-2xl border border-slate-150 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md text-left transition-all group flex flex-col justify-between h-40 cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isTech ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                          }`}>
                            {isTech ? '🛠️ Công nghệ' : '💻 Tin học'}
                          </span>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </div>
                        <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          Lớp {c.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Sĩ số: <strong className="text-slate-700 dark:text-slate-300 font-bold">{totalClassStudents}</strong> học sinh</p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span className="truncate">GVCN: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.homeroomTeacher || 'Chưa rõ'}</span></span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // STEP 2: Lesson Diary & Student Assessments Grid
        <form onSubmit={handleSaveAll} className="space-y-6">
          
          {/* Header Action Row */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setIsClassSelected(false)}
              className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại chọn lớp ({grades.find(g => g.id === selectedGradeId)?.name || 'Khối'})
            </button>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Đánh giá: Lớp {classes.find(c => c.id === selectedClassId)?.name} ({grades.find(g => g.id === selectedGradeId)?.name || ''})
            </h2>
          </div>

          {/* Lesson Diary Entry - Chọn tuần thay vì ngày & hiển thị rõ ràng */}
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
                  Lớp {classes.find(c => c.id === selectedClassId)?.name} • {grades.find(g => g.id === selectedGradeId)?.name}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-300">
                  {classes.find(c => c.id === selectedClassId)?.subject || (grades.find(g => g.id === selectedGradeId)?.name.includes('5') ? '🛠️ Công nghệ' : '💻 Tin học')}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                  {selectedWeek <= 18 ? 'Học kỳ 1' : 'Học kỳ 2'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Nút chọn Tuần & Dropdown tuần (Đã tối ưu gọn gàng, chỉ hiển thị số tuần) */}
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

              {/* Tên bài giảng / Chủ đề (Tự động cập nhật từ PPCT, hiển thị rõ ràng dễ nhìn) */}
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
                  
                  {/* Nút khôi phục theo PPCT nếu người dùng muốn tải lại */}
                  <button
                    type="button"
                    onClick={() => {
                      const res = resolveLessonName(selectedWeek, selectedClassId);
                      if (res) setLessonName(res);
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

          {/* Student Assessment Roster Grid */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs overflow-hidden space-y-4">
            
            <div className="p-5 border-b border-slate-150 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-500" /> 2. Đánh giá nhanh kết quả học sinh
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Tích chọn các học sinh cần đánh giá hàng loạt rồi nhấn nút đặt nhanh để tiết kiệm thời gian!</p>
              </div>

              {/* Quick Preset Actions */}
              <div className="flex gap-2">
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
                    onClick={() => setAbsentStudentIds([])}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer ml-1 font-medium"
                  >
                    (Đặt lại cả lớp có mặt)
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  ✓ Toàn bộ học sinh có mặt đầy đủ
                </span>
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
                              <p className={`font-semibold transition-colors ${isAbsent ? 'line-through text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-800 dark:text-slate-100'}`}>
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
                onClick={() => setIsClassSelected(false)}
                className="px-6 py-3 border border-slate-250 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
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
