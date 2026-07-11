/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Calendar, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  RefreshCw, 
  Sparkles, 
  FileText,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { TimelineWeek } from '../types';
import { ClassTrackerAPI } from '../lib/api';

interface TimelineManagerProps {
  timeline: TimelineWeek[];
  onSaveTimeline: (timeline: TimelineWeek[]) => void;
}

export default function TimelineManager({ timeline, onSaveTimeline }: TimelineManagerProps) {
  // Local state
  const [weeks, setWeeks] = useState<TimelineWeek[]>(timeline);
  const [startDateInput, setStartDateInput] = useState('2025-09-01');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  
  // Drag and drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for adding new week
  const [newStt, setNewStt] = useState(weeks.length + 1);
  const [newWeekName, setNewWeekName] = useState(`Tuần ${weeks.length + 1}`);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newSemester, setNewSemester] = useState<'Học kỳ 1' | 'Học kỳ 2'>('Học kỳ 1');
  const [newLessonName, setNewLessonName] = useState('');

  // Inline editing states
  const [editStt, setEditStt] = useState(1);
  const [editWeekName, setEditWeekName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editSemester, setEditSemester] = useState<'Học kỳ 1' | 'Học kỳ 2'>('Học kỳ 1');
  const [editLessonName, setEditLessonName] = useState('');

  const handleAutoGenerate = () => {
    if (!startDateInput) return;
    const defaultTimeline = ClassTrackerAPI.generateDefaultTimeline(startDateInput);
    setWeeks(defaultTimeline);
    onSaveTimeline(defaultTimeline);
    setImportSuccess('Đã tự động khởi tạo 35 tuần học bắt đầu từ ngày ' + startDateInput);
    setTimeout(() => setImportSuccess(null), 4000);
  };

  const handleClear = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ khung phân phối chương trình này không?')) {
      setWeeks([]);
      onSaveTimeline([]);
      setNewStt(1);
      setNewWeekName('Tuần 1');
    }
  };

  // Add a new week manually
  const handleAddWeek = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStartDate || !newEndDate) {
      setImportError('Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }

    const newWeek: TimelineWeek = {
      id: `timeline_week_${Date.now()}`,
      stt: Number(newStt),
      week: newWeekName,
      startDate: newStartDate,
      endDate: newEndDate,
      semester: newSemester,
      lessonName: newLessonName.trim() || `Bài học Tuần ${newStt}`
    };

    const updated = [...weeks, newWeek].sort((a, b) => a.stt - b.stt);
    setWeeks(updated);
    onSaveTimeline(updated);
    
    // Reset states
    setNewStt(updated.length + 1);
    setNewWeekName(`Tuần ${updated.length + 1}`);
    setNewStartDate('');
    setNewEndDate('');
    setNewLessonName('');
    setImportError(null);
  };

  // Start inline editing
  const startEditing = (week: TimelineWeek) => {
    setEditingId(week.id);
    setEditStt(week.stt);
    setEditWeekName(week.week);
    setEditStartDate(week.startDate);
    setEditEndDate(week.endDate);
    setEditSemester(week.semester);
    setEditLessonName(week.lessonName || '');
  };

  // Save inline edits
  const saveEditing = (id: string) => {
    const updated = weeks.map(w => {
      if (w.id === id) {
        return {
          ...w,
          stt: Number(editStt),
          week: editWeekName,
          startDate: editStartDate,
          endDate: editEndDate,
          semester: editSemester,
          lessonName: editLessonName.trim()
        };
      }
      return w;
    }).sort((a, b) => a.stt - b.stt);

    setWeeks(updated);
    onSaveTimeline(updated);
    setEditingId(null);
  };

  // Delete individual week
  const handleDeleteWeek = (id: string) => {
    const updated = weeks.filter(w => w.id !== id);
    setWeeks(updated);
    onSaveTimeline(updated);
  };

  // Export Sample Template CSV
  const downloadTemplate = () => {
    const headers = 'stt,week,lessonName,startDate,endDate,semester\n';
    const row1 = '1,Tuần 1,Bài 1: Thông tin và quyết định,2025-09-01,2025-09-07,Học kỳ 1\n';
    const row2 = '2,Tuần 2,Bài 2: Khám phá máy tính,2025-09-08,2025-09-14,Học kỳ 1\n';
    const row3 = '19,Tuần 19,Bài 17: Làm quen với Scratch,2026-01-12,2026-01-18,Học kỳ 2\n';
    const csvContent = '\uFEFF' + headers + row1 + row2 + row3; // Include BOM for Vietnamese Excel support

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'khung_thoi_gian_mau.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV function
  const parseCSV = (text: string) => {
    try {
      const lines = text.split('\n');
      if (lines.length < 2) {
        throw new Error('Tệp rỗng hoặc không đúng định dạng.');
      }

      const importedWeeks: TimelineWeek[] = [];
      // Skip headers
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(/[,;\t]/).map(p => p.replace(/^["']|["']$/g, '').trim());
        if (parts.length < 5) {
          throw new Error(`Dòng ${i + 1}: Thiếu thông tin. Cần ít nhất 5 cột (stt, tuần, [bài giảng], ngày bắt đầu, ngày kết thúc, học kỳ)`);
        }

        let sttStr = '';
        let week = '';
        let lessonName = '';
        let startDate = '';
        let endDate = '';
        let semesterStr = '';

        if (parts.length >= 6) {
          [sttStr, week, lessonName, startDate, endDate, semesterStr] = parts;
        } else {
          [sttStr, week, startDate, endDate, semesterStr] = parts;
          lessonName = `Bài học Tuần ${sttStr}`;
        }

        const stt = Number(sttStr);
        if (isNaN(stt)) {
          throw new Error(`Dòng ${i + 1}: Số thứ tự không hợp lệ`);
        }

        const semester = (semesterStr === 'Học kỳ 2' || semesterStr === 'HK2' || semesterStr === '2') ? 'Học kỳ 2' : 'Học kỳ 1';

        importedWeeks.push({
          id: `timeline_week_import_${Date.now()}_${i}`,
          stt,
          week: week || `Tuần ${stt}`,
          startDate,
          endDate,
          semester,
          lessonName: lessonName || `Bài học Tuần ${stt}`
        });
      }

      if (importedWeeks.length === 0) {
        throw new Error('Không tìm thấy dòng dữ liệu hợp lệ nào.');
      }

      // Sort and save
      const sorted = importedWeeks.sort((a, b) => a.stt - b.stt);
      setWeeks(sorted);
      onSaveTimeline(sorted);
      setImportError(null);
      setImportSuccess(`Đã nhập thành công ${sorted.length} tuần học từ file CSV!`);
      setTimeout(() => setImportSuccess(null), 4000);
    } catch (err: any) {
      setImportError(err.message || 'Lỗi xử lý file CSV. Vui lòng kiểm tra lại định dạng mẫu.');
    }
  };

  // Drag-and-drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          parseCSV(evt.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          parseCSV(evt.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6" id="timeline_manager_panel">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-850 p-6 rounded-2xl border border-slate-150 dark:border-slate-750 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" /> Khung Phân Phối Chương Trình Môn Tin Học
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Quản lý mốc thời gian học tập 35 tuần của năm học để trợ lý ảo AI tự động tạo nhận xét học bạ phù hợp vào từng thời điểm cụ thể.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Tải file mẫu CSV
          </button>
          <button
            onClick={handleClear}
            disabled={weeks.length === 0}
            className="px-3.5 py-2 border border-rose-200 hover:bg-rose-50 dark:border-rose-950/30 dark:hover:bg-rose-950/20 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
          </button>
        </div>
      </div>

      {/* TWO COLUMN INTERFACE: GENERATOR & MANUAL ADD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: SETUP & CSV IMPORT */}
        <div className="lg:col-span-1 space-y-6">
          {/* Section 1: Auto generator */}
          <div className="bg-white dark:bg-slate-850 p-6 rounded-2xl border border-slate-150 dark:border-slate-750 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> Tự động khởi tạo 35 Tuần
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhập ngày bắt đầu học kỳ 1 (thường là thứ hai đầu tiên của tháng 9) để tự động giãn mốc thời gian 35 tuần học.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ngày bắt đầu năm học</label>
                <input 
                  type="date"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                />
              </div>
              <button
                onClick={handleAutoGenerate}
                className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Tạo 35 Tuần Mẫu Mới
              </button>
            </div>
          </div>

          {/* Section 2: CSV Import Drag-and-Drop */}
          <div className="bg-white dark:bg-slate-850 p-6 rounded-2xl border border-slate-150 dark:border-slate-750 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-blue-500" /> Nhập từ file CSV
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tải lên bảng phân phối chương trình có sẵn của bạn. Định dạng CSV hỗ trợ Tiếng Việt đầy đủ.
            </p>

            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-500/5' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv"
                onChange={handleFileChange}
                className="hidden" 
              />
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Kéo & thả file CSV vào đây</p>
              <p className="text-[10px] text-slate-400 mt-1">hoặc click để chọn file từ máy tính</p>
            </div>

            {/* Error & Success indicators */}
            {importError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}
            {importSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{importSuccess}</span>
              </div>
            )}
          </div>

          {/* Section 3: Add Week Manually */}
          <div className="bg-white dark:bg-slate-850 p-6 rounded-2xl border border-slate-150 dark:border-slate-750 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-500" /> Thêm tuần học thủ công
            </h2>
            <form onSubmit={handleAddWeek} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Số thứ tự (STT)</label>
                  <input 
                    type="number"
                    value={newStt}
                    onChange={(e) => {
                      setNewStt(Number(e.target.value));
                      setNewWeekName(`Tuần ${e.target.value}`);
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tên Tuần học</label>
                  <input 
                    type="text"
                    value={newWeekName}
                    onChange={(e) => setNewWeekName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tên bài giảng / Chủ đề (PPCT)</label>
                <input 
                  type="text"
                  placeholder="Ví dụ: Bài 1: Thông tin và quyết định"
                  value={newLessonName}
                  onChange={(e) => setNewLessonName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Từ ngày</label>
                  <input 
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Đến ngày</label>
                  <input 
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Thuộc Học kỳ</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSemester('Học kỳ 1')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      newSemester === 'Học kỳ 1' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300' 
                        : 'border-slate-200 dark:border-slate-750 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Học kỳ 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSemester('Học kỳ 2')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      newSemester === 'Học kỳ 2' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300' 
                        : 'border-slate-200 dark:border-slate-750 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Học kỳ 2
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Thêm tuần học
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: TIMELINE DATATABLE */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-150 dark:border-slate-750 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-150 dark:border-slate-750 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Chi tiết khung thời gian học tập ({weeks.length} tuần)
              </h2>
              {weeks.length > 0 && (
                <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200/50">
                  {weeks.filter(w => w.semester === 'Học kỳ 1').length} tuần HK1 | {weeks.filter(w => w.semester === 'Học kỳ 2').length} tuần HK2
                </span>
              )}
            </div>

            {weeks.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Chưa có khung phân phối chương trình</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Vui lòng bấm nút Tự động khởi tạo 35 tuần ở cột bên trái hoặc tải file phân phối chương trình CSV lên để bắt đầu.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/25 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-750 text-slate-500 font-bold">
                      <th className="px-5 py-3 w-16">STT</th>
                      <th className="px-4 py-3 w-28">Tuần</th>
                      <th className="px-4 py-3 min-w-[200px]">Tên bài giảng / Chủ đề (PPCT)</th>
                      <th className="px-4 py-3">Từ ngày</th>
                      <th className="px-4 py-3">Đến ngày</th>
                      <th className="px-4 py-3 w-28">Học kỳ</th>
                      <th className="px-5 py-3 text-right w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-750 font-medium">
                    {weeks.map((week) => {
                      const isEditing = editingId === week.id;
                      return (
                        <tr key={week.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all text-slate-700 dark:text-slate-300">
                          {/* STT Column */}
                          <td className="px-5 py-3">
                            {isEditing ? (
                              <input 
                                type="number"
                                value={editStt}
                                onChange={(e) => setEditStt(Number(e.target.value))}
                                className="w-12 px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-center font-bold text-xs"
                              />
                            ) : (
                              <span className="font-bold text-slate-450 dark:text-slate-500">{week.stt}</span>
                            )}
                          </td>

                          {/* Week Name Column */}
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input 
                                type="text"
                                value={editWeekName}
                                onChange={(e) => setEditWeekName(e.target.value)}
                                className="w-full max-w-[120px] px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-xs font-semibold"
                              />
                            ) : (
                              <span className="font-bold text-slate-800 dark:text-slate-250">{week.week}</span>
                            )}
                          </td>

                          {/* Lesson Name Column */}
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input 
                                type="text"
                                value={editLessonName}
                                onChange={(e) => setEditLessonName(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-xs font-semibold text-slate-800 dark:text-slate-100"
                                placeholder="Nhập tên bài học / chủ đề..."
                              />
                            ) : (
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {week.lessonName || <span className="text-slate-400 italic font-normal">Chưa cập nhật tên bài</span>}
                              </span>
                            )}
                          </td>

                          {/* Start Date Column */}
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input 
                                type="date"
                                value={editStartDate}
                                onChange={(e) => setEditStartDate(e.target.value)}
                                className="px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-xs"
                              />
                            ) : (
                              <span className="font-mono text-slate-600 dark:text-slate-400">
                                {new Date(week.startDate).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </td>

                          {/* End Date Column */}
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input 
                                type="date"
                                value={editEndDate}
                                onChange={(e) => setEditEndDate(e.target.value)}
                                className="px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-xs"
                              />
                            ) : (
                              <span className="font-mono text-slate-600 dark:text-slate-400">
                                {new Date(week.endDate).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </td>

                          {/* Semester Column */}
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <select
                                value={editSemester}
                                onChange={(e) => setEditSemester(e.target.value as 'Học kỳ 1' | 'Học kỳ 2')}
                                className="px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-xs text-slate-800 dark:text-slate-200"
                              >
                                <option value="Học kỳ 1">Học kỳ 1</option>
                                <option value="Học kỳ 2">Học kỳ 2</option>
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                week.semester === 'Học kỳ 1' 
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40' 
                                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40'
                              }`}>
                                {week.semester}
                              </span>
                            )}
                          </td>

                          {/* Operations Column */}
                          <td className="px-5 py-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => saveEditing(week.id)}
                                  className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 rounded-lg cursor-pointer"
                                  title="Lưu"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-500 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-400 rounded-lg cursor-pointer"
                                  title="Hủy"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5 opacity-60 hover:opacity-100 transition-all">
                                <button
                                  onClick={() => startEditing(week)}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                  title="Sửa hàng"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteWeek(week.id)}
                                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                                  title="Xóa hàng"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
