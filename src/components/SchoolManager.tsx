/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Layers, Home, Plus, Edit2, Trash2, Check, Star, AlertTriangle } from 'lucide-react';
import { SchoolYear, Grade, Class } from '../types';

interface SchoolManagerProps {
  schoolYears: SchoolYear[];
  grades: Grade[];
  classes: Class[];
  onAddYear: (name: string) => void;
  onUpdateYear: (id: string, name: string) => void;
  onDeleteYear: (id: string) => void;
  onSetCurrentYear: (id: string) => void;
  
  onAddGrade: (name: string) => void;
  onUpdateGrade: (id: string, name: string) => void;
  onDeleteGrade: (id: string) => void;

  onAddClass: (name: string, gradeId: string, homeroomTeacher?: string) => void;
  onUpdateClass: (id: string, name: string, gradeId: string, homeroomTeacher?: string) => void;
  onDeleteClass: (id: string) => void;
}

type Mode = 'year' | 'grade' | 'class';

export function SchoolManager({
  schoolYears,
  grades,
  classes,
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
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

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
      onUpdateClass(editingClassId, className.trim(), classGradeId, classTeacher.trim() || undefined);
      setEditingClassId(null);
    } else {
      onAddClass(className.trim(), classGradeId, classTeacher.trim() || undefined);
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
    setEditingClassId(c.id);
  };

  return (
    <div id="school-manager-container" className="space-y-6">
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

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> {editingClassId ? 'Cập nhật' : 'Thêm lớp học'}
                </button>
                {editingClassId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingClassId(null);
                      setClassName('');
                      setClassTeacher('');
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm cursor-pointer"
                  >
                    Hủy
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
                          onClick={() => {
                            if (confirm(`Bạn chắc chắn muốn xóa năm học ${year.name}?`)) {
                              onDeleteYear(year.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
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
                    return (
                      <div key={grade.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-750 text-slate-500">
                            <Layers className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{grade.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-450 mt-0.5">Sĩ số: {gradeClasses.length} lớp học</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => startEditGrade(grade)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`CHÚ Ý: Việc xóa ${grade.name} sẽ đồng thời xóa toàn bộ lớp và học sinh của khối này. Bạn có chắc chắn muốn xóa?`)) {
                                onDeleteGrade(grade.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
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
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Danh sách Lớp Học</h3>
              {classes.length === 0 ? (
                <div className="text-center py-10 text-slate-400">Chưa có lớp học nào. Hãy thêm lớp!</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {classes.map((c) => {
                    const gradeName = grades.find(g => g.id === c.gradeId)?.name || 'Khác';
                    return (
                      <div key={c.id} className="p-4 bg-slate-900 dark:bg-slate-950 border border-slate-800 dark:border-slate-850 rounded-2xl flex flex-col justify-between transition-all shadow-md">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {gradeName}
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => startEditClass(c)}
                                className="p-1 text-slate-400 hover:text-white dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
                                title="Sửa lớp"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Xóa lớp ${c.name} đồng thời sẽ xóa toàn bộ danh sách học sinh thuộc lớp này. Bạn có chắc chắn?`)) {
                                    onDeleteClass(c.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-400 dark:text-slate-400 dark:hover:text-rose-400 transition-all cursor-pointer"
                                title="Xóa lớp"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <h4 className="font-black text-white text-xl mt-3 tracking-tight">Lớp {c.name}</h4>
                          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                            GVCN: <span className="font-bold text-amber-300 bg-slate-800 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700/60">{c.homeroomTeacher || 'Chưa thiết lập'}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
