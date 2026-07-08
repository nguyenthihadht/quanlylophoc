/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Users, School, BookOpen, CheckCircle, PlusCircle, Award, Calendar, ArrowRight } from 'lucide-react';
import { SchoolYear, Class, Student, Lesson, Assessment } from '../types';

interface DashboardProps {
  schoolYears: SchoolYear[];
  classes: Class[];
  students: Student[];
  lessons: Lesson[];
  assessments: Assessment[];
  onNavigate: (tab: string) => void;
  onSelectClassForLesson: (classId: string) => void;
}

export function Dashboard({
  schoolYears,
  classes,
  students,
  lessons,
  assessments,
  onNavigate,
  onSelectClassForLesson
}: DashboardProps) {
  // Current year
  const currentYear = schoolYears.find(y => y.isCurrent)?.name || 'Chưa thiết lập';

  // Metrics
  const totalStudents = students.length;
  const totalClasses = classes.length;
  const totalLessons = lessons.length;

  // Completion Rate (Hoàn thành tốt + Hoàn thành) / Tổng đánh giá
  const totalAssessmentsCount = assessments.length;
  const completedAssessmentsCount = assessments.filter(
    a => a.completion === 'Hoàn thành tốt' || a.completion === 'Hoàn thành'
  ).length;
  const completionRate = totalAssessmentsCount > 0 
    ? Math.round((completedAssessmentsCount / totalAssessmentsCount) * 100) 
    : 100;

  // Level percentages
  const excellentCount = assessments.filter(a => a.completion === 'Hoàn thành tốt').length;
  const goodCount = assessments.filter(a => a.completion === 'Hoàn thành').length;
  const needsImprovementCount = assessments.filter(a => a.completion === 'Chưa hoàn thành').length;

  const excellentRate = totalAssessmentsCount > 0 ? Math.round((excellentCount / totalAssessmentsCount) * 100) : 0;
  const goodRate = totalAssessmentsCount > 0 ? Math.round((goodCount / totalAssessmentsCount) * 100) : 0;
  const badRate = totalAssessmentsCount > 0 ? Math.round((needsImprovementCount / totalAssessmentsCount) * 100) : 0;

  // Active or recent classes list (last 3 classes assessed)
  const recentLessons = [...lessons].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <div id="dashboard-container" className="space-y-6">
      {/* Top Banner */}
      <div id="dashboard-banner" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-850 p-6 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 id="banner-title" className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-display">
            Chào mừng Thầy Cô quay trở lại! 👋
          </h2>
          <p id="banner-subtitle" className="text-slate-600 dark:text-slate-350 mt-1 text-sm md:text-base">
            Hệ thống quản lý học tập & Đánh giá nhanh học sinh Tiểu học môn Tin học.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
              <Calendar className="w-3.5 h-3.5" /> Năm học hiện tại: {currentYear}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              ● Đồng bộ đám mây hoạt động
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            id="btn-quick-assess"
            onClick={() => onNavigate('assess')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all duration-150 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Đánh giá tiết mới
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div id="dashboard-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div id="kpi-students" className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex items-center gap-4 vibrant-card">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Tổng Học Sinh</p>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 font-display">{totalStudents}</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div id="kpi-classes" className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex items-center gap-4 vibrant-card">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <School className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Số Lớp Học</p>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 font-display">{totalClasses}</h3>
          </div>
        </div>

        {/* Card 3 */}
        <div id="kpi-lessons" className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex items-center gap-4 vibrant-card">
          <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Số Buổi Đã Dạy</p>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 font-display">{totalLessons}</h3>
          </div>
        </div>

        {/* Card 4 */}
        <div id="kpi-completion" className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs flex items-center gap-4 vibrant-card">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Tỷ Lệ Đạt Đạt</p>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 font-display">{completionRate}%</h3>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div id="dashboard-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Overview Chart & shortcuts */}
        <div id="dashboard-col-left" className="lg:col-span-2 space-y-6">
          {/* Progress Breakdown bar */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs vibrant-card">
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 font-display">
              <Award className="w-5 h-5 text-amber-500" /> Phân bổ học tập & Đánh giá Học sinh
            </h3>
            
            {totalAssessmentsCount === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                Chưa có dữ liệu đánh giá nào. Hãy ghi nhận buổi học đầu tiên!
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> ✅ Hoàn thành tốt</span>
                    <span>{excellentRate}% ({excellentCount} lượt)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${excellentRate}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"></span> ✅ Hoàn thành</span>
                    <span>{goodRate}% ({goodCount} lượt)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${goodRate}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500"></span> ⚠️ Chưa hoàn thành</span>
                    <span>{badRate}% ({needsImprovementCount} lượt)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-2.5 rounded-full" style={{ width: `${badRate}%` }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick shortcuts */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs vibrant-card">
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-4 font-display">Các lối tắt tiện ích</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => onNavigate('students')}
                className="p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-750 dark:hover:bg-slate-700 rounded-xl text-left border border-slate-150 dark:border-slate-750 transition-all cursor-pointer shadow-xs hover:shadow-sm"
              >
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 font-display">Nhập học sinh</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Import nhanh danh sách từ tệp Excel / CSV.</p>
              </button>
              <button
                onClick={() => onNavigate('portfolio')}
                className="p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-750 dark:hover:bg-slate-700 rounded-xl text-left border border-slate-150 dark:border-slate-750 transition-all cursor-pointer shadow-xs hover:shadow-sm"
              >
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 font-display">AI nhận xét</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tự động viết nhận xét học bạ thông minh.</p>
              </button>
              <button
                onClick={() => onNavigate('stats')}
                className="p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-750 dark:hover:bg-slate-700 rounded-xl text-left border border-slate-150 dark:border-slate-750 transition-all cursor-pointer shadow-xs hover:shadow-sm"
              >
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 font-display">Xuất Báo Cáo</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tải học lịch sử, xuất báo cáo học kỳ.</p>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Classes list and recent logs */}
        <div id="dashboard-col-right" className="space-y-6">
          {/* Recent Lesson Logs */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs vibrant-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-display">Buổi dạy gần đây</h3>
              <button 
                onClick={() => onNavigate('diaries')} 
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer font-display"
              >
                Tất cả <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentLessons.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
                Chưa ghi nhận nhật ký buổi dạy nào.
              </div>
            ) : (
              <div className="space-y-4">
                {recentLessons.map((lesson) => {
                  const targetClass = classes.find(c => c.id === lesson.classId);
                  return (
                    <div key={lesson.id} className="p-3.5 bg-slate-50 dark:bg-slate-750/55 rounded-xl border border-slate-100 dark:border-slate-700/60">
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                          Lớp {targetClass?.name || 'Chưa rõ'}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-450 font-mono">{lesson.date}</span>
                      </div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mt-2 line-clamp-1">
                        {lesson.lessonName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {lesson.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Teacher Info Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute right-[-10px] bottom-[-20px] opacity-10">
              <School className="w-40 h-40" />
            </div>
            <h4 className="text-xs uppercase tracking-widest font-semibold text-blue-100">Giáo viên phụ trách</h4>
            <h3 className="text-xl font-bold mt-1">Cô Nguyễn Thị Hà</h3>
            <p className="text-sm text-blue-100/80 mt-1">Bộ môn: Tin học cấp Tiểu học</p>
            <div className="border-t border-white/20 mt-4 pt-4 flex justify-between text-xs text-blue-50">
              <div>
                <p className="opacity-70">Lớp giảng dạy</p>
                <p className="font-bold text-sm mt-0.5">{totalClasses}</p>
              </div>
              <div>
                <p className="opacity-70">Sổ điểm hoạt động</p>
                <p className="font-bold text-sm mt-0.5">Ổn định</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
