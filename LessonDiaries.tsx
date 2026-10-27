/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Calendar, Printer, Search, Trash2, Edit2, Edit3, Eye, UserCheck, ArrowLeft, Layers, BookmarkCheck, ArrowRight, CheckCircle2, Users } from 'lucide-react';
import { Class, Lesson, Student, Assessment, Grade, TimelineWeek } from '../types';
import { ClassTrackerAPI } from '../lib/api';

interface LessonDiariesProps {
  classes: Class[];
  grades: Grade[];
  lessons: Lesson[];
  students: Student[];
  assessments: Assessment[];
  timeline: TimelineWeek[];
  readOnly?: boolean;
  onDeleteLesson: (id: string) => void;
  onUpdateLesson: (id: string, name: string, content: string, date: string) => void;
  onNavigateToAssess?: (lessonId: string) => void;
}

export function LessonDiaries({
  classes,
  grades,
  lessons,
  students,
  assessments,
  timeline,
  readOnly = false,
  onDeleteLesson,
  onUpdateLesson,
  onNavigateToAssess
 }: LessonDiariesProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'official' | 'draft'>('all');
  
  // Edit States
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');

  // Auto-fill edit name based on timeline week when editing date changes
  useEffect(() => {
    if (!editDate || !timeline || timeline.length === 0 || !editingLesson) return;
    // Only auto-update if the date has actually been changed from the original lesson date
    if (editDate === editingLesson.date) return;
    const matchedWeek = timeline.find(w => editDate >= w.startDate && editDate <= w.endDate);
    if (matchedWeek && matchedWeek.lessonName) {
      setEditName(matchedWeek.lessonName);
    }
  }, [editDate, timeline, editingLesson]);

  const handleOpenEdit = (l: Lesson) => {
    setEditingLesson(l);
    setEditName(l.lessonName);
    setEditContent(l.content);
    setEditDate(l.date);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !editName.trim()) return;

    onUpdateLesson(editingLesson.id, editName.trim(), editContent.trim(), editDate);
    setEditingLesson(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const draftCount = lessons.filter(l => l.isDraft).length;
  const officialCount = lessons.filter(l => !l.isDraft).length;

  // Filter lessons
  const filteredLessons = lessons.filter(l => {
    const targetClass = classes.find(c => c.id === l.classId);
    const matchesSearch = l.lessonName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           l.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (targetClass && targetClass.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    if (statusFilter === 'official') return !l.isDraft;
    if (statusFilter === 'draft') return !!l.isDraft;
    return true;
  });

  // Selected Lesson details
  const currentLesson = lessons.find(l => l.id === selectedLessonId);
  const lessonClass = currentLesson ? classes.find(c => c.id === currentLesson.classId) : null;
  const lessonGrade = lessonClass ? grades.find(g => g.id === lessonClass.gradeId) : null;

  // Students belonging to this lesson's class
  const classStudentsForLesson = useMemo(() => {
    if (!currentLesson) return [];
    return students.filter(s => s.classId === currentLesson.classId);
  }, [currentLesson, students]);

  // Direct assessments saved in state for this lesson
  const directAssessments = useMemo(() => {
    if (!currentLesson) return [];
    return assessments.filter(a => a.lessonId === currentLesson.id);
  }, [currentLesson, assessments]);

  // Robust display assessments: If directly saved, use them. If empty, synthesize from class students so roster is NEVER blank!
  const displayedAssessments: Assessment[] = useMemo(() => {
    if (!currentLesson) return [];
    if (directAssessments.length > 0) {
      return directAssessments;
    }
    // Fallback: auto-synthesize from class students
    const absentSet = new Set(currentLesson.absentStudentIds || []);
    return classStudentsForLesson.map((s, idx) => {
      const isAbsent = absentSet.has(s.id);
      return {
        id: `auto_${currentLesson.id}_${s.id}_${idx}`,
        lessonId: currentLesson.id,
        date: currentLesson.date,
        studentId: s.id,
        completion: isAbsent ? 'Chưa hoàn thành' : 'Hoàn thành',
        attitude: 'Bình thường',
        skill: isAbsent ? 'Cần hỗ trợ' : 'Đạt',
        cooperation: isAbsent ? 'Cần cố gắng' : 'Đạt',
        note: isAbsent ? 'Vắng học' : '',
        isAbsent
      } as Assessment;
    });
  }, [currentLesson, directAssessments, classStudentsForLesson]);

  // Auto-repair & persist missing assessments to backend/Firestore so they remain saved forever
  useEffect(() => {
    if (currentLesson && !readOnly && classStudentsForLesson.length > 0) {
      const direct = assessments.filter(a => a.lessonId === currentLesson.id);
      if (direct.length === 0) {
        const absentSet = new Set(currentLesson.absentStudentIds || []);
        const toSave = classStudentsForLesson.map(s => {
          const isAbsent = absentSet.has(s.id);
          return {
            studentId: s.id,
            completion: isAbsent ? ('Chưa hoàn thành' as const) : ('Hoàn thành' as const),
            attitude: 'Bình thường' as const,
            skill: isAbsent ? ('Cần hỗ trợ' as const) : ('Đạt' as const),
            cooperation: isAbsent ? ('Cần cố gắng' as const) : ('Đạt' as const),
            note: isAbsent ? 'Vắng học' : '',
            isAbsent
          };
        });
        ClassTrackerAPI.saveAssessments(currentLesson.id, currentLesson.date, toSave);
      }
    }
  }, [currentLesson?.id, classStudentsForLesson.length, assessments.length, readOnly]);

  return (
    <div id="lesson-diaries-container" className="space-y-6">

      {/* Read-Only Notice Banner */}
      {readOnly && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">👁️</span>
            <div>
              <p className="font-bold">Chế độ Xem tham khảo (Chỉ xem) dành cho Đồng nghiệp</p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Thầy/Cô có thể xem toàn bộ sổ nhật ký giảng dạy, danh sách học sinh vắng từng tiết và in sổ bài dạy. Chức năng sửa hoặc xóa tiết học đã được bảo vệ.</p>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-lg font-bold text-[10px] uppercase tracking-wider">Chỉ xem</span>
        </div>
      )}

      {!selectedLessonId ? (
        // LIST VIEW
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-base shrink-0">
                <BookOpen className="w-5 h-5 text-blue-500" /> Nhật ký dạy học & Đã dạy
              </h3>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-750 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Tất cả ({lessons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('official')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'official'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Chính thức ({officialCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('draft')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'draft'
                      ? 'bg-amber-500 text-white shadow-2xs font-black'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-950/40'
                  }`}
                >
                  <span>Lưu tạm</span>
                  {draftCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-black">
                      {draftCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm bài học, nội dung, lớp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          {filteredLessons.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 text-slate-400">
              {statusFilter === 'draft' ? 'Không có tiết học nào đang lưu tạm.' : 'Chưa có nhật ký bài giảng nào phù hợp.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...filteredLessons].sort((a, b) => b.date.localeCompare(a.date)).map((lesson) => {
                const targetClass = classes.find(c => c.id === lesson.classId);
                const targetGrade = targetClass ? grades.find(g => g.id === targetClass.gradeId) : null;
                const totalAssessments = assessments.filter(a => a.lessonId === lesson.id).length;

                return (
                  <div key={lesson.id} className={`p-5 bg-white dark:bg-slate-800 rounded-2xl border shadow-xs flex flex-col justify-between transition-all hover:shadow-sm ${
                    lesson.isDraft 
                      ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/20 dark:bg-amber-950/10' 
                      : 'border-slate-150 dark:border-slate-700/80'
                  }`}>
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 rounded-xl text-xs font-black bg-[#0f2444] text-white border border-sky-400/80 shadow-xs flex items-center gap-1.5">
                            <span>🏫</span> Lớp {targetClass?.name} ({targetGrade?.name})
                          </span>
                          {lesson.isDraft && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Lưu tạm (Chưa chốt)
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" /> {lesson.date}
                          {(() => {
                            const matchedWeek = timeline?.find(w => lesson.date >= w.startDate && lesson.date <= w.endDate);
                            return matchedWeek ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                {matchedWeek.week}
                              </span>
                            ) : null;
                          })()}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base mt-3 line-clamp-1">
                        {lesson.lessonName}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                        {lesson.content}
                      </p>

                      {/* Hiển thị tóm tắt sĩ số / điểm danh vắng */}
                      {lesson.absentStudentIds && lesson.absentStudentIds.length > 0 ? (
                        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                          <span className="font-bold shrink-0">Vắng ({lesson.absentStudentIds.length}):</span>
                          <span className="truncate">{lesson.absentStudentsSummary || 'Có học sinh vắng'}</span>
                        </div>
                      ) : lesson.notes?.includes('Vắng') ? (
                        <div className="mt-2.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/50 truncate font-semibold">
                          {lesson.notes}
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sĩ số lớp: Đầy đủ
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 gap-2 flex-wrap">
                      <span className="text-xs text-slate-400 font-medium">
                        Đã đánh giá: <span className="font-bold text-slate-700 dark:text-slate-300">{totalAssessments} học sinh</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Nút Đánh giá tiếp */}
                        <button
                          type="button"
                          onClick={() => onNavigateToAssess?.(lesson.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                            lesson.isDraft
                              ? 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-102'
                              : 'bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-200 hover:text-blue-600'
                          }`}
                          title="Mở lại bảng đánh giá để tiếp tục chấm điểm"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>Đánh giá tiếp</span>
                        </button>

                        {!readOnly && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(lesson)}
                              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg transition-all cursor-pointer"
                              title="Sửa thông tin nhật ký"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Bạn có chắc chắn muốn xóa nhật ký bài giảng này? Toàn bộ đánh giá học sinh kèm theo cũng bị xóa.')) {
                                  onDeleteLesson(lesson.id);
                                }
                              }}
                              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                              title="Xóa nhật ký"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedLessonId(lesson.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Xem chi tiết Roster
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // DETAILED LESSON ROSTER VIEW
        <div id="print-area" className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs space-y-6">
          
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4 no-print">
            <button
              onClick={() => setSelectedLessonId(null)}
              className="px-3.5 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Trở lại danh sách
            </button>

            <div className="flex items-center gap-2">
              {onNavigateToAssess && !readOnly && currentLesson && (
                <button
                  type="button"
                  onClick={() => onNavigateToAssess(currentLesson.id)}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" /> {currentLesson.isDraft ? 'Đánh giá tiếp tiết này' : 'Sửa đánh giá & Điểm'}
                </button>
              )}

              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> In Sổ Điểm / PDF
              </button>
            </div>
          </div>

          {/* Lesson Summary Info Block */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#0f2444] text-white border-2 border-sky-400 shadow-sm flex items-center gap-1.5">
                <span>🎯</span> Lớp {lessonClass?.name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                {lessonGrade?.name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                GVBM: Cô Nguyễn Thị Hà
              </span>
              {currentLesson?.isDraft ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40">
                  📝 Đang lưu tạm
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
                  ✅ Đã lưu chính thức
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">{currentLesson?.lessonName}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
              <span>Ngày giảng dạy: {currentLesson?.date}</span>
              {currentLesson && (() => {
                const matchedWeek = timeline?.find(w => currentLesson.date >= w.startDate && currentLesson.date <= w.endDate);
                return matchedWeek ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/30">
                    {matchedWeek.week} ({matchedWeek.semester})
                  </span>
                ) : null;
              })()}
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-750/50 rounded-xl border border-slate-100 dark:border-slate-700/60 text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Nội dung bài học:</p>
                {currentLesson?.content || 'Không ghi nhận thêm nội dung hoạt động.'}
              </div>
              {currentLesson?.notes && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Điểm danh & Ghi chú tiết học:</span>
                  <span className={`px-2.5 py-0.5 rounded-lg font-bold ${
                    currentLesson.notes.includes('Vắng') 
                      ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300/40' 
                      : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40'
                  }`}>
                    {currentLesson.notes}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status banner for the lesson roster */}
          {currentLesson?.isDraft ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📝</span>
                <div>
                  <p className="font-bold text-amber-900 dark:text-amber-200">Tiết học này đang ở trạng thái LƯU TẠM (Chưa chốt chính thức)</p>
                  <p className="text-[11px] text-amber-750 dark:text-amber-300/80">Thầy/Cô có thể tiếp tục đánh giá và chốt điểm cho học sinh bất cứ lúc nào.</p>
                </div>
              </div>
              {onNavigateToAssess && !readOnly && currentLesson && (
                <button
                  type="button"
                  onClick={() => onNavigateToAssess(currentLesson.id)}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Đánh giá tiếp ngay
                </button>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Danh sách đánh giá học sinh buổi học ({displayedAssessments.length} học sinh)
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                Sĩ số lớp: {classStudentsForLesson.length} {currentLesson?.absentStudentIds?.length ? `· Vắng: ${currentLesson.absentStudentIds.length}` : '· Đầy đủ'}
              </span>
            </div>
          )}

          {/* Table of results */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
              <UserCheck className="w-4.5 h-4.5 text-blue-500" /> Bảng điểm nhận xét học sinh buổi học
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-700">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-750/70 border-b border-slate-150 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Mã học sinh</th>
                    <th className="px-5 py-3">Họ và tên</th>
                    <th className="px-5 py-3">Kiến thức</th>
                    <th className="px-5 py-3">Thái độ</th>
                    <th className="px-5 py-3">Kỹ năng</th>
                    <th className="px-5 py-3">Hợp tác</th>
                    <th className="px-5 py-3 min-w-[180px]">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-750 dark:text-slate-350">
                  {displayedAssessments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 px-4 text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Users className="w-10 h-10 text-slate-350" />
                          <p className="font-bold text-sm text-slate-750 dark:text-slate-250">Chưa có thông tin học sinh cho lớp {lessonClass?.name || ''}</p>
                          <p className="text-xs text-slate-400 max-w-md">Lớp này hiện chưa có học sinh trong hệ thống. Thầy/Cô vui lòng nhập danh sách học sinh tại mục "Danh sách học sinh".</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedAssessments.map((a) => {
                      const student = students.find(s => s.id === a.studentId);
                      const isAbsent = Boolean(a.isAbsent || currentLesson?.absentStudentIds?.includes(a.studentId) || a.note?.includes('Vắng'));
                      return (
                        <tr 
                          key={a.id} 
                          className={`transition-colors ${
                            isAbsent 
                              ? 'bg-rose-50/50 dark:bg-rose-950/25 border-l-4 border-l-rose-500 hover:bg-rose-50/70' 
                              : 'hover:bg-slate-50/20'
                          }`}
                        >
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-1 rounded-md border border-blue-200/30">
                              {student?.studentId || 'Chưa rõ'}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-semibold whitespace-nowrap min-w-[200px]">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className={`font-black text-[15px] whitespace-nowrap tracking-tight ${
                                isAbsent 
                                  ? 'line-through text-rose-600 dark:text-rose-400' 
                                  : 'text-slate-900 dark:text-white'
                              }`}>
                                {student?.name || 'Không có tên'}
                              </span>
                              {isAbsent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white shadow-xs whitespace-nowrap">
                                  VẮNG
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {isAbsent ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40">
                                🚫 Vắng mặt
                              </span>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block ${
                                a.completion === 'Hoàn thành tốt' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/30' :
                                a.completion === 'Hoàn thành' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/30' :
                                'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/30'
                              }`}>
                                {a.completion}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {isAbsent ? (
                              <span className="text-slate-400 italic text-xs font-mono">-</span>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block ${
                                a.attitude === 'Tích cực' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/30' :
                                a.attitude === 'Bình thường' ? 'bg-slate-100 text-slate-750 dark:bg-slate-700 dark:text-slate-200 border border-slate-200/30' :
                                'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/30'
                              }`}>
                                {a.attitude}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {isAbsent ? (
                              <span className="text-slate-400 italic text-xs font-mono">-</span>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block ${
                                a.skill === 'Thành thạo' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/30' :
                                a.skill === 'Đạt' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/30' :
                                'bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300 border border-pink-200/30'
                              }`}>
                                {a.skill}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {isAbsent ? (
                              <span className="text-slate-400 italic text-xs font-mono">-</span>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block ${
                                a.cooperation === 'Tốt' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200/30' :
                                a.cooperation === 'Đạt' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200/30' :
                                'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200/30'
                              }`}>
                                {a.cooperation}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-300">
                            {a.note ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${
                                isAbsent 
                                  ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300/40 font-semibold' 
                                  : 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200/50'
                              }`}>
                                📝 {a.note}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lesson Diary Details Modal */}
      {editingLesson && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-750 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Chỉnh sửa Nhật ký bài dạy</h3>
              <button onClick={() => setEditingLesson(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xl font-bold">×</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Ngày giảng dạy</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
                {(() => {
                  const matchedWeek = timeline?.find(w => editDate >= w.startDate && editDate <= w.endDate);
                  return matchedWeek ? (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Tuần dạy tương ứng: <span className="font-bold">{matchedWeek.week} ({matchedWeek.semester})</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1 italic">
                      ⚠️ Ngày này nằm ngoài khung PPCT học đã phân phối
                    </p>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Tên bài học</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Nội dung bài học</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="px-4 py-2 text-sm border border-slate-250 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
