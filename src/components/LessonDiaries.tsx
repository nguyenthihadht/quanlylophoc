/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, Printer, Search, Trash2, Edit2, Eye, UserCheck, ArrowLeft, Layers } from 'lucide-react';
import { Class, Lesson, Student, Assessment, Grade, TimelineWeek } from '../types';

interface LessonDiariesProps {
  classes: Class[];
  grades: Grade[];
  lessons: Lesson[];
  students: Student[];
  assessments: Assessment[];
  timeline: TimelineWeek[];
  onDeleteLesson: (id: string) => void;
  onUpdateLesson: (id: string, name: string, content: string, date: string) => void;
}

export function LessonDiaries({
  classes,
  grades,
  lessons,
  students,
  assessments,
  timeline,
  onDeleteLesson,
  onUpdateLesson
 }: LessonDiariesProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
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

  // Filter lessons
  const filteredLessons = lessons.filter(l => {
    const targetClass = classes.find(c => c.id === l.classId);
    return l.lessonName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           l.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (targetClass && targetClass.name.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // Selected Lesson details
  const currentLesson = lessons.find(l => l.id === selectedLessonId);
  const lessonClass = currentLesson ? classes.find(c => c.id === currentLesson.classId) : null;
  const lessonGrade = lessonClass ? grades.find(g => g.id === lessonClass.gradeId) : null;
  const lessonAssessments = currentLesson ? assessments.filter(a => a.lessonId === currentLesson.id) : [];

  return (
    <div id="lesson-diaries-container" className="space-y-6">

      {!selectedLessonId ? (
        // LIST VIEW
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row gap-4 justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-base">
              <BookOpen className="w-5 h-5 text-blue-500" /> Nhật ký dạy học & Đã dạy
            </h3>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
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
              Chưa có nhật ký bài giảng nào phù hợp.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...filteredLessons].sort((a, b) => b.date.localeCompare(a.date)).map((lesson) => {
                const targetClass = classes.find(c => c.id === lesson.classId);
                const targetGrade = targetClass ? grades.find(g => g.id === targetClass.gradeId) : null;
                const totalAssessments = assessments.filter(a => a.lessonId === lesson.id).length;

                return (
                  <div key={lesson.id} className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700/80 shadow-xs flex flex-col justify-between transition-all hover:shadow-xs">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          Lớp {targetClass?.name} ({targetGrade?.name})
                        </span>
                        <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5 flex-wrap justify-end">
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
                    </div>

                    <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                      <span className="text-xs text-slate-400 font-medium">
                        Đã đánh giá: <span className="font-bold text-slate-700 dark:text-slate-300">{totalAssessments} học sinh</span>
                      </span>

                      <div className="flex gap-2">
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
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4 no-print">
            <button
              onClick={() => setSelectedLessonId(null)}
              className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Trở lại danh sách
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> In Sổ Điểm / PDF
            </button>
          </div>

          {/* Lesson Summary Info Block */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                Lớp {lessonClass?.name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                {lessonGrade?.name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                GVBM: Cô Nguyễn Thị Hà
              </span>
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
            <div className="p-4 bg-slate-50 dark:bg-slate-750/50 rounded-xl border border-slate-100 dark:border-slate-700/60 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Nội dung bài học:</p>
              {currentLesson?.content || 'Không ghi nhận thêm nội dung hoạt động.'}
            </div>
          </div>

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
                    <th className="px-5 py-3">Hoàn thành</th>
                    <th className="px-5 py-3">Thái độ</th>
                    <th className="px-5 py-3">Kỹ năng</th>
                    <th className="px-5 py-3">Hợp tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-750 dark:text-slate-350">
                  {lessonAssessments.map((a) => {
                    const student = students.find(s => s.id === a.studentId);
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/20">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-1 rounded-md border border-blue-200/30">
                            {student?.studentId || 'Chưa rõ'}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold">
                          <span className="font-extrabold text-slate-900 dark:text-slate-50 text-sm">
                            {student?.name || 'Không có tên'}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block ${
                            a.completion === 'Hoàn thành tốt' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/30' :
                            a.completion === 'Hoàn thành' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/30' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/30'
                          }`}>
                            {a.completion}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block ${
                            a.attitude === 'Tích cực' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/30' :
                            a.attitude === 'Bình thường' ? 'bg-slate-100 text-slate-750 dark:bg-slate-700 dark:text-slate-200 border border-slate-200/30' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/30'
                          }`}>
                            {a.attitude}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block ${
                            a.skill === 'Thành thạo' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/30' :
                            a.skill === 'Đạt' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/30' :
                            'bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300 border border-pink-200/30'
                          }`}>
                            {a.skill}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block ${
                            a.cooperation === 'Tốt' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200/30' :
                            a.cooperation === 'Đạt' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200/30' :
                            'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200/30'
                          }`}>
                            {a.cooperation}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
