/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Download, Upload, Eye, FileSpreadsheet, Info, Check, AlertCircle } from 'lucide-react';
import { Class, Student, Grade } from '../types';

interface StudentManagerProps {
  classes: Class[];
  grades: Grade[];
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onUpdateStudent: (id: string, fields: Partial<Omit<Student, 'id'>>) => void;
  onDeleteStudent: (id: string) => void;
  onImportCSV: (csvText: string, classId: string) => { successCount: number; errors: string[] };
}

export function StudentManager({
  classes,
  grades,
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onImportCSV
}: StudentManagerProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedGender, setSelectedGender] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals & Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

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
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClassId ? s.classId === selectedClassId : true;
    const matchGender = selectedGender ? s.gender === selectedGender : true;
    return matchSearch && matchClass && matchGender;
  });

  // Paginated students
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div id="student-manager-container" className="space-y-6">
      
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
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={(e) => { setSelectedClassId(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả Lớp</option>
            {classes.map(c => {
              const gradeName = grades.find(g => g.id === c.gradeId)?.name || '';
              return (
                <option key={c.id} value={c.id}>{c.name} ({gradeName})</option>
              );
            })}
          </select>

          {/* Gender Filter */}
          <select
            value={selectedGender}
            onChange={(e) => { setSelectedGender(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Giới tính</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
        </div>

        {/* Right Action buttons */}
        <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Nhập Excel / CSV
          </button>
          <button
            onClick={handleCSVExport}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Xuất Excel
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm học sinh
          </button>
        </div>
      </div>

      {/* Main Table Panel */}
      <div id="students-table-panel" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs overflow-hidden">
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
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-all">
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
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc chắn muốn xóa học sinh ${s.name}? Toàn bộ lịch sử đánh giá của em cũng sẽ bị xóa.`)) {
                              onDeleteStudent(s.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">-- Chọn lớp học --</option>
                  {classes.map(c => {
                    const gradeName = grades.find(g => g.id === c.gradeId)?.name || '';
                    return (
                      <option key={c.id} value={c.id}>{c.name} ({gradeName})</option>
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
                  className="w-full h-36 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
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
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Minh Khang"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Giới tính</label>
                  <select
                    value={studentGender}
                    onChange={(e) => setStudentGender(e.target.value as 'Nam' | 'Nữ')}
                    className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
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
                    className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Lớp học</label>
                <select
                  value={studentClassId}
                  onChange={(e) => setStudentClassId(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">-- Chọn lớp học --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Ghi chú cá nhân</label>
                <textarea
                  placeholder="Ghi chú về học sinh này..."
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                  className="w-full h-20 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
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

    </div>
  );
}
