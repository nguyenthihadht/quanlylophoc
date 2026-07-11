/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Sparkles, Check, RefreshCw, Info, Save, HelpCircle, 
  ChevronRight, Calendar, AlertCircle, Edit3, Award, Users, CheckSquare
} from 'lucide-react';
import { Class, Student, Comment, SemesterScore, Assessment } from '../types';

interface ScoresManagerProps {
  students: Student[];
  classes: Class[];
  assessments: Assessment[];
  comments: Comment[];
  scores: SemesterScore[];
  onAddOrUpdateScore: (studentId: string, semester: 'Cuối học kỳ 1' | 'Cuối học kỳ 2', score: number) => void;
  onGenerateAIComment: (studentId: string) => Promise<string>;
  onAddComment: (studentId: string, content: string, type: 'AI' | 'Thủ công') => void;
}

export function ScoresManager({
  students,
  classes,
  assessments,
  comments,
  scores,
  onAddOrUpdateScore,
  onGenerateAIComment,
  onAddComment
}: ScoresManagerProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [editScores, setEditScores] = useState<Record<string, { hk1: string; hk2: string }>>({});
  const [editComments, setEditComments] = useState<Record<string, string>>({});
  const [generatingIds, setGeneratingIds] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Sync state when selected class or scores change
  useEffect(() => {
    if (!selectedClassId) return;
    
    const classStudents = students.filter(s => s.classId === selectedClassId);
    const initialScores: Record<string, { hk1: string; hk2: string }> = {};
    const initialComments: Record<string, string> = {};

    classStudents.forEach(student => {
      const hk1Score = scores.find(s => s.studentId === student.id && s.semester === 'Cuối học kỳ 1');
      const hk2Score = scores.find(s => s.studentId === student.id && s.semester === 'Cuối học kỳ 2');
      
      initialScores[student.id] = {
        hk1: hk1Score ? hk1Score.score.toString() : '',
        hk2: hk2Score ? hk2Score.score.toString() : ''
      };

      // Get latest comment for the student
      const studentComments = comments.filter(c => c.studentId === student.id);
      if (studentComments.length > 0) {
        // Sort descending by date to get latest
        const sorted = [...studentComments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        initialComments[student.id] = sorted[0].content;
      } else {
        initialComments[student.id] = '';
      }
    });

    setEditScores(initialScores);
    setEditComments(initialComments);
  }, [selectedClassId, students, scores, comments]);

  // Handle class switch
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(e.target.value);
    setSuccessMessage('');
    setErrorMessage('');
  };

  // Handle score text input
  const handleScoreChange = (studentId: string, semester: 'hk1' | 'hk2', val: string) => {
    // Basic formatting constraint (numbers 0 to 10 with decimal point allowed)
    if (val !== '' && !/^\d*\.?\d*$/.test(val)) return;
    
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && (parsed < 0 || parsed > 10)) return;

    setEditScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [semester]: val
      }
    }));
  };

  // Save changes for a single student row
  const handleSaveStudentRow = (studentId: string) => {
    try {
      const rowScores = editScores[studentId] || { hk1: '', hk2: '' };
      const commentText = editComments[studentId] || '';

      // Save HK1 Score if filled
      if (rowScores.hk1 !== '') {
        const numHk1 = parseFloat(rowScores.hk1);
        if (!isNaN(numHk1) && numHk1 >= 0 && numHk1 <= 10) {
          onAddOrUpdateScore(studentId, 'Cuối học kỳ 1', numHk1);
        }
      }

      // Save HK2 Score if filled
      if (rowScores.hk2 !== '') {
        const numHk2 = parseFloat(rowScores.hk2);
        if (!isNaN(numHk2) && numHk2 >= 0 && numHk2 <= 10) {
          onAddOrUpdateScore(studentId, 'Cuối học kỳ 2', numHk2);
        }
      }

      // Save Comment if filled and has changed
      if (commentText.trim()) {
        const latestComment = comments
          .filter(c => c.studentId === studentId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          
        if (!latestComment || latestComment.content !== commentText.trim()) {
          onAddComment(studentId, commentText.trim(), 'Thủ công');
        }
      }

      setSuccessMessage('Đã lưu điểm số và nhận xét thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage('Lỗi khi lưu dữ liệu. Vui lòng kiểm tra lại.');
    }
  };

  // Save all student rows for the current class
  const handleSaveAllClassData = () => {
    const classStudents = students.filter(s => s.classId === selectedClassId);
    let count = 0;
    
    classStudents.forEach(student => {
      const rowScores = editScores[student.id] || { hk1: '', hk2: '' };
      const commentText = editComments[student.id] || '';

      if (rowScores.hk1 !== '') {
        const numHk1 = parseFloat(rowScores.hk1);
        if (!isNaN(numHk1) && numHk1 >= 0 && numHk1 <= 10) {
          onAddOrUpdateScore(student.id, 'Cuối học kỳ 1', numHk1);
          count++;
        }
      }

      if (rowScores.hk2 !== '') {
        const numHk2 = parseFloat(rowScores.hk2);
        if (!isNaN(numHk2) && numHk2 >= 0 && numHk2 <= 10) {
          onAddOrUpdateScore(student.id, 'Cuối học kỳ 2', numHk2);
          count++;
        }
      }

      if (commentText.trim()) {
        const latestComment = comments
          .filter(c => c.studentId === student.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          
        if (!latestComment || latestComment.content !== commentText.trim()) {
          onAddComment(student.id, commentText.trim(), 'Thủ công');
          count++;
        }
      }
    });

    setSuccessMessage(`Đã cập nhật toàn bộ ${classStudents.length} học sinh trong lớp thành công!`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Trigger Gemini comment generation for a specific student
  const handleGenerateAIForStudent = async (studentId: string) => {
    // Temporarily save scores to model cache so AI can see it
    const rowScores = editScores[studentId] || { hk1: '', hk2: '' };
    if (rowScores.hk1 !== '') {
      const numHk1 = parseFloat(rowScores.hk1);
      if (!isNaN(numHk1)) onAddOrUpdateScore(studentId, 'Cuối học kỳ 1', numHk1);
    }
    if (rowScores.hk2 !== '') {
      const numHk2 = parseFloat(rowScores.hk2);
      if (!isNaN(numHk2)) onAddOrUpdateScore(studentId, 'Cuối học kỳ 2', numHk2);
    }

    setGeneratingIds(prev => ({ ...prev, [studentId]: true }));
    try {
      const comment = await onGenerateAIComment(studentId);
      setEditComments(prev => ({
        ...prev,
        [studentId]: comment
      }));
      
      // Save generated comment
      onAddComment(studentId, comment, 'AI');
      
      setSuccessMessage('Đã tạo nhận xét AI thông minh dựa trên cả điểm số và quá trình học tập!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage('Không thể kết nối AI. Đang sử dụng bộ sinh nhận xét dự phòng.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setGeneratingIds(prev => ({ ...prev, [studentId]: false }));
    }
  };

  // EXPORT EXCEL (CSV Format compatible with Excel)
  const handleExportExcelByClass = () => {
    const targetClass = classes.find(c => c.id === selectedClassId);
    if (!targetClass) return;

    const className = targetClass.name;
    const filename = `Bang_Diem_Tin_Hoc_Lop_${className}.csv`;

    // CSV header with BOM for Vietnamese display in Excel
    const headers = 'STT,Mã số học sinh,Họ và tên,Giới tính,Điểm thi Cuối HK1,Điểm thi Cuối HK2,Nhận xét cuối năm\n';
    
    const classStudents = students.filter(s => s.classId === selectedClassId);
    
    const rows = classStudents.map((s, index) => {
      const rowScores = editScores[s.id] || { hk1: '', hk2: '' };
      const commentText = editComments[s.id] || '';
      
      // Clean string for CSV escaping
      const cleanComment = commentText.replace(/"/g, '""').replace(/\n/g, ' ');

      return `${index + 1},"${s.studentId}","${s.name}","${s.gender}","${rowScores.hk1 || '-'}","${rowScores.hk2 || '-'}","${cleanComment || 'Chưa nhận xét'}"`;
    }).join('\n');

    const blob = new Blob(['\ufeff' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter students based on search query
  const filteredStudents = students
    .filter(s => s.classId === selectedClassId)
    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.studentId.toLowerCase().includes(searchQuery.toLowerCase()));

  const targetClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="space-y-6">
      {/* 1. TIMELINE & EXPLANATION OF PRIMARY SCHOOL INFORMATICS */}
      <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-slate-50 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-900 p-6 rounded-3xl border border-blue-100/50 dark:border-slate-700/80 shadow-xs space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h2 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 font-display">
              Khung Phân Phối Chương Trình Môn Tin Học Tiểu Học
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Thời gian học bắt đầu từ <strong>Tháng 9</strong> đến kết thúc <strong>Tháng 5</strong> năm sau. Tổng cộng <strong>35 tuần học</strong> (1 tiết/tuần), chia làm 4 khoảng thời gian nhận xét định kỳ.
            </p>
          </div>
        </div>

        {/* Interactive Period Visual Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
          {/* Period 1 */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-150 dark:border-slate-700 flex flex-col justify-between space-y-3 shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-450 uppercase tracking-wider">Lần nhận xét 1</span>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">Giữa học kỳ I</h4>
              <p className="text-[11px] text-slate-400">10 tuần đầu tiên (Tuần 1 - 10)</p>
            </div>
            <span className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 px-2.5 py-1 rounded-full self-start">
              Quá trình (Không thi)
            </span>
          </div>

          {/* Period 2 */}
          <div className="bg-gradient-to-br from-amber-500/5 to-amber-600/5 dark:from-slate-800 dark:to-slate-800 p-4 rounded-2xl border border-amber-200/50 dark:border-slate-700/80 flex flex-col justify-between space-y-3 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/10 rounded-bl-full flex items-start justify-end p-1">
              <Award className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Lần nhận xét 2</span>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">Cuối học kỳ I</h4>
              <p className="text-[11px] text-slate-400">8 tuần tiếp theo (Tuần 11 - 18)</p>
            </div>
            <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full self-start flex items-center gap-1 shadow-2xs">
              ★ Có bài thi điểm số (0-10)
            </span>
          </div>

          {/* Period 3 */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-150 dark:border-slate-700 flex flex-col justify-between space-y-3 shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">Lần nhận xét 3</span>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">Giữa học kỳ II</h4>
              <p className="text-[11px] text-slate-400">9 tuần tiếp theo (Tuần 19 - 27)</p>
            </div>
            <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 px-2.5 py-1 rounded-full self-start">
              Quá trình (Không thi)
            </span>
          </div>

          {/* Period 4 */}
          <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 dark:from-slate-800 dark:to-slate-800 p-4 rounded-2xl border border-emerald-200/50 dark:border-slate-700/80 flex flex-col justify-between space-y-3 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 rounded-bl-full flex items-start justify-end p-1">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Lần nhận xét 4</span>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">Cuối học kỳ II</h4>
              <p className="text-[11px] text-slate-400">8 tuần cuối cùng (Tuần 28 - 35)</p>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full self-start flex items-center gap-1 shadow-2xs">
              ★ Có bài thi điểm số (0-10)
            </span>
          </div>
        </div>
      </div>

      {/* 2. CLASS FILTER & SCORE MANAGEMENT ACTIONS BAR */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 vibrant-card">
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
          {/* Class Select Dropdown */}
          <div className="space-y-1 w-full sm:w-auto">
            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Lớp Đang Chọn:</label>
            <select
              value={selectedClassId}
              onChange={handleClassChange}
              className="px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer min-w-[200px]"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>Lớp {c.name}</option>
              ))}
            </select>
          </div>

          {/* Search bar inside class */}
          <div className="space-y-1 w-full sm:w-auto flex-1 sm:flex-none">
            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Tìm kiếm học sinh:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập tên hoặc Mã HS..."
              className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 max-w-xs"
            />
          </div>
        </div>

        {/* Global actions: Save All & Export Excel */}
        <div className="flex gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleSaveAllClassData}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Lưu điểm lớp {targetClass?.name}
          </button>
          
          <button
            type="button"
            onClick={handleExportExcelByClass}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="Xuất File Excel Chứa Mã Số, Họ Tên, Điểm Số và Nhận Xét"
          >
            <FileSpreadsheet className="w-4 h-4" /> Xuất Excel Lớp
          </button>
        </div>
      </div>

      {/* Notifications banner */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <Check className="w-4.5 h-4.5 text-emerald-500" /> {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 text-rose-500" /> {errorMessage}
        </div>
      )}

      {/* 3. GRID/ROSTER SCORE ENTRY */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/10">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Users className="w-4.5 h-4.5 text-blue-500" /> Sổ Ghi Điểm & Nhận Xét Lớp {targetClass?.name || 'Chưa chọn'}
          </h3>
          <span className="text-[11px] font-bold text-slate-450 dark:text-slate-400">
            Sĩ số hiển thị: <span className="text-slate-750 dark:text-slate-200">{filteredStudents.length}</span> / {students.filter(s => s.classId === selectedClassId).length} em
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/30 dark:bg-slate-900/15 text-[10px] font-black uppercase tracking-wider text-slate-450">
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4 w-28">Mã học sinh</th>
                <th className="py-3 px-4 w-44">Họ và Tên</th>
                <th className="py-3 px-4 w-24 text-center">Cuối học kỳ 1 (Điểm)</th>
                <th className="py-3 px-4 w-24 text-center">Cuối học kỳ 2 (Điểm)</th>
                <th className="py-3 px-4">Đánh giá quá trình & Nhận xét cuối kỳ</th>
                <th className="py-3 px-4 w-32 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy học sinh nào phù hợp trong lớp này.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const studentAssessments = assessments.filter(a => a.studentId === student.id);
                  const isGen = !!generatingIds[student.id];
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-700/10 transition-colors">
                      {/* STT */}
                      <td className="py-3.5 px-4 font-bold text-center text-slate-400">{idx + 1}</td>
                      
                      {/* Student ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500 dark:text-slate-400">
                        {student.studentId}
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-850 dark:text-slate-100">{student.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{student.gender}</span> · 
                          <span>{studentAssessments.length} tiết đánh giá</span>
                        </div>
                      </td>

                      {/* HK1 Score Input */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="text"
                          value={editScores[student.id]?.hk1 || ''}
                          onChange={(e) => handleScoreChange(student.id, 'hk1', e.target.value)}
                          placeholder="-"
                          className="w-14 px-2.5 py-1.5 text-center font-extrabold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </td>

                      {/* HK2 Score Input */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="text"
                          value={editScores[student.id]?.hk2 || ''}
                          onChange={(e) => handleScoreChange(student.id, 'hk2', e.target.value)}
                          placeholder="-"
                          className="w-14 px-2.5 py-1.5 text-center font-extrabold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Comment Input / Preview */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <textarea
                            value={editComments[student.id] || ''}
                            onChange={(e) => {
                              const text = e.target.value;
                              setEditComments(prev => ({ ...prev, [student.id]: text }));
                            }}
                            placeholder="Chưa có nhận xét học bạ cuối kỳ. Nhấp nút ✨ AI để sinh nhận xét cá nhân hóa tự động..."
                            className="w-full h-14 p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </td>

                      {/* Individual Save & AI Buttons */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col sm:flex-row items-stretch justify-center gap-1.5">
                          {/* AI Assistant Generate */}
                          <button
                            type="button"
                            onClick={() => handleGenerateAIForStudent(student.id)}
                            disabled={isGen || studentAssessments.length === 0}
                            className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-650 dark:text-indigo-300 dark:hover:text-white disabled:opacity-40 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Tự động sinh nhận xét học bạ dựa trên điểm thi và quá trình"
                          >
                            {isGen ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-blue-500" /> AI Nhận xét
                              </>
                            )}
                          </button>

                          {/* Individual Save */}
                          <button
                            type="button"
                            onClick={() => handleSaveStudentRow(student.id)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-slate-750 dark:hover:bg-blue-600 dark:text-slate-200 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" /> Lưu dòng
                          </button>
                        </div>
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
  );
}
