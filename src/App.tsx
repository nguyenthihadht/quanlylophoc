/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, School, BookOpen, CheckCircle, PlusCircle, Award, Calendar, 
  Settings, LogOut, Menu, X, Sun, Moon, Sparkles, LogIn, ChevronRight, Home, RefreshCw 
} from 'lucide-react';
import { ClassTrackerAPI } from './lib/api';
import { SchoolYear, Grade, Class, Student, Lesson, Assessment, Comment, AppSettings } from './types';

// Import our subcomponents
import { Dashboard } from './components/Dashboard';
import { SchoolManager } from './components/SchoolManager';
import { StudentManager } from './components/StudentManager';
import { LessonEvaluator } from './components/LessonEvaluator';
import { LessonDiaries } from './components/LessonDiaries';
import { StudentPortfolio } from './components/StudentPortfolio';
import { StatsReports } from './components/StatsReports';
import { BackupSettings } from './components/BackupSettings';

type Tab = 'dashboard' | 'school' | 'students' | 'assess' | 'diaries' | 'portfolio' | 'stats' | 'settings';

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Database cache states
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    schoolName: 'Trường Tiểu học Thuận Giao',
    teacherName: 'Cô Nguyễn Thị Hà',
    theme: 'light'
  });

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      await ClassTrackerAPI.init();
      syncLocalStates();
      setIsLoaded(true);

      // Check if user has logged in previously in this browser session
      const sess = sessionStorage.getItem('is_auth_teacher');
      if (sess === 'true') {
        setIsAuthenticated(true);
      }
    }
    loadData();

    // Subscribe to state updates
    const unsubscribe = ClassTrackerAPI.subscribe(() => {
      syncLocalStates();
    });

    return () => unsubscribe();
  }, []);

  const syncLocalStates = () => {
    const state = ClassTrackerAPI.getState();
    setSchoolYears(state.schoolYears || []);
    setGrades(state.grades || []);
    setClasses(state.classes || []);
    setStudents(state.students || []);
    setLessons(state.lessons || []);
    setAssessments(state.assessments || []);
    setComments(state.comments || []);
    setSettings(state.settings || {
      schoolName: 'Trường Tiểu học Thuận Giao',
      teacherName: 'Cô Nguyễn Thị Hà',
      theme: 'light'
    });
  };

  // Google Sign-In Simulator
  const handleGoogleSignIn = () => {
    setIsAuthLoading(true);
    setTimeout(() => {
      setIsAuthenticated(true);
      setIsAuthLoading(false);
      sessionStorage.setItem('is_auth_teacher', 'true');
    }, 1200);
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('is_auth_teacher');
  };

  // CSS Root Class based on light/dark mode settings
  const themeClass = settings?.theme === 'dark' ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800';

  const handleUpdateSettings = (fields: Partial<AppSettings>) => {
    ClassTrackerAPI.updateSettings(fields);
  };

  // Human tab titles
  const getTabTitle = (tab: Tab) => {
    switch(tab) {
      case 'dashboard': return 'Bảng điều khiển';
      case 'school': return 'Năm học & Khối lớp';
      case 'students': return 'Danh sách học sinh';
      case 'assess': return 'Đánh giá buổi học';
      case 'diaries': return 'Nhật ký dạy học';
      case 'portfolio': return 'Hồ sơ học tập học sinh';
      case 'stats': return 'Báo cáo & Thống kê';
      case 'settings': return 'Thiết lập & Sao lưu';
      default: return 'Sổ Liên Lạc';
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Đang khởi tạo hệ thống quản lý học tập...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // GOOGLE AUTHENTICATION PORTAL SCREEN
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${themeClass} bg-slate-50`}>
        <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-3xl border border-slate-150 dark:border-slate-750 p-8 shadow-md space-y-6 text-center">
          <div className="space-y-2">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-bold shadow-md shadow-blue-500/20 font-display">
              T
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight font-display">EduTrack AI</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Hệ thống Đánh giá nhanh Roster học sinh Tiểu học thông minh</p>
          </div>

          <div className="bg-blue-500/5 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-left text-xs leading-relaxed border border-blue-500/10 space-y-1.5">
            <p className="font-bold flex items-center gap-1"><Sparkles className="w-4 h-4 text-amber-500" /> Hệ thống thiết kế riêng cho:</p>
            <p>• Giáo viên giảng dạy nhiều lớp (500 - 1000 học sinh).</p>
            <p>• Đánh giá nhanh chỉ với 1-click thay thế sổ tay ghi chép.</p>
            <p>• Tích hợp trợ lý ảo AI Gemini tự động viết nhận xét học bạ cuối kỳ cá nhân hóa.</p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isAuthLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer text-sm"
          >
            {isAuthLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Đang xác thực tài khoản Google...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Đăng nhập bằng Google
              </>
            )}
          </button>

          <div className="text-[10px] text-slate-400 space-y-0.5">
            <p>Tài khoản hiện hữu: nguyenthihadht@gmail.com</p>
            <p>© 2026 Học Bạ Tin Học Tiểu Học · Bảo mật & Mã hóa</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${themeClass}`}>
      
      {/* 1. PERSISTENT SIDEBAR - Desktop */}
      <aside className={`w-64 bg-white dark:bg-slate-800 border-r border-slate-150 dark:border-slate-700 flex flex-col justify-between fixed lg:static inset-y-0 left-0 z-40 transition-transform duration-200 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          {/* Sidebar Brand logo */}
          <div className="h-16 px-6 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm font-display">
                T
              </div>
              <span className="font-extrabold text-base text-blue-600 dark:text-blue-450 tracking-tight font-display">EduTrack AI</span>
            </div>
            <button className="lg:hidden text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
            >
              <Home className="w-4 h-4" /> Bảng điều khiển
            </button>

            <button
              onClick={() => { setActiveTab('school'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'school' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
            >
              <School className="w-4 h-4" /> Năm học & Khối lớp
            </button>

            <button
              onClick={() => { setActiveTab('students'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'students' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
            >
              <Users className="w-4 h-4" /> Danh sách học sinh
            </button>

            <button
              onClick={() => { setActiveTab('assess'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'assess' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
            >
              <PlusCircle className="w-4 h-4" /> Đánh giá buổi học
            </button>

            <button
              onClick={() => { setActiveTab('diaries'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'diaries' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
            >
              <BookOpen className="w-4 h-4" /> Nhật ký dạy học
            </button>

            <button
              onClick={() => { setActiveTab('portfolio'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'portfolio' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
            >
              <Award className="w-4 h-4" /> Hồ sơ học tập học sinh
            </button>

            <button
              onClick={() => { setActiveTab('stats'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
            >
              <CheckCircle className="w-4 h-4" /> Báo cáo & Thống kê
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
            >
              <Settings className="w-4 h-4" /> Thiết lập hệ thống
            </button>
          </nav>
        </div>

        {/* Sidebar Footer (Teacher Profile) */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 dark:bg-slate-700 text-blue-700 dark:text-blue-300 font-extrabold text-sm rounded-lg flex items-center justify-center uppercase">
              {settings?.teacherName?.slice(-2) || 'GV'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs truncate text-slate-800 dark:text-slate-200">{settings?.teacherName}</p>
              <p className="text-[10px] text-slate-400 truncate">nguyenthihadht@gmail.com</p>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 justify-center py-2 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 hover:text-rose-600 dark:text-slate-400 rounded-xl text-xs font-bold cursor-pointer transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top bar header */}
        <header className="h-16 px-6 bg-white dark:bg-slate-800 border-b border-slate-150 dark:border-slate-700/60 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-500 hover:text-slate-700 cursor-pointer" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Breadcrumbs navigation */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <span className="text-slate-500 hover:underline cursor-pointer flex items-center gap-1" onClick={() => setActiveTab('dashboard')}><Home className="w-3.5 h-3.5" /> Học bạ</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-800 dark:text-slate-200">{getTabTitle(activeTab)}</span>
            </div>
          </div>

          {/* Quick settings and notification badges */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800 max-w-[200px] truncate" title={settings?.schoolName}>
              🏫 {settings?.schoolName}
            </span>
          </div>
        </header>

        {/* Dynamic page content frame */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard 
              schoolYears={schoolYears}
              classes={classes}
              students={students}
              lessons={lessons}
              assessments={assessments}
              onNavigate={(tab) => setActiveTab(tab as Tab)}
              onSelectClassForLesson={(cId) => {
                // Instantly navigate to quick evaluations for that class
                setActiveTab('assess');
              }}
            />
          )}

          {activeTab === 'school' && (
            <SchoolManager 
              schoolYears={schoolYears}
              grades={grades}
              classes={classes}
              onAddYear={(name) => ClassTrackerAPI.addSchoolYear(name)}
              onUpdateYear={(id, name) => ClassTrackerAPI.updateSchoolYear(id, name)}
              onDeleteYear={(id) => ClassTrackerAPI.deleteSchoolYear(id)}
              onSetCurrentYear={(id) => ClassTrackerAPI.setCurrentSchoolYear(id)}
              onAddGrade={(name) => ClassTrackerAPI.addGrade(name)}
              onUpdateGrade={(id, name) => ClassTrackerAPI.updateGrade(id, name)}
              onDeleteGrade={(id) => ClassTrackerAPI.deleteGrade(id)}
              onAddClass={(name, gId, teacher) => ClassTrackerAPI.addClass(name, gId, teacher)}
              onUpdateClass={(id, name, gId, teacher) => ClassTrackerAPI.updateClass(id, name, gId, teacher)}
              onDeleteClass={(id) => ClassTrackerAPI.deleteClass(id)}
            />
          )}

          {activeTab === 'students' && (
            <StudentManager 
              classes={classes}
              grades={grades}
              students={students}
              onAddStudent={(s) => ClassTrackerAPI.addStudent(s)}
              onUpdateStudent={(id, fields) => ClassTrackerAPI.updateStudent(id, fields)}
              onDeleteStudent={(id) => ClassTrackerAPI.deleteStudent(id)}
              onImportCSV={(csv, classId) => ClassTrackerAPI.parseCSVAndImport(csv, classId)}
            />
          )}

          {activeTab === 'assess' && (
            <LessonEvaluator 
              classes={classes}
              students={students}
              lessons={lessons}
              assessments={assessments}
              onSaveAssessments={(lId, date, list) => ClassTrackerAPI.saveAssessments(lId, date, list)}
              onAddLesson={(lesson) => ClassTrackerAPI.addLesson(lesson)}
            />
          )}

          {activeTab === 'diaries' && (
            <LessonDiaries 
              classes={classes}
              grades={grades}
              lessons={lessons}
              students={students}
              assessments={assessments}
              onDeleteLesson={(id) => ClassTrackerAPI.deleteLesson(id)}
              onUpdateLesson={(id, name, content, date) => ClassTrackerAPI.updateLesson(id, name, content, date)}
            />
          )}

          {activeTab === 'portfolio' && (
            <StudentPortfolio 
              students={students}
              classes={classes}
              grades={grades}
              assessments={assessments}
              comments={comments}
              onGenerateAIComment={(sId) => ClassTrackerAPI.generateAIComment(sId)}
              onAddComment={(sId, text, type) => ClassTrackerAPI.addComment(sId, text, type)}
              onDeleteComment={(id) => ClassTrackerAPI.deleteComment(id)}
            />
          )}

          {activeTab === 'stats' && (
            <StatsReports 
              schoolYears={schoolYears}
              grades={grades}
              classes={classes}
              students={students}
              assessments={assessments}
              schoolName={settings.schoolName}
            />
          )}

          {activeTab === 'settings' && (
            <BackupSettings 
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onExportBackup={() => ClassTrackerAPI.exportBackup()}
              onImportBackup={(json) => ClassTrackerAPI.importBackup(json)}
            />
          )}
        </main>
      </div>

    </div>
  );
}
