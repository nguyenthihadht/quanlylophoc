/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Layers, Home, Plus, Edit2, Trash2, Check, Star, AlertTriangle, Users, BookOpen, X, Eye, ArrowRight } from 'lucide-react';
import { SchoolYear, Grade, Class, Student } from '../types';

interface SchoolManagerProps {
  schoolYears: SchoolYear[];
  grades: Grade[];
  classes: Class[];
  students: Student[];
  onAddYear: (name: string) => void;
  onUpdateYear: (id: string, name: string) => void;
  onDeleteYear: (id: string) => void;
  onSetCurrentYear: (id: string) => void;
  
  onAddGrade: (name: string) => void;
  onUpdateGrade: (id: string, name: string) => void;
  onDeleteGrade: (id: string) => void;

  onAddClass: (name: string, gradeId: string, homeroomTeacher?: string, subject?: string) => void;
  onUpdateClass: (id: string, name: string, gradeId: string, homeroomTeacher?: string, subject?: string) => void;
  onDeleteClass: (id: string) => void;
}

type Mode = 'year' | 'grade' | 'class';

export function SchoolManager({
  schoolYears,
  grades,
  classes,
  students,
  onAddYear,
  onUpdateYear,
  onDeleteYear,
  onSetCurrentYear,
  onAddGrade,
  onUpdateGrade,
  onDeleteGrade,
  onAddClass,
  onUpdateClass,
  onDeleteClass
}: SchoolManagerProps) {
  const [activeTab, setActiveTab] = useState<Mode>('class');

  // Input states
  const [yearName, setYearName] = useState('');
  const [editingYearId, setEditingYearId] = useState<string | null>(null);

  const [gradeName, setGradeName] = useState('');
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);

  const [className, setClassName] = useState('');
  const [classGradeId, setClassGradeId] = useState('');
  const [classTeacher, setClassTeacher] = useState('');
  const [classSubject, setClassSubject] = useState<'Tin học' | 'Công nghệ'>('Tin học');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // Grade and Class selectors for Class Management
  const [selectedGradeIdForClasses, setSelectedGradeIdForClasses] = useState<string>(() => {
    const g3 = grades.find(g => g.name.includes('3'));
    return g3?.id || grades[0]?.id || '';
  });
  const [selectedClassIdForDetail, setSelectedClassIdForDetail] = useState<string | null>(null);
  const [showAllInGrade, setShowAllInGrade] = useState<boolean>(false);

  // Keep selectedGradeIdForClasses valid and auto-select initial class
  React.useEffect(() => {
    if (!selectedGradeIdForClasses && grades.length > 0) {
      const g3 = grades.find(g => g.name.includes('3'));
      setSelectedGradeIdForClasses(g3?.id || grades[0].id);
    }
  }, [grades, selectedGradeIdForClasses]);

  React.useEffect(() => {
    if (selectedGradeIdForClasses) {
      const gClasses = classes.filter(c => c.gradeId === selectedGradeIdForClasses);
      if (gClasses.length > 0) {
        if (!selectedClassIdForDetail || !gClasses.some(c => c.id === selectedClassIdForDetail)) {
          setSelectedClassIdForDetail(gClasses[0].id);
        }
      } else {
        setSelectedClassIdForDetail(null);
      }
    }
  }, [selectedGradeIdForClasses, classes]);

  // Deletion modals state (replaces window.confirm to guarantee reliable execution in iframe environments)
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const [yearToDelete, setYearToDelete] = useState<SchoolYear | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Confirmation handlers
  const handleConfirmDeleteClass = () => {
    if (!classToDelete) return;
    const deletedName = classToDelete.name;
    if (editingClassId === classToDelete.id) {
      setEditingClassId(null);
      setClassName('');
      setClassTeacher('');
    }
    onDeleteClass(classToDelete.id);
    setClassToDelete(null);
    setFeedbackMessage({
      type: 'success',
      text: `Đã xóa thành công Lớp ${deletedName} cùng toàn bộ danh sách học sinh liên quan!`
    });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleConfirmDeleteGrade = () => {
    if (!gradeToDelete) return;
    const deletedName = gradeToDelete.name;
    if (editingGradeId === gradeToDelete.id) {
      setEditingGradeId(null);
      setGradeName('');
    }
    onDeleteGrade(gradeToDelete.id);
    setGradeToDelete(null);
    setFeedbackMessage({
      type: 'success',
      text: `Đã xóa thành công ${deletedName} cùng toàn bộ các lớp và học sinh!`
    });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleConfirmDeleteYear = () => {
    if (!yearToDelete) return;
    const deletedName = yearToDelete.name;
    if (editingYearId === yearToDelete.id) {
      setEditingYearId(null);
      setYearName('');
    }
    onDeleteYear(yearToDelete.id);
    setYearToDelete(null);
    setFeedbackMessage({
      type: 'success',
      text: `Đã xóa thành công Năm học ${deletedName}!`
    });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Submit handers
  const handleYearSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearName.trim()) return;
    if (editingYearId) {
      onUpdateYear(editingYearId, yearName.trim());
      setEditingYearId(null);
    } else {
      onAddYear(yearName.trim());
    }
    setYearName('');
  };

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeName.trim()) return;
    if (editingGradeId) {
      onUpdateGrade(editingGradeId, gradeName.trim());
      setEditingGradeId(null);
    } else {
      onAddGrade(gradeName.trim());
    }
    setGradeName('');
  };

  const handleClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !classGradeId) return;
    if (editingClassId) {
      onUpdateClass(editingClassId, className.trim(), classGradeId, classTeacher.trim() || undefined, classSubject);
      setEditingClassId(null);
    } else {
      onAddClass(className.trim(), classGradeId, classTeacher.trim() || undefined, classSubject);
    }
    setClassName('');
    setClassTeacher('');
    // Leave classGradeId as is for convenience of adding multiple classes to same grade
  };

  // Edit triggers
  const startEditYear = (year: SchoolYear) => {
    setYearName(year.name);
    setEditingYearId(year.id);
  };

  const startEditGrade = (grade: Grade) => {
    setGradeName(grade.name);
    setEditingGradeId(grade.id);
  };

  const startEditClass = (c: Class) => {
    setClassName(c.name);
    setClassGradeId(c.gradeId);
    setClassTeacher(c.homeroomTeacher || '');
    const defaultSubj = c.subject || (grades.find(g => g.id === c.gradeId)?.name.includes('5') ? 'Công nghệ' : 'Tin học');
    setClassSubject(defaultSubj as 'Tin học' | 'Công nghệ');
    setEditingClassId(c.id);
  };

  return (
    <div id="school-manager-container" className="space-y-6">
      {/* Feedback Notification Banner */}
      {feedbackMessage && (
        <div 
          id="school-manager-feedback-alert"
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Selectors */}
      <div id="school-manager-tabs" className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-max">
        <button
          onClick={() => setActiveTab('class')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'class'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Home className="w-4 h-4" /> Quản lý Lớp học
        </button>
        <button
          onClick={() => setActiveTab('grade')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'grade'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Quản lý Khối
        </button>
        <button
          onClick={() => setActiveTab('year')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'year'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" /> Quản lý Năm học
        </button>
      </div>

      {/* Dynamic Content Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Sidebar Creation Form */}
        <div id="school-manager-form-panel" className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs md:col-span-1 h-max">
          {activeTab === 'year' && (
            <form onSubmit={handleYearSubmit} className="space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                {editingYearId ? 'Sửa Năm Học' : 'Thêm Năm Học Mới'}
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Tên Năm học</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 2026-2027"
                  value={yearName}
                  onChange={(e) => setYearName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none shadow-xs"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> {editingYearId ? 'Cập nhật' : 'Thêm năm học'}
                </button>
                {editingYearId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingYearId(null);
                      setYearName('');
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          )}

          {activeTab === 'grade' && (
            <form onSubmit={handleGradeSubmit} className="space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" />
                {editingGradeId ? 'Sửa Khối Lớp' : 'Thêm Khối Lớp Mới'}
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Tên Khối lớp</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Khối 3"
                  value={gradeName}
                  onChange={(e) => setGradeName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none shadow-xs"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> {editingGradeId ? 'Cập nhật' : 'Thêm khối'}
                </button>
                {editingGradeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGradeId(null);
                      setGradeName('');
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          )}

          {activeTab === 'class' && (
            <form onSubmit={handleClassSubmit} className="space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Home className="w-5 h-5 text-blue-500" />
                {editingClassId ? 'Sửa Lớp Học' : 'Thêm Lớp Học Mới'}
              </h3>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Thuộc Khối lớp</label>
                <select
                  value={classGradeId}
                  onChange={(e) => setClassGradeId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none shadow-xs"
                  required
                >
                  <option value="">-- Chọn Khối lớp --</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Tên Lớp học</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 3A1"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Giáo viên chủ nhiệm</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cô Lê Thị Mai"
                  value={classTeacher}
                  onChange={(e) => setClassTeacher(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Môn học phụ trách</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClassSubject('Tin học')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      classSubject === 'Tin học'
                        ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    💻 Tin học
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassSubject('Công nghệ')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      classSubject === 'Công nghệ'
                        ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-500 ring-1 ring-amber-500'
                        : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    🛠️ Công nghệ
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    id="btn-submit-class"
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> {editingClassId ? 'Cập nhật' : 'Thêm lớp học'}
                  </button>
                  {editingClassId && (
                    <button
                      id="btn-cancel-edit-class"
                      type="button"
                      onClick={() => {
                        setEditingClassId(null);
                        setClassName('');
                        setClassTeacher('');
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm cursor-pointer transition-all"
                    >
                      Hủy
                    </button>
                  )}
                </div>
                {editingClassId && (
                  <button
                    id="btn-delete-class-from-edit"
                    type="button"
                    onClick={() => {
                      const c = classes.find(item => item.id === editingClassId);
                      if (c) setClassToDelete(c);
                    }}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200 dark:border-rose-900/60"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa lớp học này
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Data List Panel */}
        <div id="school-manager-list-panel" className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs md:col-span-2">
          
          {activeTab === 'year' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Danh sách Năm Học</h3>
              {schoolYears.length === 0 ? (
                <div className="text-center py-10 text-slate-400">Chưa có năm học nào. Hãy khởi tạo!</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {schoolYears.map((year) => (
                    <div key={year.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${year.isCurrent ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-750 text-slate-500'}`}>
                          <Calendar className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                            {year.name}
                            {year.isCurrent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Hiện tại
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {!year.isCurrent && (
                          <button
                            onClick={() => onSetCurrentYear(year.id)}
                            className="p-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-600 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
                            title="Đặt làm năm học hiện tại"
                          >
                            Chọn dùng
                          </button>
                        )}
                        <button
                          onClick={() => startEditYear(year)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-year-${year.id}`}
                          type="button"
                          onClick={() => setYearToDelete(year)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                          title="Xóa năm học"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'grade' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Danh sách Khối Lớp</h3>
              <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Cảnh báo: Xóa khối sẽ xóa toàn bộ các lớp học và dữ liệu học sinh thuộc khối đó. Hãy cân nhắc kỹ!</p>
              </div>
              {grades.length === 0 ? (
                <div className="text-center py-10 text-slate-400">Chưa có khối lớp nào. Hãy khởi tạo!</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {grades.map((grade) => {
                    const gradeClasses = classes.filter(c => c.gradeId === grade.id);
                    const gradeStudents = students.filter(s => gradeClasses.some(c => c.id === s.classId));
                    return (
                      <div key={grade.id} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                            <Layers className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{grade.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              <span>{gradeClasses.length} lớp học</span>
                              <span>•</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> {gradeStudents.length} học sinh
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            id={`btn-edit-grade-${grade.id}`}
                            type="button"
                            onClick={() => startEditGrade(grade)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                            title="Sửa khối"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-delete-grade-${grade.id}`}
                            type="button"
                            onClick={() => setGradeToDelete(grade)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                            title="Xóa khối"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'class' && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-150 dark:border-slate-750">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Danh Sách & Quản Lý Lớp Học</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Chọn khối và chọn lớp để xem thông tin đầy đủ của lớp, hoặc xem toàn bộ khối
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200/60 dark:border-blue-900/50 flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5" /> {classes.length} Lớp
                  </div>
                  <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200/60 dark:border-emerald-900/50 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {students.length} Học sinh
                  </div>
                </div>
              </div>

              {/* 1. Nút Chọn Khối */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <span>1️⃣</span> Chọn Khối Lớp:
                  </label>
                  {selectedGradeIdForClasses && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAllInGrade(true);
                        setSelectedClassIdForDetail(null);
                      }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                        showAllInGrade
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Hiển thị toàn bộ {grades.find(g => g.id === selectedGradeIdForClasses)?.name || 'khối này'} ra cho dễ nhìn
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {grades.map((g) => {
                    const isSelected = selectedGradeIdForClasses === g.id;
                    const gradeClasses = classes.filter(c => c.gradeId === g.id);
                    const countStudents = students.filter(s => gradeClasses.some(c => c.id === s.classId)).length;
                    const isTech = g.name.includes('5');

                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setSelectedGradeIdForClasses(g.id);
                          setClassGradeId(g.id);
                          const gClasses = classes.filter(c => c.gradeId === g.id);
                          if (gClasses.length > 0) {
                            setSelectedClassIdForDetail(gClasses[0].id);
                            setShowAllInGrade(false);
                          } else {
                            setSelectedClassIdForDetail(null);
                          }
                        }}
                        className={`p-3 rounded-2xl text-left font-bold transition-all cursor-pointer shadow-xs border flex items-center justify-between ${
                          isSelected
                            ? isTech
                              ? 'bg-amber-500 text-slate-950 font-black shadow-amber-500/25 ring-2 ring-amber-400 border-amber-600'
                              : 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-400 border-blue-600'
                            : 'bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-650'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{isTech ? '🛠️' : '💻'}</span>
                          <div>
                            <div className="text-sm font-extrabold">{g.name}</div>
                            <div className={`text-[11px] font-medium ${isSelected ? (isTech ? 'text-slate-900 font-semibold' : 'text-blue-100') : 'text-slate-500 dark:text-slate-400'}`}>
                              {gradeClasses.length} lớp học
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
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

              {/* 2. Nút Chọn Lớp */}
              {selectedGradeIdForClasses && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-750/50 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span>2️⃣</span> Nút Chọn Lớp (thuộc {grades.find(g => g.id === selectedGradeIdForClasses)?.name}):
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Bấm chọn lớp để xem thông tin đầy đủ & danh sách học sinh
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {classes.filter(c => c.gradeId === selectedGradeIdForClasses).length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-1">Chưa có lớp nào trong khối này. Thêm lớp mới ở form bên trái.</div>
                    ) : (
                      classes.filter(c => c.gradeId === selectedGradeIdForClasses).map((c) => {
                        const isSelected = !showAllInGrade && selectedClassIdForDetail === c.id;
                        const countHS = students.filter(s => s.classId === c.id).length;

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedClassIdForDetail(c.id);
                              setShowAllInGrade(false);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400 shadow-sm scale-[1.02]'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-650'
                            }`}
                          >
                            <span>Lớp {c.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {countHS} HS
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* 3. VÙNG HIỂN THỊ CHÍNH */}
              {showAllInGrade ? (
                /* HIỂN THỊ TOÀN BỘ KHỐI CHO DỄ NHÌN */
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-500" />
                      Toàn bộ các lớp thuộc {grades.find(g => g.id === selectedGradeIdForClasses)?.name} ({classes.filter(c => c.gradeId === selectedGradeIdForClasses).length} lớp)
                    </h4>
                    <span className="text-xs text-slate-500">Bấm "Xem chi tiết" ở bất kỳ lớp nào để mở thông tin đầy đủ</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {classes.filter(c => c.gradeId === selectedGradeIdForClasses).map((c) => {
                      const gradeName = grades.find(g => g.id === c.gradeId)?.name || 'Khối';
                      const classStudents = students.filter(s => s.classId === c.id);
                      const studentCount = classStudents.length;
                      const maleCount = classStudents.filter(s => s.gender === 'Nam').length;
                      const femaleCount = classStudents.filter(s => s.gender === 'Nữ').length;
                      const subject = c.subject || (gradeName.includes('5') ? 'Công nghệ' : 'Tin học');

                      return (
                        <div key={c.id} className="p-4 bg-slate-900 dark:bg-slate-950 border border-slate-800 dark:border-slate-850 rounded-2xl flex flex-col justify-between transition-all shadow-md hover:border-slate-700">
                          <div>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {gradeName}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  subject === 'Công nghệ'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                }`}>
                                  {subject === 'Công nghệ' ? '🛠️ Công nghệ' : '💻 Tin học'}
                                </span>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  id={`btn-edit-class-${c.id}`}
                                  type="button"
                                  onClick={() => startEditClass(c)}
                                  className="p-1.5 text-slate-400 hover:text-white transition-all cursor-pointer rounded-lg hover:bg-slate-800"
                                  title={`Sửa lớp ${c.name}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  id={`btn-delete-class-${c.id}`}
                                  type="button"
                                  onClick={() => setClassToDelete(c)}
                                  className="p-1.5 text-rose-400 hover:text-rose-300 transition-all cursor-pointer rounded-lg hover:bg-rose-950/40"
                                  title={`Xóa lớp ${c.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <h4 className="font-black text-white text-xl mt-3 tracking-tight">Lớp {c.name}</h4>
                            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                              GVCN: <span className="font-bold text-amber-300 bg-slate-850 px-2 py-0.5 rounded border border-slate-750">{c.homeroomTeacher || 'Chưa thiết lập'}</span>
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                  <Users className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Sĩ số lớp</div>
                                  <div className="text-base font-extrabold text-emerald-400 leading-tight">
                                    {studentCount} <span className="text-xs font-normal text-slate-300">học sinh</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right text-[11px] text-slate-400 bg-slate-850 px-2.5 py-1 rounded-xl border border-slate-800">
                                <div><span className="font-bold text-slate-200">{maleCount}</span> Nam</div>
                                <div><span className="font-bold text-slate-200">{femaleCount}</span> Nữ</div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClassIdForDetail(c.id);
                                setShowAllInGrade(false);
                              }}
                              className="w-full py-2 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-blue-500/30 hover:border-blue-500 cursor-pointer"
                            >
                              <span>Xem thông tin đầy đủ & danh sách học sinh</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* THÔNG TIN ĐẦY ĐỦ CỦA LỚP ĐANG ĐƯỢC CHỌN */
                (() => {
                  const currentClass = classes.find(c => c.id === selectedClassIdForDetail);
                  if (!currentClass) {
                    return (
                      <div className="text-center py-12 bg-slate-50 dark:bg-slate-750/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                        Vui lòng chọn một lớp học ở trên để hiển thị thông tin đầy đủ.
                      </div>
                    );
                  }

                  const gradeObj = grades.find(g => g.id === currentClass.gradeId);
                  const gradeName = gradeObj?.name || 'Khối';
                  const classStudents = students.filter(s => s.classId === currentClass.id);
                  const studentCount = classStudents.length;
                  const maleCount = classStudents.filter(s => s.gender === 'Nam').length;
                  const femaleCount = classStudents.filter(s => s.gender === 'Nữ').length;
                  const subject = currentClass.subject || (gradeName.includes('5') ? 'Công nghệ' : 'Tin học');

                  return (
                    <div className="space-y-4 pt-1">
                      {/* Thẻ Thông Tin Đầy Đủ Của Lớp Đang Chọn */}
                      <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-3xl border border-slate-800 shadow-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {gradeName}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                subject === 'Công nghệ'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                              }`}>
                                {subject === 'Công nghệ' ? '🛠️ Môn Công nghệ' : '💻 Môn Tin học'}
                              </span>
                            </div>
                            <h4 className="text-2xl font-black text-white mt-2 tracking-tight">
                              Thông Tin Đầy Đủ: Lớp {currentClass.name}
                            </h4>
                            <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                              <span>Giáo viên chủ nhiệm:</span>
                              <span className="font-bold text-amber-300 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                                {currentClass.homeroomTeacher || 'Chưa thiết lập'}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl text-center min-w-[90px]">
                              <div className="text-[10px] text-slate-400 font-semibold uppercase">Tổng sĩ số</div>
                              <div className="text-xl font-black text-emerald-400">{studentCount} HS</div>
                            </div>
                            <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl text-center min-w-[100px] text-xs">
                              <div><span className="font-bold text-blue-300">{maleCount}</span> Nam</div>
                              <div><span className="font-bold text-pink-300">{femaleCount}</span> Nữ</div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditClass(currentClass)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Sửa lớp
                              </button>
                              <button
                                type="button"
                                onClick={() => setClassToDelete(currentClass)}
                                className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-rose-500/40"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Xóa lớp
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bảng Danh Sách Đầy Đủ Toàn Bộ Học Sinh Của Lớp Đang Chọn */}
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700 overflow-hidden shadow-xs">
                        <div className="p-4 border-b border-slate-150 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                          <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            Danh sách học sinh Lớp {currentClass.name} ({classStudents.length} học sinh)
                          </h5>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Khối: {gradeName} • GVCN: {currentClass.homeroomTeacher || 'Chưa thiết lập'}
                          </span>
                        </div>

                        {classStudents.length === 0 ? (
                          <div className="p-10 text-center text-slate-400">
                            Lớp {currentClass.name} hiện chưa có học sinh nào. Hãy vào mục <strong>Danh sách học sinh</strong> để thêm học sinh hoặc nhập danh sách Excel/CSV.
                          </div>
                        ) : (
                          <div className="overflow-x-auto max-h-[380px]">
                            <table className="w-full text-left border-collapse">
                              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-750/90 z-10 border-b border-slate-150 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <tr>
                                  <th className="px-4 py-3 text-center w-12">STT</th>
                                  <th className="px-4 py-3">Mã HS</th>
                                  <th className="px-5 py-3">Họ và tên học sinh</th>
                                  <th className="px-4 py-3 text-center">Giới tính</th>
                                  <th className="px-4 py-3">Ngày sinh</th>
                                  <th className="px-5 py-3">Ghi chú</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                                {classStudents.map((st, idx) => (
                                  <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/30 transition-all">
                                    <td className="px-4 py-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                                    <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">{st.studentId}</td>
                                    <td className="px-5 py-2.5 font-semibold text-slate-800 dark:text-slate-100">{st.name}</td>
                                    <td className="px-4 py-2.5 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        st.gender === 'Nam'
                                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                          : 'bg-pink-50 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
                                      }`}>
                                        {st.gender}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{st.dob || '—'}</td>
                                    <td className="px-5 py-2.5 text-slate-500 dark:text-slate-400 italic">{st.note || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

        </div>

      </div>

      {/* Class Delete Confirmation Modal */}
      {classToDelete && (
        <div id="modal-delete-class-confirm" className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/50">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    Xác nhận xóa Lớp {classToDelete.name}?
                  </h4>
                  <button
                    type="button"
                    onClick={() => setClassToDelete(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Hành động này sẽ xóa vĩnh viễn lớp học khỏi hệ thống.
                </p>
              </div>
            </div>

            {(() => {
              const gradeName = grades.find(g => g.id === classToDelete.gradeId)?.name || 'Khác';
              const classStudents = students.filter(s => s.classId === classToDelete.id);
              const maleCount = classStudents.filter(s => s.gender === 'Nam').length;
              const femaleCount = classStudents.filter(s => s.gender === 'Nữ').length;
              const subject = classToDelete.subject || (gradeName.includes('5') ? 'Công nghệ' : 'Tin học');

              return (
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Khối lớp:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{gradeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Môn giảng dạy:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Giáo viên chủ nhiệm:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {classToDelete.homeroomTeacher || 'Chưa thiết lập'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 text-rose-600 dark:text-rose-400 font-bold">
                    <span>Số học sinh sẽ bị xóa cùng lớp:</span>
                    <span>{classStudents.length} học sinh ({maleCount} Nam, {femaleCount} Nữ)</span>
                  </div>
                </div>
              );
            })()}

            <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Toàn bộ danh sách học sinh, phân phối bài học, lịch báo giảng và điểm số/đánh giá của Lớp {classToDelete.name} sẽ được xóa đồng bộ.</p>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                id="btn-cancel-delete-class"
                type="button"
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold border border-slate-300 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-delete-class"
                type="button"
                onClick={handleConfirmDeleteClass}
                className="px-4 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xác nhận xóa lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Delete Confirmation Modal */}
      {gradeToDelete && (
        <div id="modal-delete-grade-confirm" className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/50">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    Xác nhận xóa {gradeToDelete.name}?
                  </h4>
                  <button
                    type="button"
                    onClick={() => setGradeToDelete(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Việc này sẽ xóa khối cùng toàn bộ các lớp và học sinh thuộc khối!
                </p>
              </div>
            </div>

            {(() => {
              const gradeClasses = classes.filter(c => c.gradeId === gradeToDelete.id);
              const gradeStudents = students.filter(s => gradeClasses.some(c => c.id === s.classId));

              return (
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Số lớp học sẽ bị xóa:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{gradeClasses.length} lớp</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 text-rose-600 dark:text-rose-400 font-bold">
                    <span>Tổng số học sinh bị xóa:</span>
                    <span>{gradeStudents.length} học sinh</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end gap-3 pt-1">
              <button
                id="btn-cancel-delete-grade"
                type="button"
                onClick={() => setGradeToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold border border-slate-300 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-delete-grade"
                type="button"
                onClick={handleConfirmDeleteGrade}
                className="px-4 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xác nhận xóa khối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Year Delete Confirmation Modal */}
      {yearToDelete && (
        <div id="modal-delete-year-confirm" className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/50">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    Xác nhận xóa Năm học {yearToDelete.name}?
                  </h4>
                  <button
                    type="button"
                    onClick={() => setYearToDelete(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Xóa mục năm học này khỏi danh mục năm học của trường.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                id="btn-cancel-delete-year"
                type="button"
                onClick={() => setYearToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold border border-slate-300 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-delete-year"
                type="button"
                onClick={handleConfirmDeleteYear}
                className="px-4 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xác nhận xóa năm học
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
