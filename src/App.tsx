/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, School, BookOpen, CheckCircle, PlusCircle, Award, Calendar, 
  Settings, LogOut, Menu, X, Sun, Moon, Sparkles, LogIn, ChevronRight, Home, RefreshCw,
  Lock, Unlock, Eye, EyeOff, KeyRound, ShieldCheck, FileSpreadsheet, Check, Copy, Share2, AlertCircle
} from 'lucide-react';
import { ClassTrackerAPI } from './lib/api';
import { SchoolYear, Grade, Class, Student, Lesson, Assessment, Comment, AppSettings, SemesterScore, TimelineWeek } from './types';

// Import our subcomponents
import { Dashboard } from './components/Dashboard';
import { SchoolManager } from './components/SchoolManager';
import { StudentManager } from './components/StudentManager';
import { LessonEvaluator } from './components/LessonEvaluator';
import { LessonDiaries } from './components/LessonDiaries';
import { StudentPortfolio } from './components/StudentPortfolio';
import { StatsReports } from './components/StatsReports';
import { ScoresManager } from './components/ScoresManager';
import { BackupSettings } from './components/BackupSettings';
import TimelineManager from './components/TimelineManager';
import { LuckyWheelTab } from './components/LuckyWheelTab';

type Tab = 'dashboard' | 'school' | 'timeline' | 'students' | 'assess' | 'wheel' | 'diaries' | 'portfolio' | 'stats' | 'scores' | 'settings';
export type UserRole = 'admin' | 'viewer';

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('viewer');
  const [viewerName, setViewerName] = useState<string>('Đồng nghiệp tham khảo');
  const [viewerNameInput, setViewerNameInput] = useState<string>('');
  
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [assessResetKey, setAssessResetKey] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Administrator lock and elevation states
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Quick elevate modal (when viewer wants to log in as admin)
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [modalPasswordInput, setModalPasswordInput] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [modalPasswordError, setModalPasswordError] = useState('');

  // Quick Change Admin Password Modal
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePassOldInput, setChangePassOldInput] = useState('');
  const [changePassNewInput, setChangePassNewInput] = useState('');
  const [changePassConfirmInput, setChangePassConfirmInput] = useState('');
  const [showChangeOldPass, setShowChangeOldPass] = useState(false);
  const [showChangeNewPass, setShowChangeNewPass] = useState(false);
  const [showChangeConfirmPass, setShowChangeConfirmPass] = useState(false);
  const [changePassError, setChangePassError] = useState('');
  const [changePassSuccess, setChangePassSuccess] = useState('');

  // Toast notifications
  const [copyLinkToast, setCopyLinkToast] = useState<string | null>(null);

  // Database cache states
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [scores, setScores] = useState<SemesterScore[]>([]);
  const [timeline, setTimeline] = useState<TimelineWeek[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    schoolName: 'Trường Tiểu học Thuận Giao',
    teacherName: 'Cô Nguyễn Thị Hà',
    theme: 'light',
    adminPassword: '123456', // default password
    requirePassword: true
  });

  // Fetch initial data & check user role / query parameters
  useEffect(() => {
    async function loadData() {
      await ClassTrackerAPI.init();
      syncLocalStates();
      setIsLoaded(true);

      // Check URL parameters for direct link sharing (?role=viewer, ?mode=view, etc.)
      const urlParams = new URLSearchParams(window.location.search);
      const roleParam = urlParams.get('role') || urlParams.get('mode') || urlParams.get('view') || urlParams.get('ref');

      if (roleParam === 'viewer' || roleParam === 'view' || roleParam === 'colleague') {
        setUserRole('viewer');
        setIsAuthenticated(true);
        setIsAdminUnlocked(false);
        sessionStorage.setItem('class_tracker_user_role', 'viewer');
        sessionStorage.setItem('is_auth_teacher', 'true');
        return;
      }

      // Check if user has logged in previously in this browser session
      const storedRole = sessionStorage.getItem('class_tracker_user_role') as UserRole | null;
      const storedViewerName = sessionStorage.getItem('class_tracker_viewer_name');
      if (storedViewerName) setViewerName(storedViewerName);

      if (storedRole === 'viewer') {
        setUserRole('viewer');
        setIsAuthenticated(true);
        setIsAdminUnlocked(false);
      } else if (storedRole === 'admin') {
        const adminSess = sessionStorage.getItem('is_admin_unlocked');
        if (adminSess === 'true') {
          setUserRole('admin');
          setIsAuthenticated(true);
          setIsAdminUnlocked(true);
        }
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
    setScores(ClassTrackerAPI.getScores());
    setTimeline(ClassTrackerAPI.getTimeline());
    setSettings(state.settings || {
      schoolName: 'Trường Tiểu học Thuận Giao',
      teacherName: 'Cô Nguyễn Thị Hà',
      theme: 'light',
      adminPassword: '123456',
      requirePassword: true
    });
  };

  // Role Action: Login as Colleague / Viewer (Chỉ xem)
  const handleColleagueLogin = (customName?: string) => {
    const finalName = customName?.trim() || 'Đồng nghiệp tham khảo';
    setUserRole('viewer');
    setViewerName(finalName);
    setIsAuthenticated(true);
    setIsAdminUnlocked(false);
    sessionStorage.setItem('class_tracker_user_role', 'viewer');
    sessionStorage.setItem('class_tracker_viewer_name', finalName);
    sessionStorage.setItem('is_auth_teacher', 'true');
  };

  // Role Action: Login as Teacher / Administrator (Toàn quyền)
  const handleTeacherAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = settings.adminPassword || '123456';
    if (adminPasswordInput === correctPassword) {
      setUserRole('admin');
      setIsAuthenticated(true);
      setIsAdminUnlocked(true);
      sessionStorage.setItem('class_tracker_user_role', 'admin');
      sessionStorage.setItem('is_admin_unlocked', 'true');
      sessionStorage.setItem('is_auth_teacher', 'true');
      setPasswordError('');
      setAdminPasswordInput('');
    } else {
      setPasswordError('Mật khẩu Quản trị viên không chính xác. Vui lòng kiểm tra lại.');
    }
  };

  // Google Sign-In Simulator (Elevates to Admin with password validation)
  const handleGoogleSignIn = () => {
    setIsAuthLoading(true);
    setTimeout(() => {
      setIsAuthLoading(false);
      setUserRole('admin');
      setIsAuthenticated(true);
      setIsAdminUnlocked(true);
      sessionStorage.setItem('class_tracker_user_role', 'admin');
      sessionStorage.setItem('is_admin_unlocked', 'true');
      sessionStorage.setItem('is_auth_teacher', 'true');
    }, 900);
  };

  // Elevate from Viewer to Admin inside app
  const handleElevateToAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = settings.adminPassword || '123456';
    if (modalPasswordInput === correctPassword) {
      setUserRole('admin');
      setIsAdminUnlocked(true);
      sessionStorage.setItem('class_tracker_user_role', 'admin');
      sessionStorage.setItem('is_admin_unlocked', 'true');
      setShowAdminLoginModal(false);
      setModalPasswordInput('');
      setModalPasswordError('');
      setCopyLinkToast('Đã nâng cấp quyền Quản trị viên thành công! Bạn có đầy đủ quyền chỉnh sửa.');
      setTimeout(() => setCopyLinkToast(null), 3500);
    } else {
      setModalPasswordError('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
    }
  };

  // Administrator Password Change Handler
  const handleChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const currentActual = settings.adminPassword || '123456';
    if (changePassOldInput !== currentActual) {
      setChangePassError('Mật khẩu hiện tại không chính xác. Mật khẩu mặc định ban đầu là 123456.');
      return;
    }
    if (!changePassNewInput.trim()) {
      setChangePassError('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (changePassNewInput.trim().length < 4) {
      setChangePassError('Mật khẩu mới phải có ít nhất 4 ký tự để đảm bảo an toàn.');
      return;
    }
    if (changePassNewInput.trim() !== changePassConfirmInput.trim()) {
      setChangePassError('Xác nhận mật khẩu mới không trùng khớp. Vui lòng kiểm tra lại.');
      return;
    }

    const updatedPass = changePassNewInput.trim();
    ClassTrackerAPI.updateSettings({ adminPassword: updatedPass });
    setSettings(prev => ({ ...prev, adminPassword: updatedPass }));
    setChangePassError('');
    setChangePassSuccess('Đã đổi mật khẩu Quản trị viên thành công! Mật khẩu mới có hiệu lực ngay lập tức.');
    setChangePassOldInput('');
    setChangePassNewInput('');
    setChangePassConfirmInput('');
    setCopyLinkToast('Đã đổi mật khẩu Quản trị viên thành công!');
    setTimeout(() => {
      setChangePassSuccess('');
      setShowChangePasswordModal(false);
      setCopyLinkToast(null);
    }, 2500);
  };

  // Administrator Password Reset to default 123456
  const handleResetToDefaultAdminPassword = () => {
    if (window.confirm('Thầy/Cô có chắc chắn muốn đặt lại mật khẩu Quản trị viên về mặc định (123456)?')) {
      const defaultPass = '123456';
      ClassTrackerAPI.updateSettings({ adminPassword: defaultPass });
      setSettings(prev => ({ ...prev, adminPassword: defaultPass }));
      setChangePassOldInput(defaultPass);
      setChangePassSuccess('Đã đặt lại mật khẩu về mặc định 123456 thành công! Bạn có thể nhập mật khẩu mới ngay.');
      setChangePassError('');
      setTimeout(() => setChangePassSuccess(''), 4000);
    }
  };

  // Copy shareable link for colleagues (?role=viewer)
  const handleCopyColleagueShareLink = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const shareUrl = `${origin}${pathname}?role=viewer`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopyLinkToast('Đã sao chép link tham khảo! Khi đồng nghiệp bấm link này sẽ vào thẳng Chế độ Chỉ Xem và không thể chỉnh sửa dữ liệu của Thầy Cô.');
        setTimeout(() => setCopyLinkToast(null), 5000);
      }).catch(() => {
        prompt('Sao chép đường link này gửi cho đồng nghiệp (Chỉ xem):', shareUrl);
      });
    } else {
      prompt('Sao chép đường link này gửi cho đồng nghiệp (Chỉ xem):', shareUrl);
    }
  };

  // Sign out / switch role
  const handleSignOut = () => {
    setIsAuthenticated(false);
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('class_tracker_user_role');
    sessionStorage.removeItem('class_tracker_viewer_name');
    sessionStorage.removeItem('is_auth_teacher');
    sessionStorage.removeItem('is_admin_unlocked');
    setAdminPasswordInput('');
    setPasswordError('');

    // Remove ?role= from URL without page reload
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('role');
      url.searchParams.delete('mode');
      url.searchParams.delete('view');
      url.searchParams.delete('ref');
      window.history.replaceState({}, document.title, url.pathname);
    } catch (e) {
      // Ignore URL manipulation error
    }
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
      case 'school': return 'Quản lý Lớp học & Khối';
      case 'timeline': return 'Phân phối chương trình';
      case 'students': return 'Danh sách học sinh';
      case 'assess': return 'Đánh giá Tiết học';
      case 'wheel': return 'Vòng Xoay Kỳ Diệu';
      case 'diaries': return 'Nhật ký dạy học';
      case 'portfolio': return 'Hồ sơ học tập học sinh';
      case 'stats': return 'Báo cáo & Thống kê';
      case 'scores': return 'Ghi điểm và nhận xét';
      case 'settings': return 'Thiết lập & Sao lưu';
      default: return 'Sổ Liên Lạc';
    }
  };

  // Dedicated Reusable Modal for Changing Admin Password
  const renderChangePasswordModal = () => {
    if (!showChangePasswordModal) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl font-bold border border-blue-200 dark:border-blue-800">
                <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-850 dark:text-white font-display">
                  ĐỔI MẬT KHẨU QUẢN TRỊ VIÊN
                </h3>
                <p className="text-[11px] text-slate-400">Cập nhật mật khẩu bảo vệ dữ liệu giáo viên</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowChangePasswordModal(false)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleChangeAdminPassword} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350">
                  MẬT KHẨU HIỆN TẠI (MẬT KHẨU CŨ):
                </label>
                <button
                  type="button"
                  onClick={handleResetToDefaultAdminPassword}
                  className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                >
                  Quên mật khẩu? (Về 123456)
                </button>
              </div>
              <div className="relative">
                <input
                  type={showChangeOldPass ? 'text' : 'password'}
                  value={changePassOldInput}
                  onChange={(e) => { setChangePassOldInput(e.target.value); setChangePassError(''); }}
                  placeholder="Mặc định ban đầu là 123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500/20 pr-10 font-mono shadow-xs"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowChangeOldPass(!showChangeOldPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showChangeOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1">
                MẬT KHẨU MỚI:
              </label>
              <div className="relative">
                <input
                  type={showChangeNewPass ? 'text' : 'password'}
                  value={changePassNewInput}
                  onChange={(e) => { setChangePassNewInput(e.target.value); setChangePassError(''); }}
                  placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500/20 pr-10 font-mono shadow-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowChangeNewPass(!showChangeNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showChangeNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1">
                XÁC NHẬN MẬT KHẨU MỚI:
              </label>
              <div className="relative">
                <input
                  type={showChangeConfirmPass ? 'text' : 'password'}
                  value={changePassConfirmInput}
                  onChange={(e) => { setChangePassConfirmInput(e.target.value); setChangePassError(''); }}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500/20 pr-10 font-mono shadow-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowChangeConfirmPass(!showChangeConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showChangeConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {changePassError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{changePassError}</span>
              </div>
            )}

            {changePassSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold">
                <Check className="w-4 h-4 shrink-0" />
                <span>{changePassSuccess}</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Cập Nhật Mật Khẩu
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Đang khởi tạo hệ thống quản lý học tập...</p>
      </div>
    );
  }

  // =========================================================================
  // 1. CỔNG ĐĂNG NHẬP & PHÂN QUYỀN NGƯỜI DÙNG NGAY LÚC ĐĂNG NHẬP (USER ROLE PORTAL)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 md:p-6 ${themeClass} bg-slate-100 dark:bg-slate-950`}>
        <div className="max-w-4xl w-full space-y-6">
          
          {/* Header Branding */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold shadow-2xs border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> TRỢ LÝ SỐ TIN HỌC — Roster Học Sinh & Đánh Giá Tiết Dạy
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-850 dark:text-white tracking-tight font-display">
              CỔNG ĐĂNG NHẬP & PHÂN QUYỀN
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 max-w-xl mx-auto">
              Vui lòng chọn vai trò truy cập phù hợp để hệ thống thiết lập quyền xem hoặc chỉnh sửa tương ứng.
            </p>
          </div>

          {/* 2-Card Dual Role Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* VAI TRÒ 1: ĐỒNG NGHIỆP THAM KHẢO (CHỈ XEM) */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-7 border-2 border-emerald-500/40 hover:border-emerald-500 shadow-md flex flex-col justify-between space-y-5 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-white font-black text-[10px] uppercase px-4 py-1 rounded-bl-2xl tracking-wider">
                Khuyên dùng cho khách
              </div>

              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-sm border border-emerald-200 dark:border-emerald-800">
                  👁️
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    <span>👥 DÀNH CHO ĐỒNG NGHIỆP / BAN GIÁM HIỆU</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight">
                    Đồng nghiệp Tham Khảo (Chỉ Xem)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Dành cho Thầy/Cô đồng nghiệp tham khảo bài giảng, phân phối chương trình, giáo án, sổ điểm và nhận xét học bạ.
                  </p>
                </div>

                {/* Features list */}
                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-2 text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Xem đầy đủ danh sách lớp, học sinh & sĩ số</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Xem phân phối chương trình 35 tuần & nhật ký dạy học</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Trải nghiệm thử Vòng Xoay Kỳ Diệu gọi tên ngẫu nhiên</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 font-semibold pt-1 border-t border-emerald-200/50 dark:border-emerald-800/40">
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>Bảo vệ dữ liệu: Không thể sửa, xóa hay ghi đè nội dung gốc</span>
                  </div>
                </div>

                {/* Optional Colleague Name Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Tên Thầy/Cô (Tùy chọn hiển thị lời chào):
                  </label>
                  <input
                    type="text"
                    value={viewerNameInput}
                    onChange={(e) => setViewerNameInput(e.target.value)}
                    placeholder="Ví dụ: Cô Lan, Thầy Hùng..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => handleColleagueLogin(viewerNameInput)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer text-sm hover:scale-[1.01]"
              >
                <span>🚀 Vào Xem Tham Khảo Ngay (Không Cần Mật Khẩu)</span>
              </button>
            </div>

            {/* VAI TRÒ 2: GIÁO VIÊN QUẢN TRỊ (TOÀN QUYỀN) */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-7 border-2 border-blue-500/40 hover:border-blue-500 shadow-md flex flex-col justify-between space-y-5 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white font-black text-[10px] uppercase px-4 py-1 rounded-bl-2xl tracking-wider">
                Giáo viên phụ trách
              </div>

              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl shadow-sm border border-blue-200 dark:border-blue-800">
                  🔐
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
                    <span>👑 GIÁO VIÊN GIẢNG DẠY CHÍNH</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight">
                    Giáo Viên Quản Trị (Toàn Quyền)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Dành cho Giáo viên bộ môn (Cô Nguyễn Thị Hà) quản lý trực tiếp lớp học, đánh giá tiết dạy, chấm điểm và sao lưu.
                  </p>
                </div>

                {/* Form login with password */}
                <form onSubmit={handleTeacherAdminLogin} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      MẬT KHẨU QUẢN TRỊ VIÊN:
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={adminPasswordInput}
                        onChange={(e) => {
                          setAdminPasswordInput(e.target.value);
                          setPasswordError('');
                        }}
                        placeholder="Nhập mã PIN / Mật khẩu"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500/20 pr-10 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {passwordError && (
                      <p className="text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {passwordError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <KeyRound className="w-4 h-4" /> Đăng Nhập Quản Trị Viên
                  </button>

                  <div className="flex items-center justify-center pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePasswordModal(true);
                        setChangePassError('');
                        setChangePassSuccess('');
                        setChangePassOldInput('');
                        setChangePassNewInput('');
                        setChangePassConfirmInput('');
                      }}
                      className="text-xs text-blue-600 dark:text-sky-400 font-bold hover:underline flex items-center gap-1.5 cursor-pointer py-1"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Đổi mật khẩu Quản trị viên
                    </button>
                  </div>
                </form>

                {/* Alternative Quick Google Login */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isAuthLoading}
                    className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-650"
                  >
                    {isAuthLoading ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang đăng nhập Google...</>
                    ) : (
                      <><LogIn className="w-3.5 h-3.5 text-blue-500" /> Đăng nhập nhanh bằng Google (nguyenthihadht@gmail.com)</>
                    )}
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center">
                Toàn quyền thêm sửa xóa học sinh, đánh giá & sao lưu dữ liệu
              </div>
            </div>

          </div>

          <div className="text-center text-xs text-slate-400">
            © 2026 TRỢ LÝ SỐ TIN HỌC · Hệ thống phân quyền an toàn & bảo mật
          </div>

          {/* Quick change password modal on login screen */}
          {renderChangePasswordModal()}

        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. MAIN APPLICATION WORKSPACE
  // =========================================================================
  const isReadOnly = userRole === 'viewer';

  return (
    <div className={`min-h-screen flex ${themeClass}`}>
      
      {/* Toast Notification (Copy link or status) */}
      {copyLinkToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-indigo-500 max-w-md text-xs font-medium animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{copyLinkToast}</span>
          <button onClick={() => setCopyLinkToast(null)} className="ml-auto text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Elevation Modal (When in Viewer mode and clicking "Quản trị viên") */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-850 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" /> Xác thực quyền Quản trị viên
              </h3>
              <button 
                onClick={() => {
                  setShowAdminLoginModal(false);
                  setModalPasswordError('');
                  setModalPasswordInput('');
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhập mật khẩu Quản trị viên (Cô Nguyễn Thị Hà) để mở khóa toàn bộ quyền thêm, sửa, xóa và đánh giá lớp học:
            </p>

            <form onSubmit={handleElevateToAdmin} className="space-y-3">
              <div className="relative">
                <input
                  type={showModalPassword ? 'text' : 'password'}
                  value={modalPasswordInput}
                  onChange={(e) => {
                    setModalPasswordInput(e.target.value);
                    setModalPasswordError('');
                  }}
                  placeholder="Nhập mật khẩu Quản trị viên"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500/20 pr-10 font-mono"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowModalPassword(!showModalPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {modalPasswordError && (
                <p className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {modalPasswordError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminLoginModal(false);
                    setModalPasswordError('');
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Unlock className="w-4 h-4" /> Mở khóa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CHANGE PASSWORD MODAL FOR ADMIN */}
      {renderChangePasswordModal()}

      {/* 1. PERSISTENT SIDEBAR - Desktop */}
      <aside className={`w-64 bg-white dark:bg-slate-800 border-r border-slate-150 dark:border-slate-700 flex flex-col justify-between fixed lg:static inset-y-0 left-0 z-40 transition-transform duration-200 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          {/* Sidebar Brand logo */}
          <div className="h-16 px-6 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm font-display">
                T
              </div>
              <span className="font-extrabold text-base text-blue-600 dark:text-blue-450 tracking-tight font-display">TRỢ LÝ SỐ TIN HỌC</span>
            </div>
            <button className="lg:hidden text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Role Indicator in Sidebar */}
          <div className="p-3 mx-3 my-2 rounded-2xl bg-slate-50 dark:bg-slate-750/50 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">{isReadOnly ? '👁️' : '👑'}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold text-slate-850 dark:text-slate-100 truncate">
                  {isReadOnly ? viewerName : settings?.teacherName}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {isReadOnly ? 'Chế độ: Chỉ xem' : 'Toàn quyền quản trị'}
                </p>
              </div>
            </div>
            {isReadOnly ? (
              <button
                onClick={() => setShowAdminLoginModal(true)}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold cursor-pointer shrink-0 transition-all"
                title="Đăng nhập tài khoản Quản trị viên"
              >
                Mở khóa
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowChangePasswordModal(true);
                  setChangePassError('');
                  setChangePassSuccess('');
                  setChangePassOldInput('');
                  setChangePassNewInput('');
                  setChangePassConfirmInput('');
                }}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black cursor-pointer shrink-0 transition-all flex items-center gap-1 shadow-2xs"
                title="Đổi mật khẩu Quản trị viên"
              >
                <KeyRound className="w-3 h-3" /> Đổi mã
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <Home className="w-4 h-4" /> Bảng điều khiển
            </button>

            <button
              onClick={() => { setActiveTab('school'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'school' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <School className="w-4 h-4" /> Quản lý Lớp học & Khối
            </button>

            <button
              onClick={() => { setActiveTab('timeline'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'timeline' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <Calendar className="w-4 h-4" /> Phân phối chương trình
            </button>

            <button
              onClick={() => { setActiveTab('students'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'students' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <Users className="w-4 h-4" /> Danh sách học sinh
            </button>

            <button
              onClick={() => { 
                setActiveTab('assess'); 
                setAssessResetKey(k => k + 1);
                setIsSidebarOpen(false); 
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'assess' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <PlusCircle className="w-4 h-4" /> Đánh giá Tiết học
            </button>

            <button
              onClick={() => { setActiveTab('wheel'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'wheel' ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" /> Vòng xoay kỳ diệu
            </button>

            <button
              onClick={() => { setActiveTab('diaries'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'diaries' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <BookOpen className="w-4 h-4" /> Nhật ký dạy học
            </button>

            <button
              onClick={() => { setActiveTab('portfolio'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'portfolio' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <Award className="w-4 h-4" /> Hồ sơ học tập học sinh
            </button>

            <button
              onClick={() => { setActiveTab('scores'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'scores' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Ghi điểm và nhận xét
            </button>

            <button
              onClick={() => { setActiveTab('stats'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <CheckCircle className="w-4 h-4" /> Báo cáo & Thống kê
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <Settings className="w-4 h-4" /> Thiết lập hệ thống {isReadOnly && <span className="text-[10px] opacity-75">(Chỉ xem)</span>}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer (Profile & Share link) */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 space-y-2.5">
          {!isReadOnly && (
            <button
              onClick={handleCopyColleagueShareLink}
              className="w-full flex items-center gap-2 justify-center py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold cursor-pointer transition-all border border-indigo-200 dark:border-indigo-800"
              title="Sao chép liên kết chỉ xem gửi cho đồng nghiệp tham khảo"
            >
              <Share2 className="w-3.5 h-3.5" /> Gửi link cho Đồng nghiệp
            </button>
          )}

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => {
                setShowChangePasswordModal(true);
                setChangePassError('');
                setChangePassSuccess('');
                setChangePassOldInput('');
                setChangePassNewInput('');
                setChangePassConfirmInput('');
              }}
              className="w-full flex items-center gap-2 justify-center py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold cursor-pointer transition-all border border-amber-300 dark:border-amber-800"
              title="Đổi mật khẩu Quản trị viên"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Đổi mật khẩu Quản trị
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 ${isReadOnly ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-slate-700 dark:text-blue-300'} font-extrabold text-sm rounded-lg flex items-center justify-center uppercase`}>
              {isReadOnly ? 'ĐN' : (settings?.teacherName?.slice(-2) || 'GV')}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs truncate text-slate-800 dark:text-slate-200">
                {isReadOnly ? viewerName : settings?.teacherName}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {isReadOnly ? 'Khách tham khảo (Chỉ xem)' : 'nguyenthihadht@gmail.com'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 justify-center py-2 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 hover:text-rose-600 dark:text-slate-400 rounded-xl text-xs font-bold cursor-pointer transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Đổi vai trò / Đăng xuất
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
              <span className="text-slate-500 hover:underline cursor-pointer flex items-center gap-1" onClick={() => setActiveTab('dashboard')}><Home className="w-3.5 h-3.5" /> TRỢ LÝ SỐ TIN HỌC</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-800 dark:text-slate-200">{getTabTitle(activeTab)}</span>
            </div>
          </div>

          {/* Quick settings, Role Badges & Share Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isReadOnly ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 shadow-2xs">
                  <span>👁️</span>
                  <span className="hidden sm:inline">Chế độ: Đồng nghiệp tham khảo (Chỉ xem)</span>
                  <span className="sm:hidden">Chỉ xem</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(true)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  title="Đăng nhập tài khoản Quản trị viên"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Quản trị viên</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hidden md:flex items-center gap-1.5 shadow-2xs">
                  <span>👑</span> Quyền Quản trị viên
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setShowChangePasswordModal(true);
                    setChangePassError('');
                    setChangePassSuccess('');
                    setChangePassOldInput('');
                    setChangePassNewInput('');
                    setChangePassConfirmInput('');
                  }}
                  className="px-3.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-full text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                  title="Đổi mật khẩu Quản trị viên"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">Đổi mật khẩu</span>
                  <span className="sm:hidden">Mật khẩu</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyColleagueShareLink}
                  className="px-3.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                  title="Sao chép link gửi đồng nghiệp tham khảo ở chế độ Chỉ Xem"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sao chép link gửi Đồng nghiệp (Chỉ xem)</span>
                  <span className="sm:hidden">Gửi link</span>
                </button>
              </div>
            )}

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800 max-w-[200px] truncate hidden sm:inline-block" title={settings?.schoolName}>
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
              readOnly={isReadOnly}
              onNavigate={(tab) => {
                setActiveTab(tab as Tab);
                if (tab === 'assess') {
                  setAssessResetKey(k => k + 1);
                }
              }}
              onSelectClassForLesson={(cId) => {
                setActiveTab('assess');
                setAssessResetKey(k => k + 1);
              }}
            />
          )}

          {activeTab === 'school' && (
            <SchoolManager 
              schoolYears={schoolYears}
              grades={grades}
              classes={classes}
              students={students}
              readOnly={isReadOnly}
              onAddYear={(name) => ClassTrackerAPI.addSchoolYear(name)}
              onUpdateYear={(id, name) => ClassTrackerAPI.updateSchoolYear(id, name)}
              onDeleteYear={(id) => ClassTrackerAPI.deleteSchoolYear(id)}
              onSetCurrentYear={(id) => ClassTrackerAPI.setCurrentSchoolYear(id)}
              onAddGrade={(name) => ClassTrackerAPI.addGrade(name)}
              onUpdateGrade={(id, name) => ClassTrackerAPI.updateGrade(id, name)}
              onDeleteGrade={(id) => ClassTrackerAPI.deleteGrade(id)}
              onAddClass={(name, gId, teacher, subject) => ClassTrackerAPI.addClass(name, gId, teacher, subject)}
              onUpdateClass={(id, name, gId, teacher, subject) => ClassTrackerAPI.updateClass(id, name, gId, teacher, subject)}
              onDeleteClass={(id) => ClassTrackerAPI.deleteClass(id)}
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineManager 
              timeline={timeline}
              classes={classes}
              grades={grades}
              students={students}
              readOnly={isReadOnly}
              onSaveTimeline={(t) => ClassTrackerAPI.saveTimeline(t)}
            />
          )}

          {activeTab === 'students' && (
            <StudentManager 
              classes={classes}
              grades={grades}
              students={students}
              readOnly={isReadOnly}
              onAddStudent={(s) => ClassTrackerAPI.addStudent(s)}
              onUpdateStudent={(id, fields) => ClassTrackerAPI.updateStudent(id, fields)}
              onDeleteStudent={(id) => ClassTrackerAPI.deleteStudent(id)}
              onImportCSV={(csv, classId) => ClassTrackerAPI.parseCSVAndImport(csv, classId)}
            />
          )}

          {activeTab === 'assess' && (
            <LessonEvaluator 
              key={`assess_eval_${assessResetKey}`}
              classes={classes}
              grades={grades}
              students={students}
              lessons={lessons}
              assessments={assessments}
              timeline={timeline}
              readOnly={isReadOnly}
              onSaveAssessments={(lId, date, list) => ClassTrackerAPI.saveAssessments(lId, date, list)}
              onAddLesson={(lesson) => ClassTrackerAPI.addLesson(lesson)}
            />
          )}

          {activeTab === 'wheel' && (
            <LuckyWheelTab 
              classes={classes}
              grades={grades}
              students={students}
              lessons={lessons}
              assessments={assessments}
              readOnly={isReadOnly}
              onNavigateToStudents={() => setActiveTab('students')}
              onNavigateToAssess={(cId) => {
                setActiveTab('assess');
                setAssessResetKey(k => k + 1);
              }}
            />
          )}

          {activeTab === 'diaries' && (
            <LessonDiaries 
              classes={classes}
              grades={grades}
              lessons={lessons}
              students={students}
              assessments={assessments}
              timeline={timeline}
              readOnly={isReadOnly}
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
              readOnly={isReadOnly}
              onGenerateAIComment={isReadOnly ? async () => { throw new Error('Chế độ xem không thể tạo nhận xét AI'); } : (sId) => ClassTrackerAPI.generateAIComment(sId)}
              onAddComment={isReadOnly ? () => {} : (sId, text, type) => ClassTrackerAPI.addComment(sId, text, type)}
              onDeleteComment={isReadOnly ? () => {} : (id) => ClassTrackerAPI.deleteComment(id)}
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

          {activeTab === 'scores' && (
            <ScoresManager
              students={students}
              classes={classes}
              assessments={assessments}
              comments={comments}
              scores={scores}
              readOnly={isReadOnly}
              onAddOrUpdateScore={isReadOnly ? () => {} : (studentId, semester, score) => ClassTrackerAPI.addOrUpdateScore(studentId, semester, score)}
              onGenerateAIComment={isReadOnly ? async () => { throw new Error('Chế độ xem không thể tạo nhận xét AI'); } : (studentId, period, level) => ClassTrackerAPI.generateAIComment(studentId, period, level)}
              onAddComment={isReadOnly ? () => {} : (studentId, content, type, period, level) => ClassTrackerAPI.addComment(studentId, content, type, period, level)}
            />
          )}

          {activeTab === 'settings' && (
            <BackupSettings 
              settings={settings}
              readOnly={isReadOnly}
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
