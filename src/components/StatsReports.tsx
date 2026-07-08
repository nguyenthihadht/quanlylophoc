/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Printer, BarChart2, Layers, Home, Info, Download } from 'lucide-react';
import { Class, Grade, Student, Assessment, SchoolYear } from '../types';

interface StatsReportsProps {
  schoolYears: SchoolYear[];
  grades: Grade[];
  classes: Class[];
  students: Student[];
  assessments: Assessment[];
  schoolName?: string;
}

export function StatsReports({
  schoolYears,
  grades,
  classes,
  students,
  assessments,
  schoolName = 'Trường Tiểu học Thuận Giao'
}: StatsReportsProps) {
  // Filter state
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('Học kỳ II');

  // Computed class and grade
  const targetClass = classes.find(c => c.id === selectedClassId);
  const targetGrade = targetClass ? grades.find(g => g.id === targetClass.gradeId) : null;
  const classStudents = selectedClassId ? students.filter(s => s.classId === selectedClassId) : students;

  // Assessments for filtered students
  const filteredStudentIds = classStudents.map(s => s.id);
  const filteredAssessments = assessments.filter(a => filteredStudentIds.includes(a.studentId));

  const totalAssessmentsCount = filteredAssessments.length;

  // Completion metrics
  const excellentCount = filteredAssessments.filter(a => a.completion === 'Hoàn thành tốt').length;
  const goodCount = filteredAssessments.filter(a => a.completion === 'Hoàn thành').length;
  const incompleteCount = filteredAssessments.filter(a => a.completion === 'Chưa hoàn thành').length;

  const excellentRate = totalAssessmentsCount > 0 ? Math.round((excellentCount / totalAssessmentsCount) * 100) : 0;
  const goodRate = totalAssessmentsCount > 0 ? Math.round((goodCount / totalAssessmentsCount) * 100) : 0;
  const incompleteRate = totalAssessmentsCount > 0 ? Math.round((incompleteCount / totalAssessmentsCount) * 100) : 0;

  // Criteria metrics
  const getAttrCounts = (attr: 'attitude' | 'skill' | 'cooperation', positiveValue: string) => {
    const total = filteredAssessments.length;
    if (total === 0) return 0;
    const positiveCount = filteredAssessments.filter(a => a[attr] === positiveValue).length;
    return Math.round((positiveCount / total) * 100);
  };

  const positiveAttitudeRate = getAttrCounts('attitude', 'Tích cực');
  const skilledRate = getAttrCounts('skill', 'Thành thạo');
  const coopRate = getAttrCounts('cooperation', 'Tốt');

  // EXPORT FUNCTIONS
  // Export Class Report to CSV
  const handleExportClassExcel = () => {
    const className = targetClass?.name || 'Toan_Truong';
    const filename = `bao_cao_tin_hoc_${className}_${selectedSemester.replace(' ', '_')}.csv`;

    const headers = 'STT,Mã học sinh,Họ tên,Giới tính,Lớp học,Đánh giá cuối kỳ,Nhận xét chuyên môn\n';
    
    const rows = classStudents.map((s, index) => {
      const sAssess = assessments.filter(a => a.studentId === s.id);
      const exc = sAssess.filter(a => a.completion === 'Hoàn thành tốt').length;
      const total = sAssess.length;
      
      let finalRating = 'Hoàn thành';
      if (exc >= total * 0.5 && total > 0) finalRating = 'Hoàn thành tốt';
      if (sAssess.filter(a => a.completion === 'Chưa hoàn thành').length >= total * 0.4 && total > 0) finalRating = 'Chưa hoàn thành';

      const remark = `Em ${s.name} học tốt môn Tin học tiểu học. Kỹ năng thực hành đạt kết quả cao.`;

      return `${index + 1},"${s.studentId}","${s.name}","${s.gender}","${targetClass?.name || 'Chưa rõ'}","${finalRating}","${remark}"`;
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

  // Export to copyable text block for Word
  const handleExportWord = () => {
    const className = targetClass?.name || 'Toàn trường';
    const textData = `
BÁO CÁO KẾT QUẢ HỌC TẬP MÔN TIN HỌC TIỂU HỌC
Học kỳ: ${selectedSemester}
Lớp: ${className}
Khối: ${targetGrade?.name || 'Toàn khối'}
Tổng số học sinh: ${classStudents.length} em

Tỷ lệ kết quả hoàn thành:
- Hoàn thành tốt: ${excellentRate}% (${excellentCount} lượt đánh giá)
- Hoàn thành: ${goodRate}% (${goodCount} lượt đánh giá)
- Chưa hoàn thành: ${incompleteRate}% (${incompleteCount} lượt đánh giá)

Đặc thù các chỉ số rèn luyện chính:
- Thái độ tích cực tự học: ${positiveAttitudeRate}%
- Kỹ năng thao tác máy tính thành thạo: ${skilledRate}%
- Tương tác hợp tác nhóm tốt: ${coopRate}%

Nhận xét tổng quan của GV bộ môn:
Cả lớp nhìn chung có thái độ học tập nghiêm túc, tích cực thực hành gõ phím. Nhiều em hoàn thành sản phẩm sáng tạo và biết tự giác giúp đỡ bạn bè trong giờ thực hành.
`;

    // Trigger raw download as text file simulating docx output text
    const blob = new Blob([textData], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bao_cao_word_${className}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="stats-reports-container" className="space-y-6">
      
      {/* Filters Bar */}
      <div id="stats-filter-bar" className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between no-print vibrant-card">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">-- Toàn bộ các Lớp --</option>
            {classes.map(c => {
              const grade = grades.find(g => g.id === c.gradeId);
              return (
                <option key={c.id} value={c.id}>Lớp {c.name} ({grade?.name})</option>
              );
            })}
          </select>

          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="Học kỳ I">Học kỳ I</option>
            <option value="Học kỳ II">Học kỳ II</option>
            <option value="Cả năm">Cả năm học</option>
          </select>
        </div>

        {/* Exports */}
        <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
          <button
            onClick={handleExportWord}
            className="px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Xuất file văn bản nháp Word"
          >
            <FileText className="w-4 h-4 text-blue-500" /> Báo cáo Word
          </button>
          <button
            onClick={handleExportClassExcel}
            className="px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Xuất bảng điểm chi tiết Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Xuất Excel Học kỳ
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> In PDF Sổ Đánh Giá
          </button>
        </div>
      </div>

      {/* Main dashboard printable panel */}
      <div id="printable-report-card" className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs space-y-6 vibrant-card">
        
        {/* Report Document Title */}
        <div className="text-center space-y-1.5 border-b border-slate-100 dark:border-slate-700 pb-5">
          <h4 className="text-xs uppercase tracking-widest font-extrabold text-slate-400 dark:text-slate-450 font-display">{schoolName}</h4>
          <h2 className="text-lg md:text-2xl font-black text-slate-850 dark:text-slate-100 font-display">BÁO CÁO ĐÁNH GIÁ CHẤT LƯỢNG MÔN TIN HỌC</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lớp học: <span className="font-bold text-slate-800 dark:text-slate-200">{targetClass?.name || 'Toàn trường'}</span> · Kỳ báo cáo: <span className="font-bold">{selectedSemester}</span> · Sĩ số: <span className="font-bold">{classStudents.length} học sinh</span>
          </p>
        </div>

        {totalAssessmentsCount === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
            <Info className="w-8 h-8 text-slate-300" />
            <p className="text-sm font-semibold">Chưa có dữ liệu đánh giá học tập trong hệ thống</p>
            <p className="text-xs">Vui lòng quay lại mục "Đánh giá buổi học" để tạo tiết học đầu tiên.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left box: Native SVG distribution pie/donut chart */}
            <div className="p-5 bg-slate-50 dark:bg-slate-750/30 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex flex-col items-center justify-center space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                <BarChart2 className="w-4.5 h-4.5 text-blue-500" /> Phân bổ kết quả hoàn thành bài học
              </h3>

              {/* Pie/Donut SVG representation */}
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Outer circle track */}
                  <circle cx="50" cy="50" r="40" fill="transparent" className="stroke-slate-200/50 dark:stroke-slate-700" strokeWidth="12" />
                  
                  {/* Excellent segment */}
                  {excellentRate > 0 && (
                    <circle cx="50" cy="50" r="40" fill="transparent" className="stroke-emerald-500" strokeWidth="12"
                      strokeDasharray={`${excellentRate * 2.51} 251`} strokeDashoffset={0} />
                  )}

                  {/* Good Segment */}
                  {goodRate > 0 && (
                    <circle cx="50" cy="50" r="40" fill="transparent" className="stroke-blue-500" strokeWidth="12"
                      strokeDasharray={`${goodRate * 2.51} 251`} strokeDashoffset={`-${excellentRate * 2.51}`} />
                  )}

                  {/* Incomplete Segment */}
                  {incompleteRate > 0 && (
                    <circle cx="50" cy="50" r="40" fill="transparent" className="stroke-rose-500" strokeWidth="12"
                      strokeDasharray={`${incompleteRate * 2.51} 251`} strokeDashoffset={`-${(excellentRate + goodRate) * 2.51}`} />
                  )}
                </svg>

                {/* Donut hole content */}
                <div className="absolute text-center">
                  <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{excellentRate + goodRate}%</span>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Tỷ lệ đạt</p>
                </div>
              </div>

              {/* Legend list */}
              <div className="w-full text-xs space-y-1.5 text-slate-600 dark:text-slate-350">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 rounded bg-emerald-500"></span> Hoàn thành tốt</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{excellentRate}% ({excellentCount} lượt)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 rounded bg-blue-500"></span> Hoàn thành</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{goodRate}% ({goodCount} lượt)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 rounded bg-rose-500"></span> Chưa hoàn thành</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{incompleteRate}% ({incompleteCount} lượt)</span>
                </div>
              </div>
            </div>

            {/* Right box: Progress and specific categories */}
            <div className="p-5 bg-slate-50 dark:bg-slate-750/30 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-5 flex flex-col justify-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Các tiêu chuẩn phát triển</h3>
              
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  <span>😊 Thái độ tích cực hoạt bát</span>
                  <span>{positiveAttitudeRate}% tích cực</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${positiveAttitudeRate}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  <span>💻 Kỹ năng thao tác chuột & bàn phím khá</span>
                  <span>{skilledRate}% thành thạo</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${skilledRate}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  <span>🤝 Hợp tác chia sẻ thiết bị thực hành</span>
                  <span>{coopRate}% cộng tác tốt</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${coopRate}%` }}></div>
                </div>
              </div>

              <div className="p-3 bg-blue-500/5 text-blue-800 dark:text-blue-300 text-xs rounded-xl flex gap-2 border border-blue-500/10 items-start">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                <p className="leading-relaxed">
                  Nhận xét chung: Cả lớp học có thái độ tiếp thu nhanh, kỹ năng nhấp chuột chuẩn xác, đặc biệt là nhóm các em Khối 3. Khối 4 và 5 cần nâng cao khả năng soạn thảo văn bản.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
