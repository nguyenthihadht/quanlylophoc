/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Download, Upload, Eye, FileSpreadsheet, Info, Check, AlertCircle, Users } from 'lucide-react';
import { Class, Student, Grade } from '../types';

interface StudentManagerProps {
  classes: Class[];
  grades: Grade[];
  students: Student[];
  readOnly?: boolean;
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onUpdateStudent: (id: string, fields: Partial<Omit<Student, 'id'>>) => void;
  onDeleteStudent: (id: string) => void;
  onImportCSV: (csvText: string, classId: string) => { successCount: number; errors: string[] };
}

export function StudentManager({
  classes,
  grades,
  students,
  readOnly = false,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onImportCSV
}: StudentManagerProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState<string>(() => {
    const g3 = grades.find(g => g.name.includes('3'));
    return g3?.id || grades[0]?.id || '';
  });
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedGender, setSelectedGender] = useState('');

  // Keep selectedGradeId valid if grades change
  React.useEffect(() => {
    if (!selectedGradeId && grades.length > 0) {
      const g3 = grades.find(g => g.name.includes('3'));
      setSelectedGradeId(g3?.id || grades[0].id);
    }
  }, [grades, selectedGradeId]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals & Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isMoveClassOpen, setIsMoveClassOpen] = useState(false);
  const [bulkClassId, setBulkClassId] = useState('');

  // Student Form Inputs
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentGender, setStudentGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [studentDob, setStudentDob] = useState('2017-01-01');
  const [studentClassId, setStudentClassId] = useState('');
  const [studentNote, setStudentNote] = useState('');

  // CSV Importer States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importClassId, setImportClassId] = useState('');
  const [csvRawText, setCsvRawText] = useState('');
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);

  // Reset student form
  const resetForm = () => {
    setStudentIdInput('');
    setStudentName('');
    setStudentGender('Nam');
    setStudentDob('2017-01-01');
    setStudentClassId(classes[0]?.id || '');
    setStudentNote('');
    setEditingStudentId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setStudentIdInput(s.studentId);
    setStudentName(s.name);
    setStudentGender(s.gender);
    setStudentDob(s.dob);
    setStudentClassId(s.classId);
    setStudentNote(s.note || '');
    setEditingStudentId(s.id);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentClassId) return;

    const dataPayload = {
      studentId: studentIdInput.trim() || `HS${Date.now().toString().slice(-5)}`,
      name: studentName.trim(),
      gender: studentGender,
      dob: studentDob,
      classId: studentClassId,
      note: studentNote.trim() || undefined
    };

    if (editingStudentId) {
      onUpdateStudent(editingStudentId, dataPayload);
    } else {
      onAddStudent(dataPayload);
    }

    setIsFormOpen(false);
    resetForm();
  };

  // CSV File Handler
  const handleCSVImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importClassId || !csvRawText.trim()) return;

    const res = onImportCSV(csvRawText, importClassId);
    setImportResult({
      success: res.successCount,
      errors: res.errors
    });
    setCsvRawText('');
  };

  // Drag and Drop text file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRawText(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Export Roster to CSV
  const handleCSVExport = () => {
    const headers = 'Mã học sinh,Họ tên,Giới tính,Ngày sinh,Lớp học,Ghi chú\n';
    
    const rows = filteredStudents.map(s => {
      const className = classes.find(c => c.id === s.classId)?.name || 'Chưa rõ';
      return `"${s.studentId}","${s.name}","${s.gender}","${s.dob}","${className}","${s.note || ''}"`;
    }).join('\n');

    const blob = new Blob(['\ufeff' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_hoc_sinh_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Import CSV Template
  const handleDownloadTemplate = () => {
    const templateContent = 'Mã học sinh,Họ tên,Giới tính,Ngày sinh (YYYY-MM-DD),Ghi chú\n' +
      'HS001,Nguyễn Văn An,Nam,2017-05-15,Thông minh sáng tạo\n' +
      'HS002,Trần Thị Bình,Nữ,2017-10-20,Cần chăm chỉ hơn\n';

    const blob = new Blob(['\ufeff' + templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mau_nhap_hoc_sinh.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Logic
  const filteredStudents = students.filter(s => {
    const sClass = classes.find(c => c.id === s.classId);
    const matchGrade = selectedGradeId ? sClass?.gradeId === selectedGradeId : true;
    const matchClass = selectedClassId ? s.classId === selectedClassId : true;
    const matchGender = selectedGender ? s.gender === selectedGender : true;
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchGrade && matchClass && matchGender && matchSearch;
  });

  // Paginated students
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  // Classes for the active grade
  const activeGradeClasses = selectedGradeId 
    ? classes.filter(c => c.gradeId === selectedGradeId)
    : classes;

  return (
    <div id="student-manager-container" className="space-y-6">
      {/* Read-Only Notice Banner */}
      {readOnly && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">👁️</span>
            <div>
              <p className="font-bold">Chế độ Xem tham khảo (Chỉ xem) dành cho Đồng nghiệp</p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Thầy/Cô có thể tra cứu, lọc danh sách học sinh theo khối/lớp và xuất file Excel. Chức năng Thêm, Sửa, Xóa và Nhập danh sách đã được bảo vệ.</p>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-lg font-bold text-[10px] uppercase tracking-wider">Chỉ xem</span>
        </div>
      )}
      
      {/* 1. NÚT CHỌN KHỐI LỚP (GRADE SELECTOR BAR) */}
      <div id="students-grade-bar" className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-750 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>🏫</span> Nút Chọn Khối Lớp:
            </span>
            <span className="text-[11px] text-blue-200">
              (Bấm chọn khối để xem danh sách lớp và học sinh tương ứng)
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-300">
            Đang hiển thị: <strong className="text-sky-300 font-extrabold">{filteredStudents.length}</strong> học sinh
          </span>
        </div>

        {/* Grade Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
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
                onClick={() => {
                  setSelectedGradeId(g.id);
                  if (selectedClassId && !gradeClassIds.includes(selectedClassId)) {
                    setSelectedClassId('');
                  }
                  setCurrentPage(1);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer shadow-xs flex items-center gap-2 border ${
                  isSelected
                    ? isTech
                      ? 'bg-amber-500 text-slate-950 font-black shadow-amber-500/20 ring-2 ring-amber-300 border-amber-400 scale-[1.02]'
                      : 'bg-blue-600 text-white font-black shadow-blue-500/30 ring-2 ring-sky-300 border-sky-400 scale-[1.02]'
                    : 'bg-[#0f2444] hover:bg-[#163a66] text-white font-extrabold border-blue-900/80 hover:border-blue-700'
                }`}
              >
                <span>{isTech ? '🛠️' : '💻'}</span>
                <span>{g.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isSelected 
                    ? isTech ? 'bg-black/20 text-slate-950 font-black' : 'bg-white/25 text-white font-black' 
                    : 'bg-blue-950/80 text-blue-100 border border-blue-700/60'
                }`}>
                  {gradeClasses.length} lớp • {countStudents} HS
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => { setSelectedGradeId(''); setSelectedClassId(''); setCurrentPage(1); }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 border ml-auto ${
              selectedGradeId === ''
                ? 'bg-blue-600 text-white font-black ring-2 ring-sky-300 border-sky-400 shadow-md scale-[1.02]'
                : 'bg-[#0f2444] hover:bg-[#163a66] text-white font-extrabold border-blue-900/80 hover:border-blue-700'
            }`}
          >
            <span>🌐</span> Tất cả Khối ({students.length} HS)
          </button>
        </div>

        {/* Quick Class Pills for the selected Grade */}
        {selectedGradeId && (
          <div className="pt-3 border-t border-slate-700/80 flex flex-wrap items-center gap-2 animate-fadeIn">
            <span className="text-xs font-black text-white flex items-center gap-1.5 mr-1">
              <span>↳</span> Danh sách lớp {grades.find(g => g.id === selectedGradeId)?.name}:
            </span>
            <button
              type="button"
              onClick={() => { setSelectedClassId(''); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border flex items-center gap-1.5 ${
                selectedClassId === ''
                  ? 'bg-blue-600 text-white font-black border-sky-400 shadow-sm ring-2 ring-sky-300'
                  : 'bg-[#0f2444] hover:bg-[#163a66] text-white font-extrabold border-blue-900/80 hover:border-blue-700'
              }`}
            >
              <span>👁️</span> Hiển thị toàn bộ {grades.find(g => g.id === selectedGradeId)?.name} ({students.filter(s => classes.filter(c => c.gradeId === selectedGradeId).map(c => c.id).includes(s.classId)).length} HS)
            </button>
            {classes.filter(c => c.gradeId === selectedGradeId).map(c => {
              const isClsSelected = selectedClassId === c.id;
              const clsStudentsCount = students.filter(s => s.classId === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setSelectedClassId(c.id); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 border ${
                    isClsSelected
                      ? 'bg-blue-600 text-white font-black shadow-sm ring-2 ring-sky-300 border-sky-400 scale-[1.02]'
                      : 'bg-[#0f2444] hover:bg-[#163a66] text-white font-bold border-blue-900/80 hover:border-blue-700'
                  }`}
                >
                  <span>Lớp {c.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    isClsSelected ? 'bg-white/25 text-white' : 'bg-blue-950/80 text-blue-100 border border-blue-700/60'
                  }`}>
                    {clsStudentsCount} HS
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Prominent Selected Class Status Banner */}
      {selectedClassId ? (
        <div className="p-4 bg-gradient-to-r from-[#0b1e36] via-[#0f2444] to-[#15345a] text-white rounded-2xl border-2 border-sky-400 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <span className="w-12 h-12 rounded-xl bg-blue-600 border-2 border-sky-300 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
              🎯
            </span>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/25 text-sky-200 border border-sky-400/50">
                  LỚP ĐANG CHỌN QUẢN LÝ
                </span>
                <span className="text-xs text-sky-200 font-bold">
                  {grades.find(g => g.id === classes.find(c => c.id === selectedClassId)?.gradeId)?.name}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-amber-300 font-display flex items-center gap-2 flex-wrap">
                <span>LỚP {classes.find(c => c.id === selectedClassId)?.name}</span>
                <span className="text-xs font-bold text-white bg-white/15 px-3 py-1 rounded-xl border border-white/20">
                  Sĩ số: {students.filter(s => s.classId === selectedClassId).length} Học sinh
                </span>
                {classes.find(c => c.id === selectedClassId)?.homeroomTeacher && (
                  <span className="text-xs font-semibold text-slate-300">
                    · GVCN: <strong className="text-white">{classes.find(c => c.id === selectedClassId)?.homeroomTeacher}</strong>
                  </span>
                )}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setSelectedClassId(''); setCurrentPage(1); }}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/25 cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>✕</span> Bỏ chọn lớp (Xem tất cả)
          </button>
        </div>
      ) : null}

      {/* Search and Filters Bar */}
      <div id="students-filter-bar" className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Left Side Inputs */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã hoặc tên học sinh..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium placeholder-slate-450 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-xs"
            />
          </div>

          {/* Class Filter (Nền xanh đậm chữ trắng) */}
          <select
            value={selectedClassId}
            onChange={(e) => { 
              const val = e.target.value;
              setSelectedClassId(val);
              if (val) {
                const c = classes.find(item => item.id === val);
                if (c && c.gradeId && selectedGradeId !== c.gradeId) {
                  setSelectedGradeId(c.gradeId);
                }
              }
              setCurrentPage(1); 
            }}
            className="px-3.5 py-2 text-sm font-black rounded-xl border-2 border-blue-900 bg-[#0f2444] text-white outline-none focus:ring-2 focus:ring-sky-400 shadow-sm cursor-pointer"
          >
            <option value="" className="bg-[#0f2444] text-white font-bold py-1">
              {selectedGradeId 
                ? `Tất cả lớp của ${grades.find(g => g.id === selectedGradeId)?.name}` 
                : 'Tất cả Lớp học'}
            </option>
            {selectedGradeId ? (
              classes.filter(c => c.gradeId === selectedGradeId).map(c => (
                <option key={c.id} value={c.id} className="bg-[#0f2444] text-white font-bold py-1">Lớp {c.name}</option>
              ))
            ) : (
              grades.map(g => {
                const gradeClasses = classes.filter(c => c.gradeId === g.id);
                if (gradeClasses.length === 0) return null;
                return (
                  <optgroup key={g.id} label={g.name} className="bg-[#0b1e36] text-sky-300 font-black">
                    {gradeClasses.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0f2444] text-white font-bold py-1">Lớp {c.name}</option>
                    ))}
                  </optgroup>
                );
              })
            )}
          </select>

          {/* Gender Filter */}
          <select
            value={selectedGender}
            onChange={(e) => { setSelectedGender(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-sm rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
          >
            <option value="">Giới tính</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
        </div>

        {/* Right Action buttons */}
        <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
          {!readOnly && (
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Nhập Excel / CSV
            </button>
          )}
          <button
            onClick={handleCSVExport}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Xuất Excel
          </button>
          {!readOnly && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm học sinh
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {!readOnly && selectedIds.length > 0 && (
        <div id="bulk-action-bar" className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              Đã chọn <strong className="font-extrabold text-blue-900 dark:text-blue-100">{selectedIds.length}</strong> học sinh
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
            >
              Bỏ chọn tất cả
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkClassId(classes[0]?.id || '');
                setIsMoveClassOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              Chuyển lớp hàng loạt
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa đã chọn ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Main Table Panel */}
      <div id="students-table-panel" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs overflow-hidden">
        {/* Table Title Bar */}
        <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              {selectedClassId 
                ? `Danh Sách Học Sinh — Lớp ${classes.find(c => c.id === selectedClassId)?.name}`
                : selectedGradeId
                  ? `Danh Sách Học Sinh — ${grades.find(g => g.id === selectedGradeId)?.name}`
                  : 'Danh Sách Học Sinh — Toàn trường'}
            </span>
            {selectedClassId && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#0f2444] text-white border border-sky-400 shadow-2xs">
                Lớp {classes.find(c => c.id === selectedClassId)?.name}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Hiển thị <strong className="text-blue-600 dark:text-blue-400 font-bold">{paginatedStudents.length}</strong> / {filteredStudents.length} học sinh
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 space-y-3">
            <p className="text-lg font-medium">Không tìm thấy học sinh nào</p>
            <p className="text-sm">Hãy thử thay đổi từ khóa hoặc bộ lọc lớp học</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-750/60 border-b border-slate-150 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.includes(s.id))}
                      onChange={(e) => {
                        const pageIds = paginatedStudents.map(s => s.id);
                        if (e.target.checked) {
                          setSelectedIds(prev => {
                            const union = [...prev];
                            pageIds.forEach(id => {
                              if (!union.includes(id)) union.push(id);
                            });
                            return union;
                          });
                        } else {
                          setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4">Mã Học sinh</th>
                  <th className="px-6 py-4">Họ và tên</th>
                  <th className="px-6 py-4">Giới tính</th>
                  <th className="px-6 py-4">Ngày sinh</th>
                  <th className="px-6 py-4">Lớp học</th>
                  <th className="px-6 py-4">Ghi chú</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm text-slate-700 dark:text-slate-300">
                {paginatedStudents.map((s) => {
                  const sClass = classes.find(c => c.id === s.classId);
                  const sGrade = sClass ? grades.find(g => g.id === sClass.gradeId) : null;
                  const isSelected = selectedIds.includes(s.id);
                  return (
                    <tr key={s.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-all ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedIds(prev =>
                              prev.includes(s.id)
                                ? prev.filter(id => id !== s.id)
                                : [...prev, s.id]
                            );
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-slate-600 dark:text-slate-400">{s.studentId}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{s.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${s.gender === 'Nam' ? 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300' : 'bg-pink-50 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300'}`}>
                          {s.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4">{s.dob}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {sClass?.name || 'Không rõ'}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-450 block">{sGrade?.name || ''}</span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-slate-500 dark:text-slate-400" title={s.note}>
                        {s.note || '-'}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                        {readOnly ? (
                          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-750 px-2 py-0.5 rounded-md">
                            Chỉ xem
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                              title="Sửa học sinh"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setStudentToDelete(s)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                              title="Xóa học sinh"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-750/40 border-t border-slate-150 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Hiển thị {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredStudents.length)} trên tổng số {filteredStudents.length} học sinh
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 transition-all cursor-pointer"
              >
                Trước
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 transition-all cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Roster Importer Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-750 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Nhập danh sách học sinh từ Excel / CSV
              </h3>
              <button onClick={() => { setIsImportOpen(false); setImportResult(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xl font-bold">×</button>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-2">
              <p className="font-bold flex items-center gap-1.5"><Info className="w-4 h-4 shrink-0" /> Hướng dẫn chuẩn bị tệp:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Bảng tính có cấu trúc chuẩn cột: <span className="font-semibold">Mã học sinh, Họ tên, Giới tính, Ngày sinh, Ghi chú</span></li>
                <li>Định dạng Ngày sinh dạng <span className="font-semibold">YYYY-MM-DD</span> (ví dụ 2017-04-12) hoặc <span className="font-semibold">DD/MM/YYYY</span>.</li>
                <li>Dữ liệu được lưu dưới dạng mã hóa UTF-8 để hiển thị đúng dấu tiếng Việt.</li>
              </ul>
              <button onClick={handleDownloadTemplate} className="mt-2 text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Tải mẫu tệp Excel / CSV chuẩn
              </button>
            </div>

            <form onSubmit={handleCSVImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Chọn Lớp Nhận danh sách</label>
                <select
                  value={importClassId}
                  onChange={(e) => setImportClassId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                  required
                >
                  <option value="">-- Chọn lớp học --</option>
                  {grades.map(g => {
                    const gradeClasses = classes.filter(c => c.gradeId === g.id);
                    if (gradeClasses.length === 0) return null;
                    return (
                      <optgroup key={g.id} label={g.name}>
                        {gradeClasses.map(c => (
                          <option key={c.id} value={c.id}>Lớp {c.name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Chọn tệp từ máy tính</label>
                <input
                  type="file"
                  accept=".csv, .txt"
                  onChange={handleFileUpload}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 dark:file:bg-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Hoặc Dán nội dung CSV vào ô dưới đây</label>
                <textarea
                  placeholder="Mã học sinh,Họ tên,Giới tính,Ngày sinh,Ghi chú&#10;HS001,Nguyễn Văn An,Nam,2017-05-15,Chăm ngoan&#10;HS002,Trần Thị Bình,Nữ,2017-10-20,Đạt tốt"
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  className="w-full h-36 p-3 rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500/20 outline-none resize-none shadow-xs"
                  required={!csvRawText}
                ></textarea>
              </div>

              {importResult && (
                <div className="p-4 rounded-xl border text-sm space-y-1.5 bg-slate-50 dark:bg-slate-750 border-slate-250">
                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-5 h-5" /> Đã nhập thành công {importResult.success} học sinh!
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <p className="text-xs text-rose-500 font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Có {importResult.errors.length} lỗi bỏ qua:</p>
                      <div className="max-h-24 overflow-y-auto text-[11px] font-mono text-rose-400 space-y-0.5 pl-2.5">
                        {importResult.errors.map((err, index) => <p key={index}>- {err}</p>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => { setIsImportOpen(false); setImportResult(null); }}
                  className="px-4 py-2 text-sm border border-slate-250 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={!importClassId}
                  className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  Tiến hành Nhập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-750 shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {editingStudentId ? 'Chỉnh sửa Học sinh' : 'Thêm Học sinh Mới'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xl font-bold">×</button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Mã học sinh</label>
                <input
                  type="text"
                  placeholder="Ví dụ: HS001 (Sẽ tự tạo nếu bỏ trống)"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Minh Khang"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs placeholder-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Giới tính</label>
                  <select
                    value={studentGender}
                    onChange={(e) => setStudentGender(e.target.value as 'Nam' | 'Nữ')}
                    className="w-full px-4 py-2 text-sm rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Ngày sinh</label>
                  <input
                    type="date"
                    value={studentDob}
                    onChange={(e) => setStudentDob(e.target.value)}
                    className="w-full px-4 py-2 text-sm rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Lớp học</label>
                <select
                  value={studentClassId}
                  onChange={(e) => setStudentClassId(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                  required
                >
                  <option value="">-- Chọn lớp học --</option>
                  {grades.map(g => {
                    const gradeClasses = classes.filter(c => c.gradeId === g.id);
                    if (gradeClasses.length === 0) return null;
                    return (
                      <optgroup key={g.id} label={g.name}>
                        {gradeClasses.map(c => (
                          <option key={c.id} value={c.id}>Lớp {c.name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Ghi chú cá nhân</label>
                <textarea
                  placeholder="Ghi chú về học sinh này..."
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                  className="w-full h-20 p-3 rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none shadow-xs placeholder-slate-400"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-sm border border-slate-250 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl cursor-pointer"
                >
                  {editingStudentId ? 'Lưu thay đổi' : 'Thêm học sinh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Xác nhận xóa học sinh
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bạn có chắc chắn muốn xóa học sinh <strong className="text-slate-850 dark:text-slate-100">{studentToDelete.name}</strong> ({studentToDelete.studentId}) không?
                </p>
                <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-100/50 dark:border-rose-900/30 flex gap-2 items-start mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Chú ý: Toàn bộ lịch sử nhận xét học bạ, đánh giá buổi học và thành tích của học sinh này sẽ bị xóa vĩnh viễn khỏi hệ thống và không thể khôi phục.</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-xs font-semibold border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteStudent(studentToDelete.id);
                  setStudentToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer shadow-xs"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Bulk Delete Confirmation Modal */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Xác nhận xóa {selectedIds.length} học sinh
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bạn có chắc chắn muốn xóa <strong className="text-slate-850 dark:text-slate-100">{selectedIds.length} học sinh</strong> đã chọn không?
                </p>
                <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-100/50 dark:border-rose-900/30 flex gap-2 items-start mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Chú ý: Toàn bộ lịch sử nhận xét học bạ, đánh giá buổi học và thành tích của tất cả các học sinh này sẽ bị xóa vĩnh viễn khỏi hệ thống và không thể khôi phục.</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(false)}
                className="px-4 py-2 text-xs font-semibold border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  selectedIds.forEach(id => onDeleteStudent(id));
                  setSelectedIds([]);
                  setIsBulkDeleteOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer shadow-xs"
              >
                Đồng ý xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Bulk Move Class Modal */}
      {isMoveClassOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-55 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Plus className="w-6 h-6 rotate-45" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Chuyển lớp hàng loạt
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Chọn lớp học mới cho <strong className="text-slate-850 dark:text-slate-100">{selectedIds.length} học sinh</strong> đã chọn:
                </p>
                
                <div className="mt-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Lớp học đích</label>
                  <select
                    value={bulkClassId}
                    onChange={(e) => setBulkClassId(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                    required
                  >
                    <option value="">-- Chọn lớp học đích --</option>
                    {classes.map(c => {
                      const gradeName = grades.find(g => g.id === c.gradeId)?.name || '';
                      return (
                        <option key={c.id} value={c.id}>{c.name} ({gradeName})</option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsMoveClassOpen(false)}
                className="px-4 py-2 text-xs font-semibold border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!bulkClassId}
                onClick={() => {
                  if (!bulkClassId) return;
                  selectedIds.forEach(id => {
                    onUpdateStudent(id, { classId: bulkClassId });
                  });
                  setSelectedIds([]);
                  setIsMoveClassOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl cursor-pointer shadow-xs"
              >
                Xác nhận chuyển
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
