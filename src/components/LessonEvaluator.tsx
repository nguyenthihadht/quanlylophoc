/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, CheckSquare, Sparkles, UserCheck, ChevronRight, Save, ThumbsUp, AlertCircle, ArrowLeft } from 'lucide-react';
import { Class, Student, Lesson, Assessment } from '../types';

interface LessonEvaluatorProps {
  classes: Class[];
  students: Student[];
  lessons: Lesson[];
  assessments: Assessment[];
  onSaveAssessments: (
    lessonId: string, 
    date: string, 
    assessments: Omit<Assessment, 'id' | 'lessonId' | 'date'>[]
  ) => void;
  onAddLesson: (lesson: Omit<Lesson, 'id'>) => Lesson;
}

export function LessonEvaluator({
  classes,
  students,
  lessons,
  assessments,
  onSaveAssessments,
  onAddLesson
}: LessonEvaluatorProps) {
  // Step 1: Class Selection
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // Step 2: Lesson Diary Form
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split('T')[0]);
  const [lessonName, setLessonName] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  
  // Step 3: Class Roster with temporary assessments
  const [isClassSelected, setIsClassSelected] = useState(false);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [tempAssessments, setTempAssessments] = useState<Record<string, {
    completion: 'Hoàn thành tốt' | 'Hoàn thành' | 'Chưa hoàn thành';
    attitude: 'Tích cực' | 'Bình thường' | 'Chưa tập trung';
    skill: 'Thành thạo' | 'Đạt' | 'Cần hỗ trợ';
    cooperation: 'Tốt' | 'Đạt' | 'Cần cố gắng';
  }>>({});

  const [notification, setNotification] = useState('');

  // Handle class pick
  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    const filtered = students.filter(s => s.classId === classId);
    setClassStudents(filtered);
    setSelectedStudentIds(filtered.map(s => s.id));

    // Initialize temporary assessments for every student
    const initial: typeof tempAssessments = {};
    filtered.forEach(s => {
      initial[s.id] = {
        completion: 'Hoàn thành',
        attitude: 'Bình thường',
        skill: 'Đạt',
        cooperation: 'Đạt'
      };
    });
    setTempAssessments(initial);
    setIsClassSelected(true);
  };

  // Set default values for all students at once to save time
  const handleSetDefaultsAll = (level: 'excellent' | 'normal') => {
    const updated = { ...tempAssessments };
    classStudents.forEach(s => {
      if (selectedStudentIds.includes(s.id)) {
        if (level === 'excellent') {
          updated[s.id] = {
            completion: 'Hoàn thành tốt',
            attitude: 'Tích cực',
            skill: 'Thành thạo',
            cooperation: 'Tốt'
          };
        } else {
          updated[s.id] = {
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

  // Update specific student field
  const handleUpdateField = (
    studentId: string, 
    field: 'completion' | 'attitude' | 'skill' | 'cooperation', 
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

    // 1. Create and Save the lesson diary entry
    const newLesson = onAddLesson({
      date: lessonDate,
      classId: selectedClassId,
      lessonName: lessonName.trim(),
      content: lessonContent.trim() || 'Thực hành Tin học trên lớp',
      createdBy: 'Cô Nguyễn Thị Hà'
    });

    // 2. Prepare and save associated student assessments
    const assessmentList = classStudents.map(s => ({
      studentId: s.id,
      completion: tempAssessments[s.id]?.completion || 'Hoàn thành',
      attitude: tempAssessments[s.id]?.attitude || 'Bình thường',
      skill: tempAssessments[s.id]?.skill || 'Đạt',
      cooperation: tempAssessments[s.id]?.cooperation || 'Đạt'
    }));

    onSaveAssessments(newLesson.id, lessonDate, assessmentList);

    // Show success & reset
    setNotification('Đã ghi nhận bài giảng và toàn bộ đánh giá học sinh thành công!');
    setTimeout(() => {
      setNotification('');
      setIsClassSelected(false);
      setSelectedClassId('');
      setLessonName('');
      setLessonContent('');
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
        // STEP 1: Select Class Screen
        <div className="space-y-4">
          <div className="text-left">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" /> Chọn Lớp Học Bắt Đầu Đánh Giá
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Nhấp chọn lớp học để tạo nhật ký bài giảng và ghi nhận kết quả học sinh.
            </p>
          </div>

          {classes.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 border-dashed text-slate-400">
              Bạn chưa có lớp học nào. Hãy quay lại mục quản lý lớp học để thêm lớp mới trước.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {classes.map((c) => {
                const totalClassStudents = students.filter(s => s.classId === c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectClass(c.id)}
                    className="p-5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-2xl border border-slate-150 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs text-left transition-all group flex flex-col justify-between h-36 cursor-pointer"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
                        Lớp {c.name}
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-all" />
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Sĩ số: {totalClassStudents} học sinh</p>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      GVCN: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.homeroomTeacher || 'Chưa rõ'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // STEP 2: Lesson Diary & Student Assessments Grid
        <form onSubmit={handleSaveAll} className="space-y-6">
          
          {/* Header Action Row */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setIsClassSelected(false)}
              className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại chọn lớp
            </button>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Đánh giá: Lớp {classes.find(c => c.id === selectedClassId)?.name}
            </h2>
          </div>

          {/* Lesson Diary Entry */}
          <div className="bg-slate-900 dark:bg-slate-950 p-5 rounded-2xl border border-slate-800 dark:border-slate-850 shadow-md space-y-4 text-white">
            <h3 className="text-sm font-black uppercase tracking-wider text-blue-400 font-display">1. Thông tin buổi học</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Ngày dạy</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="date"
                    value={lessonDate}
                    onChange={(e) => setLessonDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-700 bg-slate-800/80 text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Tên bài giảng / Chủ đề</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bài 2: Tập gõ hàng phím cơ sở"
                  value={lessonName}
                  onChange={(e) => setLessonName(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-700 bg-slate-800/80 text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Nội dung / Hoạt động giảng dạy chính (tùy chọn)</label>
              <textarea
                placeholder="Ví dụ: Cho cả lớp thực hành phần mềm TuxTyping luyện ngón hàng phím..."
                value={lessonContent}
                onChange={(e) => setLessonContent(e.target.value)}
                className="w-full h-16 p-3 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-sm focus:ring-2 focus:ring-blue-500/30 outline-none resize-none"
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
                  Đặt đã chọn ({selectedStudentIds.length}): Hoàn thành
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDefaultsAll('excellent')}
                  disabled={selectedStudentIds.length === 0}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 disabled:opacity-50 text-emerald-800 dark:text-emerald-300 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                >
                  🚀 Đặt đã chọn ({selectedStudentIds.length}): Hoàn thành tốt
                </button>
              </div>
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
                      <th className="px-5 py-3 text-center min-w-[200px]">Hoàn thành</th>
                      <th className="px-5 py-3 text-center min-w-[200px]">Thái độ</th>
                      <th className="px-5 py-3 text-center min-w-[200px]">Kỹ năng</th>
                      <th className="px-5 py-3 text-center min-w-[200px]">Hợp tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                    {classStudents.map((s) => {
                      const assess = tempAssessments[s.id] || {
                        completion: 'Hoàn thành',
                        attitude: 'Bình thường',
                        skill: 'Đạt',
                        cooperation: 'Đạt'
                      };
                      const isSelected = selectedStudentIds.includes(s.id);

                      return (
                        <tr key={s.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-750/20 transition-all ${isSelected ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
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
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{s.name}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{s.studentId}</p>
                          </td>

                          {/* Completion Rating Block */}
                          <td className="px-5 py-3.5 text-center">
                            <div className="inline-flex bg-slate-100 dark:bg-slate-750 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleUpdateField(s.id, 'completion', 'Hoàn thành tốt')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  assess.completion === 'Hoàn thành tốt'
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                ⚠️ Chưa đạt
                              </button>
                            </div>
                          </td>

                          {/* Attitude Block */}
                          <td className="px-5 py-3.5 text-center">
                            <div className="inline-flex bg-slate-100 dark:bg-slate-750 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleUpdateField(s.id, 'attitude', 'Tích cực')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  assess.attitude === 'Tích cực'
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                😟 Chưa tập trung
                              </button>
                            </div>
                          </td>

                          {/* Skill Block */}
                          <td className="px-5 py-3.5 text-center">
                            <div className="inline-flex bg-slate-100 dark:bg-slate-750 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleUpdateField(s.id, 'skill', 'Thành thạo')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  assess.skill === 'Thành thạo'
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                🆘 Yếu
                              </button>
                            </div>
                          </td>

                          {/* Cooperation Block */}
                          <td className="px-5 py-3.5 text-center">
                            <div className="inline-flex bg-slate-100 dark:bg-slate-750 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleUpdateField(s.id, 'cooperation', 'Tốt')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  assess.cooperation === 'Tốt'
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                ⚠️ Thấp
                              </button>
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
                <Save className="w-5 h-5" /> Lưu Buổi Học & Đánh giá Roster
              </button>
            </div>
          )}

        </form>
      )}

    </div>
  );
}
