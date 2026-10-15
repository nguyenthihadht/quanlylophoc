/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Users, School, BookOpen, CheckCircle, PlusCircle, Award, Calendar, 
  ArrowRight, Camera, Image as ImageIcon, ZoomIn, X, Trash2, Sparkles, 
  FileSpreadsheet, Upload, Check
} from 'lucide-react';
import { AppSettings, SchoolYear, Class, Student, Lesson, Assessment } from '../types';

interface DashboardProps {
  schoolYears: SchoolYear[];
  classes: Class[];
  students: Student[];
  lessons: Lesson[];
  assessments: Assessment[];
  readOnly?: boolean;
  settings?: AppSettings;
  onUpdateSettings?: (settings: Partial<AppSettings>) => void;
  onNavigate: (tab: string) => void;
  onSelectClassForLesson: (classId: string) => void;
}

export function Dashboard({
  schoolYears,
  classes,
  students,
  lessons,
  assessments,
  readOnly = false,
  settings,
  onUpdateSettings,
  onNavigate,
  onSelectClassForLesson
}: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [photoToast, setPhotoToast] = useState<string | null>(null);

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

  // Handle local image file upload (e.g. hình.jpg)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress & scale to fit well within local storage while maintaining sharpness
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          onUpdateSettings?.({ teacherPhoto: dataUrl });
          setPhotoToast('Đã chèn và lưu hình ảnh Cô giáo và Học sinh thành công!');
          setTimeout(() => setPhotoToast(null), 3500);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Thầy/Cô có muốn đặt lại hình ảnh về tranh minh họa mặc định không?')) {
      onUpdateSettings?.({ teacherPhoto: '' });
      setPhotoToast('Đã chuyển về hình ảnh minh họa mặc định.');
      setTimeout(() => setPhotoToast(null), 3500);
    }
  };

  return (
    <div id="dashboard-container" className="space-y-6">
      {/* Toast Notification */}
      {photoToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-100" />
          <span>{photoToast}</span>
        </div>
      )}

      {/* Read-Only Notice Banner */}
      {readOnly && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">👁️</span>
            <div>
              <p className="font-bold">Chào mừng Thầy/Cô Đồng nghiệp tham khảo (Chế độ Chỉ Xem)</p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Bạn có thể tự do xem toàn bộ số liệu tổng quan, cơ cấu học sinh các lớp, phân phối chương trình và nhật ký giảng dạy. Dữ liệu gốc đã được bảo vệ.</p>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-lg font-bold text-[10px] uppercase tracking-wider">Chỉ xem</span>
        </div>
      )}

      {/* Top Banner with Teacher & Students Photo Section ("Chỗ này") */}
      <div 
        id="dashboard-banner" 
        className="bg-gradient-to-br from-blue-50/90 via-indigo-50/70 to-sky-50/80 dark:from-slate-800 dark:via-slate-800/95 dark:to-slate-850 p-6 rounded-3xl border border-blue-100/90 dark:border-slate-700/80 shadow-sm relative overflow-hidden"
      >
        {/* Decorative background ambient circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          {/* Left Column: Greeting, School & Teacher Info */}
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-bold border border-blue-200/60 dark:border-blue-800/60">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{settings?.schoolName || 'Trường Tiểu học Thuận Giao'} · Môn Tin học</span>
            </div>

            <div>
              <h2 id="banner-title" className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-850 dark:text-white font-display tracking-tight leading-snug">
                Chào mừng Cô <span className="text-blue-600 dark:text-sky-400">{settings?.teacherName || 'Nguyễn Thị Hà'}</span> quay trở lại! 👋
              </h2>
              <p id="banner-subtitle" className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
                Hệ thống quản lý học tập, sổ điểm & nhận xét tự động cho học sinh Tiểu học môn Tin học.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 dark:bg-slate-700/80 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-slate-650 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" /> Năm học: {currentYear}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Đồng bộ đám mây hoạt động
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                <span>👩‍🏫</span> {settings?.teacherName || 'Cô Nguyễn Thị Hà'}
              </span>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                id="btn-quick-assess"
                onClick={() => onNavigate('assess')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.01]"
              >
                <PlusCircle className="w-4 h-4" /> Đánh giá tiết mới
              </button>
              
              <button
                onClick={() => onNavigate('scores')}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-800 dark:text-white border border-slate-250 dark:border-slate-600 font-bold text-xs sm:text-sm rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Ghi điểm & nhận xét
              </button>

              <button
                onClick={() => onNavigate('wheel')}
                className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" /> Vòng xoay kỳ diệu
              </button>
            </div>
          </div>

          {/* Right Column: Teacher & Students Photo Showcase Card ("Chỗ này") */}
          <div className="w-full lg:w-96 shrink-0">
            <div className="bg-white dark:bg-slate-850 rounded-2xl p-3 border-2 border-white dark:border-slate-700/80 shadow-md hover:shadow-lg transition-all relative group">
              
              {/* Photo Display Area */}
              <div 
                className="relative w-full h-48 sm:h-52 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 via-indigo-50 to-amber-50 dark:from-slate-900 dark:to-slate-800 border border-slate-200/80 dark:border-slate-700 cursor-pointer flex items-center justify-center group/img"
                onClick={() => {
                  if (settings?.teacherPhoto) {
                    setIsPhotoZoomed(true);
                  } else if (!readOnly && fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                title={settings?.teacherPhoto ? "Bấm để xem ảnh phóng to" : "Bấm để chọn hình giáo viên và học sinh (hình.jpg)"}
              >
                {settings?.teacherPhoto ? (
                  <>
                    <img 
                      src={settings.teacherPhoto} 
                      alt="Hình ảnh Cô giáo và các học sinh" 
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Hover Overlay Controls */}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPhotoZoomed(true);
                        }}
                        className="p-2 bg-white/90 hover:bg-white text-slate-850 rounded-xl shadow-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-transform hover:scale-110"
                        title="Xem ảnh lớn"
                      >
                        <ZoomIn className="w-4 h-4 text-blue-600" /> Xem lớn
                      </button>
                      
                      {!readOnly && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-transform hover:scale-110"
                            title="Chọn ảnh khác từ máy tính"
                          >
                            <Camera className="w-4 h-4" /> Đổi ảnh
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-transform hover:scale-110"
                            title="Xóa ảnh và về mặc định"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  /* Cheerful, high-fidelity default illustration representing Teacher & Students in Computer Science Class */
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center select-none relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-700 text-white">
                    {/* Background subtle graphics */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-amber-400/20 blur-xl"></div>

                    {/* Cute cartoon avatars representing Teacher & Students */}
                    <div className="flex items-end justify-center gap-1.5 mb-2 relative z-10">
                      {/* Student 1 (Boy) */}
                      <div className="flex flex-col items-center animate-bounce [animation-delay:200ms]">
                        <span className="text-2xl drop-shadow">👦</span>
                        <span className="text-[9px] bg-sky-200 text-sky-900 font-extrabold px-1.5 py-0.2 rounded-full -mt-1 shadow-xs">Học sinh</span>
                      </div>

                      {/* Teacher in center */}
                      <div className="flex flex-col items-center z-10 scale-110">
                        <div className="relative">
                          <span className="text-4xl drop-shadow-md">👩‍🏫</span>
                          <span className="absolute -top-1 -right-1 text-xs">⭐</span>
                        </div>
                        <span className="text-[10px] bg-amber-300 text-amber-950 font-black px-2 py-0.5 rounded-full -mt-1 shadow-sm">Cô Hà GV</span>
                      </div>

                      {/* Student 2 (Girl) */}
                      <div className="flex flex-col items-center animate-bounce [animation-delay:400ms]">
                        <span className="text-2xl drop-shadow">👧</span>
                        <span className="text-[9px] bg-pink-200 text-pink-900 font-extrabold px-1.5 py-0.2 rounded-full -mt-1 shadow-xs">Học sinh</span>
                      </div>

                      {/* Student 3 (Boy) */}
                      <div className="flex flex-col items-center">
                        <span className="text-2xl drop-shadow">🧒</span>
                        <span className="text-[9px] bg-emerald-200 text-emerald-900 font-extrabold px-1.5 py-0.2 rounded-full -mt-1 shadow-xs">Học sinh</span>
                      </div>
                    </div>

                    <div className="relative z-10 space-y-1">
                      <p className="font-black text-xs sm:text-sm text-white drop-shadow-sm flex items-center justify-center gap-1">
                        <span>💻</span> Cô Nguyễn Thị Hà & Học Sinh
                      </p>
                      <p className="text-[10px] text-blue-100 max-w-[240px] mx-auto leading-tight">
                        Phòng học Tin học · Trường Tiểu học Thuận Giao
                      </p>
                    </div>

                    {!readOnly && (
                      <div className="relative z-10 mt-2.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-blue-700 hover:bg-blue-50 text-[11px] font-extrabold rounded-full shadow-md transition-all group-hover:scale-105 cursor-pointer">
                          <Camera className="w-3.5 h-3.5 text-blue-600" /> Chèn hình.jpg từ máy tính
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Floating Badge in Corner */}
                <div className="absolute top-2 left-2 z-10 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-black tracking-wide flex items-center gap-1 shadow-xs">
                    <span>📸</span> {settings?.teacherPhoto ? 'Ảnh kỷ niệm' : 'Khung ảnh Cô trò'}
                  </span>
                </div>
              </div>

              {/* Caption & Quick Controls below image */}
              <div className="pt-2 px-1 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm">❤️</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
                    {settings?.teacherPhoto ? 'Cô Hà cùng các em học sinh' : 'Hình giáo viên và học sinh'}
                  </span>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 text-blue-600 dark:text-sky-400 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer ml-2"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{settings?.teacherPhoto ? 'Đổi hình' : 'Tải hình.jpg'}</span>
                  </button>
                )}
              </div>

              {/* Hidden File Input for Image Selection */}
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handlePhotoUpload}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom Modal for Viewing Teacher & Students Photo in Full Size */}
      {isPhotoZoomed && settings?.teacherPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsPhotoZoomed(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl border border-white/20 relative animate-in zoom-in-95 duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <span className="text-lg">📸</span>
                <div>
                  <h4 className="font-black text-sm text-slate-850 dark:text-white">
                    Hình ảnh Cô giáo Nguyễn Thị Hà và các em học sinh
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Trường Tiểu học Thuận Giao · Môn Tin học
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPhotoZoomed(false);
                      fileInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" /> Thay đổi ảnh
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => setIsPhotoZoomed(false)}
                  className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-all"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div className="p-3 sm:p-5 flex items-center justify-center bg-slate-950/90 max-h-[75vh] overflow-hidden">
              <img 
                src={settings.teacherPhoto} 
                alt="Hình ảnh Cô giáo và học sinh phóng to" 
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-white/10"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Được lưu trữ an toàn trong hệ thống dữ liệu môn Tin học</span>
              <button
                type="button"
                onClick={() => setIsPhotoZoomed(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Số Tiết Đã Đánh Giá</p>
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
                Chưa có dữ liệu đánh giá nào. Hãy ghi nhận tiết học đầu tiên!
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
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-lg">
            <h3 className="text-lg font-extrabold text-white mb-4 font-display">Các lối tắt tiện ích</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => onNavigate('students')}
                className="p-4 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-left border border-slate-700 transition-all cursor-pointer shadow-xs hover:shadow-sm"
              >
                <h4 className="font-bold text-blue-400 text-sm mb-1 font-display">Nhập học sinh</h4>
                <p className="text-xs text-slate-300">Import nhanh danh sách từ tệp Excel / CSV.</p>
              </button>
              <button
                onClick={() => onNavigate('portfolio')}
                className="p-4 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-left border border-slate-700 transition-all cursor-pointer shadow-xs hover:shadow-sm"
              >
                <h4 className="font-bold text-emerald-400 text-sm mb-1 font-display">AI nhận xét</h4>
                <p className="text-xs text-slate-300">Tự động viết nhận xét nhật ký giảng dạy thông minh.</p>
              </button>
              <button
                onClick={() => onNavigate('stats')}
                className="p-4 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-left border border-slate-700 transition-all cursor-pointer shadow-xs hover:shadow-sm"
              >
                <h4 className="font-bold text-amber-400 text-sm mb-1 font-display">Xuất Báo Cáo</h4>
                <p className="text-xs text-slate-300">Tải học lịch sử, xuất báo cáo học kỳ.</p>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Classes list and recent logs */}
        <div id="dashboard-col-right" className="space-y-6">
          {/* Recent Lesson Logs */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs vibrant-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-display">Tiết dạy gần đây</h3>
              <button 
                onClick={() => onNavigate('diaries')} 
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer font-display"
              >
                Tất cả <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentLessons.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
                Chưa ghi nhận nhật ký tiết dạy nào.
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
