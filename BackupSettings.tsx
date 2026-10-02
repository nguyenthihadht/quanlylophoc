/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Save, Download, Upload, Check, RefreshCw, Star, Info, Moon, Sun, AlertTriangle, Database, Cloud, Eye, EyeOff } from 'lucide-react';
import { AppSettings } from '../types';
import { ClassTrackerAPI } from '../lib/api';

interface BackupSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onExportBackup: () => string;
  onImportBackup: (json: string) => boolean;
}

export function BackupSettings({
  settings,
  onUpdateSettings,
  onExportBackup,
  onImportBackup
}: BackupSettingsProps) {
  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [teacherName, setTeacherName] = useState(settings.teacherName);
  const [adminPassword, setAdminPassword] = useState(settings.adminPassword || '123456');
  const [requirePassword, setRequirePassword] = useState(settings.requirePassword !== false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  
  const [isSaved, setIsSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      schoolName: schoolName.trim(),
      teacherName: teacherName.trim(),
      adminPassword: adminPassword.trim(),
      requirePassword: requirePassword
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Export database JSON file
  const handleDownloadBackup = () => {
    const jsonStr = onExportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `class_tracker_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Restore database JSON file
  const handleRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const success = onImportBackup(text);
      if (success) {
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 3000);
      } else {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
  };

  const [firebaseStatus, setFirebaseStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [firebaseLoadStatus, setFirebaseLoadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [firebaseErrorMsg, setFirebaseErrorMsg] = useState<string>('');

  const handleManualSyncToFirebase = async () => {
    setFirebaseStatus('syncing');
    try {
      const success = await ClassTrackerAPI.forceSyncToFirestore();
      if (success) {
        setFirebaseStatus('success');
        setTimeout(() => setFirebaseStatus('idle'), 3500);
      } else {
        setFirebaseStatus('error');
        setFirebaseErrorMsg('Không thể ghi dữ liệu lên Firebase Firestore. Vui lòng kiểm tra lại cấu hình rules.');
        setTimeout(() => setFirebaseStatus('idle'), 4000);
      }
    } catch (err: any) {
      setFirebaseStatus('error');
      setFirebaseErrorMsg(err?.message || 'Có lỗi xảy ra.');
      setTimeout(() => setFirebaseStatus('idle'), 4000);
    }
  };

  const handleManualLoadFromFirebase = async () => {
    if (!window.confirm('Hành động này sẽ ghi đè toàn bộ dữ liệu hiện tại bằng dữ liệu tải từ Firebase về. Bạn có chắc chắn muốn tiếp tục?')) {
      return;
    }
    setFirebaseLoadStatus('loading');
    try {
      const success = await ClassTrackerAPI.forceLoadFromFirestore();
      if (success) {
        setFirebaseLoadStatus('success');
        setTimeout(() => setFirebaseLoadStatus('idle'), 3500);
      } else {
        setFirebaseLoadStatus('error');
        setFirebaseErrorMsg('Không tìm thấy bản sao lưu hợp lệ trên Firestore.');
        setTimeout(() => setFirebaseLoadStatus('idle'), 4000);
      }
    } catch (err: any) {
      setFirebaseLoadStatus('error');
      setFirebaseErrorMsg(err?.message || 'Có lỗi xảy ra.');
      setTimeout(() => setFirebaseLoadStatus('idle'), 4000);
    }
  };

  return (
    <div id="backup-settings-container" className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* 1. Global App Configuration */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs space-y-4 vibrant-card">
        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 font-display">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Thiết lập chung Hệ thống
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Chỉnh sửa thông tin trường học và giáo viên để hiển thị đồng bộ trong các mẫu báo cáo, học bạ và chữ ký AI.
        </p>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Tên trường Tiểu học</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Họ tên Giáo viên Tin học</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-xs"
              required
            />
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase mb-1.5">Mật khẩu Quản trị viên (Mặc định: 123456)</label>
            <div className="relative">
              <input
                type={showAdminPass ? 'text' : 'password'}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-350 dark:border-slate-650 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500/20 pr-10 font-mono shadow-xs placeholder-slate-400"
                required
                placeholder="Nhập mật khẩu quản trị viên"
              />
              <button
                type="button"
                onClick={() => setShowAdminPass(!showAdminPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Sử dụng mật khẩu này để khóa ứng dụng bảo mật thông tin học sinh.</p>
          </div>

          <div className="flex items-center gap-2.5 py-1">
            <input
              type="checkbox"
              id="require-password-checkbox"
              checked={requirePassword}
              onChange={(e) => setRequirePassword(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded-sm focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="require-password-checkbox" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              Yêu cầu mật khẩu khi mở ứng dụng
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" /> Đã lưu thành công!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Lưu thông tin cấu hình
              </>
            )}
          </button>
        </form>

        {/* Theme select info */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase">Giao diện (Theme)</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onUpdateSettings({ theme: 'light' })}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                settings.theme === 'light' 
                  ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-slate-700' 
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700'
              }`}
            >
              <Sun className="w-4 h-4" /> Light Mode
            </button>
            <button
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                settings.theme === 'dark' 
                  ? 'bg-slate-750 border-slate-700 text-blue-400' 
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700'
              }`}
            >
              <Moon className="w-4 h-4" /> Dark Mode
            </button>
          </div>
        </div>
      </div>

      {/* 2. Backup & Restore database panel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs space-y-4 vibrant-card">
        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 font-display">
          <RefreshCw className="w-5 h-5 text-blue-500" /> Sao lưu & Khôi phục Dữ liệu
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-450">
          Tải tệp sao lưu dữ liệu (.json) để lưu trữ ngoại tuyến hoặc khôi phục toàn bộ danh sách lớp học, bài học và điểm số trên thiết bị khác.
        </p>

        <div className="space-y-4">
          {/* Download block */}
          <div className="p-4 bg-slate-50 dark:bg-slate-750/50 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Xuất tệp sao lưu</p>
              <p className="text-xs text-slate-500">Tải xuống toàn bộ cơ sở dữ liệu học tập.</p>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Tải về tệp .json
            </button>
          </div>

          {/* Upload Restore block */}
          <div className="p-4 bg-slate-50 dark:bg-slate-750/50 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-3">
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Khôi phục từ tệp sao lưu</p>
              <p className="text-xs text-slate-500 mt-0.5">Chọn tệp .json đã tải về trước đó để ghi đè khôi phục dữ liệu.</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreUpload}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-100 file:text-blue-800 dark:file:bg-slate-700 dark:file:text-slate-200 hover:file:bg-blue-200 cursor-pointer"
              />
            </div>

            {/* Status alerts */}
            {importStatus === 'success' && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs flex items-center gap-1.5 font-semibold">
                <Check className="w-4 h-4 text-emerald-500" /> Toàn bộ dữ liệu của thầy cô đã được khôi phục thành công!
              </div>
            )}
            {importStatus === 'error' && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Tệp không đúng định dạng sao lưu của hệ thống. Vui lòng kiểm tra lại.
              </div>
            )}
          </div>

          {/* Sync status */}
          <div className="p-4 bg-blue-500/5 text-blue-800 dark:text-blue-300 rounded-xl border border-blue-500/10 text-xs flex gap-2.5 items-start">
            <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-blue-500" />
            <p className="leading-relaxed">
              <span className="font-bold">Đồng bộ tự động giữa các thiết bị:</span> Toàn bộ các thay đổi được tự động ghi nhận song song lên đám mây (Express database) và bộ nhớ cục bộ trình duyệt (LocalStorage). Giúp thầy cô ghi điểm mượt mà trên cả điện thoại và máy tính mà không sợ mất dữ liệu.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Real-time Firebase Firestore database synchronization block */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs space-y-4 vibrant-card md:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-xl">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 font-display">
                Đồng bộ Đám mây Firebase Firestore Cá Nhân
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lưu trữ và chia sẻ trực tiếp dữ liệu học sinh lên tài khoản Firebase của Thầy Cô.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">Đã kết nối Firebase</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Firestore Info Card */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-750/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/45 text-xs">
            <p className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[10px]">Cấu hình hiện tại</p>
            <div className="space-y-1.5 font-mono text-slate-600 dark:text-slate-350">
              <p><span className="font-semibold text-slate-400">Project ID:</span> quanlylophoc-1fc26</p>
              <p><span className="font-semibold text-slate-400">Collection:</span> edu_track_ai</p>
              <p><span className="font-semibold text-slate-400">Document:</span> app_state</p>
              <p><span className="font-semibold text-slate-400">Status:</span> Live Connection</p>
            </div>
            <div className="mt-3 p-2.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded-lg text-[11px] leading-relaxed flex gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
              <p>Mỗi chỉnh sửa điểm, học sinh, hay buổi dạy sẽ được tự động đồng bộ ngay lập tức lên database của Thầy Cô.</p>
            </div>
          </div>

          {/* Sync control block */}
          <div className="md:col-span-2 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
              Nếu Thầy Cô vừa thiết lập Firebase hoặc muốn chủ động tải dữ liệu từ đám mây về/đẩy dữ liệu cục bộ lên, hãy sử dụng các tính năng điều khiển thủ công dưới đây:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Push local data to Firestore */}
              <div className="p-4 border border-slate-150 dark:border-slate-700 rounded-xl space-y-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-blue-500" /> Tải dữ liệu lên đám mây
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đẩy toàn bộ dữ liệu đang có trên máy này để ghi đè lên đám mây Firebase.
                  </p>
                </div>
                <button
                  onClick={handleManualSyncToFirebase}
                  disabled={firebaseStatus === 'syncing'}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {firebaseStatus === 'syncing' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang đồng bộ...
                    </>
                  ) : firebaseStatus === 'success' ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Đồng bộ thành công!
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" /> Thực hiện Đồng bộ Lên (Upload)
                    </>
                  )}
                </button>
              </div>

              {/* Pull firebase data to local */}
              <div className="p-4 border border-slate-150 dark:border-slate-700 rounded-xl space-y-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-emerald-500" /> Tải dữ liệu từ đám mây về
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tải dữ liệu từ Firebase về để ghi đè lên máy hiện tại (ví dụ: khi đổi thiết bị).
                  </p>
                </div>
                <button
                  onClick={handleManualLoadFromFirebase}
                  disabled={firebaseLoadStatus === 'loading'}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {firebaseLoadStatus === 'loading' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tải về...
                    </>
                  ) : firebaseLoadStatus === 'success' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Đã tải về thành công!
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" /> Thực hiện Tải về (Download)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error alerts */}
            {firebaseStatus === 'error' && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> {firebaseErrorMsg}
              </div>
            )}
            {firebaseLoadStatus === 'error' && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> {firebaseErrorMsg}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
