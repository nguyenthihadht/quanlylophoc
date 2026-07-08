/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Search, Award, Sparkles, BookOpen, Clock, Heart, Edit2, Check, RefreshCw, AlertCircle, Calendar, Trash2 } from 'lucide-react';
import { Class, Student, Assessment, Comment, Grade } from '../types';

interface StudentPortfolioProps {
  students: Student[];
  classes: Class[];
  grades: Grade[];
  assessments: Assessment[];
  comments: Comment[];
  onGenerateAIComment: (studentId: string) => Promise<string>;
  onAddComment: (studentId: string, content: string, type: 'AI' | 'Thủ công') => void;
  onDeleteComment: (id: string) => void;
}

export function StudentPortfolio({
  students,
  classes,
  grades,
  assessments,
  comments,
  onGenerateAIComment,
  onAddComment,
  onDeleteComment
}: StudentPortfolioProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(students[0]?.id || null);

  // AI Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGeneratedText, setAiGeneratedText] = useState('');
  const [errorText, setErrorText] = useState('');

  // Manual comments state
  const [manualText, setManualText] = useState('');

  // Selected Student calculations
  const currentStudent = students.find(s => s.id === selectedStudentId);
  const studentClass = currentStudent ? classes.find(c => c.id === currentStudent.classId) : null;
  const studentGrade = studentClass ? grades.find(g => g.id === studentClass.gradeId) : null;

  const studentAssessments = currentStudent 
    ? assessments.filter(a => a.studentId === currentStudent.id) 
    : [];
  
  const studentComments = currentStudent 
    ? comments.filter(c => c.studentId === currentStudent.id) 
    : [];

  // Metrics
  const totalLessonsCount = studentAssessments.length;
  const excellentCount = studentAssessments.filter(a => a.completion === 'Hoàn thành tốt').length;
  const goodCount = studentAssessments.filter(a => a.completion === 'Hoàn thành').length;
  const incompleteCount = studentAssessments.filter(a => a.completion === 'Chưa hoàn thành').length;

  const completionRate = totalLessonsCount > 0 
    ? Math.round(((excellentCount + goodCount) / totalLessonsCount) * 100) 
    : 100;

  // Most common attributes
  const getMostFrequent = (arr: string[]) => {
    if (arr.length === 0) return '-';
    const counts: Record<string, number> = {};
    arr.forEach(val => counts[val] = (counts[val] || 0) + 1);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  };

  const commonAttitude = getMostFrequent(studentAssessments.map(a => a.attitude));
  const commonSkill = getMostFrequent(studentAssessments.map(a => a.skill));
  const commonCooperation = getMostFrequent(studentAssessments.map(a => a.cooperation));

  // Trigger Gemini comment composer
  const handleTriggerAIComment = async () => {
    if (!selectedStudentId) return;
    setIsGenerating(true);
    setErrorText('');
    setAiGeneratedText('');
    
    try {
      const remark = await onGenerateAIComment(selectedStudentId);
      setAiGeneratedText(remark);
    } catch (err: any) {
      setErrorText('Tính năng AI tạm thời không phản hồi. Vui lòng thử lại sau.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAIComment = () => {
    if (!selectedStudentId || !aiGeneratedText.trim()) return;
    onAddComment(selectedStudentId, aiGeneratedText.trim(), 'AI');
    setAiGeneratedText('');
  };

  const handleSaveManualComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !manualText.trim()) return;
    onAddComment(selectedStudentId, manualText.trim(), 'Thủ công');
    setManualText('');
  };

  // Student search filtered
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="student-portfolio-container" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* 1. Left Sidebar: Student Selection list */}
      <div id="portfolio-roster" className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs lg:col-span-1 h-max space-y-4 vibrant-card">
        <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm font-display">Danh Sách Học Sinh</h3>
        
        {/* Quick Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã hoặc tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none"
          />
        </div>

        {/* Scrollable List */}
        <div className="max-h-[50vh] lg:max-h-[70vh] overflow-y-auto space-y-1.5 pr-1">
          {filteredStudents.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">Không tìm thấy học sinh</p>
          ) : (
            filteredStudents.map((student) => {
              const active = student.id === selectedStudentId;
              const sClass = classes.find(c => c.id === student.classId);
              return (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    setAiGeneratedText('');
                    setErrorText('');
                  }}
                  className={`w-full p-2.5 rounded-xl text-left transition-all border flex items-center gap-3 cursor-pointer ${
                    active 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                      : 'border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate">{student.name}</p>
                    <p className={`text-[10px] mt-0.5 ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                      Lớp {sClass?.name || 'Chưa xếp'} · {student.studentId}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Main Area: Portfolio Details */}
      <div id="portfolio-core" className="lg:col-span-3 space-y-6">
        
        {currentStudent ? (
          <>
            {/* Student Info Hero card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 vibrant-card">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-black rounded-2xl flex items-center justify-center text-xl shadow-sm uppercase font-display">
                  {currentStudent.name.slice(-2)}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-display">{currentStudent.name}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Mã học sinh: {currentStudent.studentId}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      Lớp: {studentClass?.name || 'Không rõ'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                      Khối: {studentGrade?.name || 'Không rõ'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      Sinh nhật: {currentStudent.dob}
                    </span>
                  </div>
                </div>
              </div>

              {/* Score / Completion Metrics */}
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle cx="32" cy="32" r="28" className="stroke-slate-100 dark:stroke-slate-750" strokeWidth="4" fill="none" />
                      <circle cx="32" cy="32" r="28" className="stroke-blue-500" strokeWidth="4" fill="none" 
                        strokeDasharray={176} strokeDashoffset={176 - (176 * completionRate) / 100} />
                    </svg>
                    <span className="absolute text-sm font-black text-slate-850 dark:text-slate-100">{completionRate}%</span>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mt-1">Hoàn thành</p>
                </div>

                <div className="border-l border-slate-100 dark:border-slate-700 pl-5 space-y-1 text-sm text-slate-600 dark:text-slate-350">
                  <p>👍 Tốt: <span className="font-bold text-slate-800 dark:text-slate-200">{excellentCount} lượt</span></p>
                  <p>✅ Đạt: <span className="font-bold text-slate-800 dark:text-slate-200">{goodCount} lượt</span></p>
                  <p>⚠️ Cố gắng: <span className="font-bold text-slate-800 dark:text-slate-200">{incompleteCount} lượt</span></p>
                </div>
              </div>
            </div>

            {/* AI Report Remark Generator Box */}
            <div className="bg-gradient-to-r from-blue-500/5 to-indigo-500/5 dark:from-slate-800 dark:to-slate-800 p-6 rounded-2xl border border-blue-100/50 dark:border-slate-700 shadow-xs space-y-4 vibrant-card ai-glow">
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-base font-display">
                    <Sparkles className="w-5 h-5 text-blue-500" /> ✨ Tạo Nhận Xét Cuối Kỳ Bằng Gemini AI
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    AI sẽ tổng hợp toàn bộ {totalLessonsCount} buổi đánh giá và ghi chú cá nhân để viết nhận xét cực kỳ khách quan.
                  </p>
                </div>

                <button
                  onClick={handleTriggerAIComment}
                  disabled={isGenerating || totalLessonsCount === 0}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Đang nhận xét...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Sinh nhận xét AI
                    </>
                  )}
                </button>
              </div>

              {/* Show error */}
              {errorText && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" /> {errorText}
                </div>
              )}

              {/* Show loading placeholder skeleton */}
              {isGenerating && (
                <div className="space-y-2.5 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-5/6"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2"></div>
                </div>
              )}

              {/* Show resulting editor text */}
              {aiGeneratedText && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Xem trước & Sửa nhận xét từ AI:</label>
                  <textarea
                    value={aiGeneratedText}
                    onChange={(e) => setAiGeneratedText(e.target.value)}
                    className="w-full h-24 p-3 border border-blue-200 bg-white dark:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10"
                  ></textarea>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setAiGeneratedText('')}
                      className="px-3.5 py-1.5 border border-slate-250 text-xs rounded-lg font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Bỏ qua
                    </button>
                    <button
                      onClick={handleSaveAIComment}
                      className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Lưu vào Sổ nhận xét học kỳ
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom 2 blocks: Comments timeline and Assessment Logs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left block: Report card remarks history */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs space-y-4 vibrant-card">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5 font-display">
                  <Award className="w-4.5 h-4.5 text-blue-500" /> Sổ Nhận Xét Học Kỳ
                </h3>

                {/* Add custom Manual remark */}
                <form onSubmit={handleSaveManualComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Viết nhận xét thủ công..."
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-slate-100 outline-none"
                    required
                  />
                  <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer">Lưu</button>
                </form>

                {studentComments.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">Chưa ghi nhận đánh giá học bạ nào.</p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {[...studentComments].reverse().map((c) => (
                      <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-750/50 rounded-xl border border-slate-100 dark:border-slate-700 space-y-1.5 relative group">
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span className={`px-2 py-0.5 rounded font-bold ${c.type === 'AI' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-slate-100 text-slate-700'}`}>
                            {c.type === 'AI' ? '✨ Nhận xét bằng AI' : 'Thủ công'}
                          </span>
                          <span className="font-mono">{c.date}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                          {c.content}
                        </p>
                        <button
                          onClick={() => onDeleteComment(c.id)}
                          className="absolute right-2 top-2 p-1 text-slate-400 hover:text-rose-500 rounded hidden group-hover:block transition-all cursor-pointer"
                          title="Xóa nhận xét"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right block: Assessment history timeline log */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                  <Clock className="w-4.5 h-4.5 text-blue-500" /> Nhật Ký Đánh Giá Buổi Học
                </h3>

                {studentAssessments.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">Chưa có kết quả đánh giá nào.</p>
                ) : (
                  <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1.5 timeline-list pl-1.5">
                    {[...studentAssessments].reverse().map((a, idx) => (
                      <div key={a.id} className="relative pl-4 border-l-2 border-blue-200 dark:border-slate-700 pb-3 space-y-1 last:pb-0">
                        {/* Circle bullet */}
                        <div className="absolute -left-[6px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                        
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-slate-400 font-mono">{a.date}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            a.completion === 'Hoàn thành tốt' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' :
                            a.completion === 'Hoàn thành' ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/20' :
                            'bg-amber-50 text-amber-800'
                          }`}>
                            {a.completion}
                          </span>
                        </div>
                        
                        {/* Attributes inline */}
                        <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          <span className="bg-slate-100 dark:bg-slate-750 px-1.5 py-0.5 rounded">😊 Thái độ: {a.attitude}</span>
                          <span className="bg-slate-100 dark:bg-slate-750 px-1.5 py-0.5 rounded">💻 Kỹ năng: {a.skill}</span>
                          <span className="bg-slate-100 dark:bg-slate-750 px-1.5 py-0.5 rounded">🤝 Hợp tác: {a.cooperation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 text-slate-400">
            Chưa có học sinh nào được lưu hành trong danh sách. Hãy thêm học sinh trước.
          </div>
        )}

      </div>

    </div>
  );
}
