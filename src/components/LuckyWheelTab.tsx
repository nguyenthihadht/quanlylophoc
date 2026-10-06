/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, Volume2, VolumeX, HelpCircle, Settings as SettingsIcon, 
  RotateCcw, School, UserCheck, UserX, Clock, ChevronDown, Award, 
  FileSpreadsheet, Users, X, Check, Star, Play, History, ArrowRight
} from 'lucide-react';
import { Class, Student, Lesson, Assessment, Grade, WheelSpinRecord } from '../types';
import { ClassTrackerAPI } from '../lib/api';
import { wheelSounds } from '../lib/soundEffects';

interface LuckyWheelTabProps {
  classes: Class[];
  grades: Grade[];
  students: Student[];
  lessons: Lesson[];
  assessments: Assessment[];
  readOnly?: boolean;
  onNavigateToStudents?: () => void;
  onNavigateToAssess?: (classId: string) => void;
}

// Slice Color Palette: 16 vibrant high-contrast cheerful colors
const SLICE_COLORS = [
  '#0284c7', // Sky Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#ef4444', // Red
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
  '#3b82f6', // Blue
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#059669', // Dark Green
];

export function LuckyWheelTab({
  classes,
  grades,
  students,
  lessons,
  assessments,
  readOnly = false,
  onNavigateToStudents,
  onNavigateToAssess
}: LuckyWheelTabProps) {
  // 1. Current Class Selection
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    return classes[0]?.id || '';
  });

  // Keep selectedClassId valid
  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Mode: "repeatable" (Có thể quay lại) vs "no_repeat" (Không lặp lại)
  const [spinMode, setSpinMode] = useState<'repeatable' | 'no_repeat'>('no_repeat');

  // List of student IDs removed from current wheel in "no_repeat" mode
  const [removedStudentIds, setRemovedStudentIds] = useState<string[]>([]);

  // Sound Muted state
  const [isMuted, setIsMuted] = useState<boolean>(() => wheelSounds.getMuted());

  // Wheel State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const currentAngleRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const [needleWiggle, setNeedleWiggle] = useState<number>(0);

  // Winning Result Modal State
  const [winnerStudent, setWinnerStudent] = useState<Student | null>(null);
  const [selectedStars, setSelectedStars] = useState<1 | 2 | 3>(3);
  const [answerNote, setAnswerNote] = useState('');
  const [syncToAssessment, setSyncToAssessment] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);

  // Recent History List
  const [historyList, setHistoryList] = useState<WheelSpinRecord[]>([]);

  // Other Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Get active class and students
  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const allClassStudents = students.filter(s => s.classId === selectedClassId);

  // Active students in wheel (filtered if no_repeat)
  const wheelStudents = spinMode === 'no_repeat' 
    ? allClassStudents.filter(s => !removedStudentIds.includes(s.id))
    : allClassStudents;

  // Refresh history on mount & class change
  useEffect(() => {
    const list = ClassTrackerAPI.getWheelRecords(selectedClassId);
    setHistoryList(list);
  }, [selectedClassId]);

  // Reset removed students when changing class
  useEffect(() => {
    setRemovedStudentIds([]);
  }, [selectedClassId]);

  // Handle mute toggle
  const toggleMute = () => {
    const next = wheelSounds.toggleMute();
    setIsMuted(next);
  };

  // Calculate accumulated stars for a student
  const getStudentAccumulatedStars = useCallback((studentId: string): number => {
    const allRecords = ClassTrackerAPI.getWheelRecords();
    return allRecords
      .filter(r => r.studentId === studentId)
      .reduce((sum, r) => sum + r.stars, 0);
  }, []);

  // -------------------------------------------------------------
  // CANVAS WHEEL RENDERING
  // -------------------------------------------------------------
  const drawWheel = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 22;

    ctx.clearRect(0, 0, width, height);

    // If no students available
    if (wheelStudents.length === 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Đã gọi hết học sinh trong vòng!', centerX, centerY - 10);
      ctx.font = '13px sans-serif';
      ctx.fillText('Nhấn "Đặt lại vòng" để bắt đầu lại', centerX, centerY + 16);
      ctx.restore();
      return;
    }

    const numSlices = wheelStudents.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    // 1. Draw outer glowing ring shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // 2. Draw Slices
    for (let i = 0; i < numSlices; i++) {
      const student = wheelStudents[i];
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const color = SLICE_COLORS[i % SLICE_COLORS.length];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Slice white separator border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = numSlices > 30 ? 1 : 2;
      ctx.stroke();

      // 3. Draw Student Name
      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Adjust font size based on slice count
      const fontSize = numSlices > 35 ? 10 : numSlices > 25 ? 11 : numSlices > 15 ? 12 : 14;
      ctx.font = `bold ${fontSize}px "Be Vietnam Pro", system-ui, sans-serif`;

      // Truncate name if too long for slice
      let displayName = student.name;
      const maxTextWidth = radius - 75;
      if (ctx.measureText(displayName).width > maxTextWidth) {
        // Use short name: Last name + First name
        const parts = displayName.split(' ');
        if (parts.length > 2) {
          displayName = `${parts[0]} ${parts[parts.length - 1]}`;
        }
      }

      ctx.fillText(displayName, radius - 18, 0);
      ctx.restore();
    }

    // 3. Draw Outer Rim / Bezel
    ctx.restore(); // back to center

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#1e293b'; // dark rim
    ctx.stroke();

    // Decorative golden outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 14, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Small golden perimeter rivets
    const rivetCount = 24;
    for (let r = 0; r < rivetCount; r++) {
      const rAngle = (r * 2 * Math.PI) / rivetCount;
      const rx = centerX + Math.cos(rAngle) * (radius + 8);
      const ry = centerY + Math.sin(rAngle) * (radius + 8);
      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
    }

    // 4. Center Hub: Vibrant Orange/Red circle with "QUAY"
    const hubRadius = Math.max(38, radius * 0.18);
    const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, hubRadius);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(0.6, '#f97316');
    grad.addColorStop(1, '#ea580c');

    ctx.beginPath();
    ctx.arc(centerX, centerY, hubRadius, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Center "QUAY" text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'black 16px "Be Vietnam Pro", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 3;
    ctx.fillText('QUAY', centerX, centerY);

    ctx.restore();
  }, [wheelStudents]);

  // Initial and reactive draw
  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [drawWheel]);

  // -------------------------------------------------------------
  // SPIN LOGIC & PHYSICS
  // -------------------------------------------------------------
  const handleSpin = () => {
    if (isSpinning || wheelStudents.length === 0) return;

    setIsSpinning(true);
    const numSlices = wheelStudents.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    // Pick a random winner in advance
    const targetIndex = Math.floor(Math.random() * numSlices);
    const winner = wheelStudents[targetIndex];

    // Pointer is at 12 o'clock, which is -PI/2 (or 3*PI/2)
    // We want slice targetIndex to stop right under pointer.
    // Pointer angle in canvas coords is 1.5 * PI (270 deg)
    // Slice angle center: targetIndex * sliceAngle + sliceAngle / 2
    // Formula: (targetAngle + finalRotation) % (2 * PI) = 1.5 * PI
    const centerSliceOffset = targetIndex * sliceAngle + sliceAngle / 2;
    const desiredStopAngle = (1.5 * Math.PI - centerSliceOffset + 4 * Math.PI) % (2 * Math.PI);

    // Number of full rotations (between 5 and 8 full rounds for excitement)
    const extraRounds = 6 + Math.floor(Math.random() * 3);
    const startAngle = currentAngleRef.current % (2 * Math.PI);
    
    let totalTargetAngle = startAngle + extraRounds * 2 * Math.PI + (desiredStopAngle - startAngle);
    if (totalTargetAngle < startAngle + extraRounds * 2 * Math.PI) {
      totalTargetAngle += 2 * Math.PI;
    }

    const duration = 5200; // 5.2 seconds spin
    const startTime = performance.now();
    let lastTickAngle = startAngle;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Quartic Ease-Out curve for realistic deceleration
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const currentAngle = startAngle + (totalTargetAngle - startAngle) * easeOut;
      currentAngleRef.current = currentAngle;

      drawWheel(currentAngle);

      // Sound and needle bounce whenever crossing a slice line
      const deltaAngle = Math.abs(currentAngle - lastTickAngle);
      if (deltaAngle >= sliceAngle * 0.85) {
        lastTickAngle = currentAngle;
        const speedRatio = 1 - progress;
        wheelSounds.playTick(1.0 + speedRatio * 0.4);
        setNeedleWiggle((Math.random() > 0.5 ? 1 : -1) * (12 * speedRatio));
        setTimeout(() => setNeedleWiggle(0), 40);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // SPIN COMPLETED!
        setIsSpinning(false);
        setNeedleWiggle(0);
        currentAngleRef.current = desiredStopAngle;
        drawWheel(desiredStopAngle);

        // Play victory celebration fanfare
        wheelSounds.playCelebration();

        // Open Celebration Modal
        setWinnerStudent(winner);
        setSelectedStars(3);
        setAnswerNote('');
        setShowResultModal(true);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  // Reset entire wheel (restores all removed students)
  const handleResetWheel = () => {
    setRemovedStudentIds([]);
    showToast(`Đã nạp lại đầy đủ ${allClassStudents.length} học sinh vào vòng quay!`);
  };

  // -------------------------------------------------------------
  // SAVE WHEEL RESULT & SYNC WITH ASSESSMENT
  // -------------------------------------------------------------
  const handleConfirmResult = (removeAfterSelection: boolean) => {
    if (!winnerStudent) return;

    const starsMap: Record<1 | 2 | 3, string> = {
      1: 'Ko trả lời được',
      2: 'Trả lời đúng 1 phần',
      3: 'Trả lời bài tốt'
    };

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];

    if (readOnly) {
      if (removeAfterSelection || spinMode === 'no_repeat') {
        setRemovedStudentIds(prev => 
          prev.includes(winnerStudent.id) ? prev : [...prev, winnerStudent.id]
        );
      }
      setShowResultModal(false);
      showToast(`[Chỉ xem] Đã thử chấm ${selectedStars} ⭐ cho em ${winnerStudent.name}! (Không lưu vào hồ sơ gốc)`);
      setWinnerStudent(null);
      return;
    }

    // 1. Create and save record in API (auto-syncs to lesson assessment)
    const newRecord = ClassTrackerAPI.addWheelRecord({
      studentId: winnerStudent.id,
      studentName: winnerStudent.name,
      classId: selectedClassId,
      className: currentClass?.name || '',
      timestamp: timeStr,
      date: dateStr,
      stars: selectedStars,
      ratingText: starsMap[selectedStars],
      note: answerNote.trim()
    });

    // 2. Handle removal from wheel if requested or in no_repeat mode
    if (removeAfterSelection || spinMode === 'no_repeat') {
      setRemovedStudentIds(prev => 
        prev.includes(winnerStudent.id) ? prev : [...prev, winnerStudent.id]
      );
    }

    // 3. Update local history list
    setHistoryList(prev => [newRecord, ...prev]);

    // 4. Close modal and show celebration toast
    setShowResultModal(false);
    showToast(`Đã lưu đánh giá & cộng ${selectedStars} ⭐ cho em ${winnerStudent.name}!`);
    setWinnerStudent(null);
  };

  return (
    <div id="lucky-wheel-container" className="space-y-6">

      {/* Read-Only Notice Banner */}
      {readOnly && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🎡</span>
            <div>
              <p className="font-bold">Trải nghiệm Vòng Xoay Kỳ Diệu (Chế độ Xem & Thử nghiệm)</p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Thầy/Cô có thể quay thử để xem vòng xoay gọi tên ngẫu nhiên và hiệu ứng âm thanh sống động. Dữ liệu đánh giá thử nghiệm sẽ không ghi đè vào hệ thống.</p>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-lg font-bold text-[10px] uppercase tracking-wider">Chỉ xem</span>
        </div>
      )}

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-400 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER: Branding & Control Toolbar (Matching Screenshot 1) */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Brand Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
            <Sparkles className="w-7 h-7 animate-pulse text-amber-200" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-850 dark:text-slate-100 font-display tracking-tight flex items-center gap-2">
              <span>VÒNG XOAY KỲ DIỆU</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Gọi tên học sinh ngẫu nhiên & hào hứng
            </p>
          </div>
        </div>

        {/* Right Controls: Class Dropdown, Quick Actions, Sound, Help, Settings */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Class Selector Dropdown (Nền xanh đậm chữ trắng) */}
          <div className="flex items-center gap-1.5 bg-[#0b1e36] p-1.5 rounded-2xl border-2 border-blue-900 shadow-sm">
            <span className="text-xs font-black text-sky-200 pl-2 hidden sm:inline">
              🎯 Lớp đang chọn:
            </span>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={isSpinning}
                className="appearance-none bg-[#0f2444] text-white font-black text-xs py-2 pl-3 pr-8 rounded-xl shadow-xs border border-sky-400/60 cursor-pointer outline-none focus:ring-2 focus:ring-sky-300"
              >
                {classes.map(c => {
                  const count = students.filter(s => s.classId === c.id).length;
                  return (
                    <option key={c.id} value={c.id} className="bg-[#0f2444] text-white font-bold py-1">
                      LỚP {c.name} ({count} HS)
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-sky-300 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            
            {onNavigateToStudents && (
              <button
                type="button"
                onClick={onNavigateToStudents}
                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center text-sm shadow-xs border border-sky-300 cursor-pointer"
                title="Thêm hoặc quản lý học sinh"
              >
                +
              </button>
            )}
          </div>

          {/* Quick Roster Action */}
          <button
            type="button"
            onClick={() => setShowRosterModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>DS Lớp & Ghi chú ({allClassStudents.length})</span>
          </button>

          {/* Teacher Badge */}
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800">
            <span>📚 Lớp Cô Hà</span>
          </span>

          {/* History Button */}
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center cursor-pointer transition-all border border-slate-200 dark:border-slate-600"
            title="Lịch sử gọi tên"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isMuted 
                ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/50 dark:border-rose-800' 
                : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 hover:bg-slate-200'
            }`}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Help Button */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer border border-slate-200 dark:border-slate-600"
            title="Hướng dẫn sử dụng"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SUBHEADER: Class Info & Mode Toggle (Nền xanh đậm chữ trắng cho dễ quan sát) */}
      <div className="bg-gradient-to-r from-[#0b1e36] via-[#0f2444] to-[#15345a] text-white px-6 py-4 rounded-3xl border-2 border-sky-400 shadow-md flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Left: Class Name & Student Counts */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-sm border border-sky-300 shrink-0 font-black">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/25 text-sky-200 border border-sky-400/50">
                Lớp Đang Quay
              </span>
              <span className="text-xs text-sky-200 font-bold">
                {currentClass?.subject || 'Tin học'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-amber-300 font-display">
              {currentClass ? `LỚP ${currentClass.name}` : 'Chưa chọn lớp'}
            </h2>
            <p className="text-xs text-sky-100 flex items-center gap-2 font-medium mt-0.5 flex-wrap">
              <span>Sĩ số: <strong className="font-extrabold text-white">{allClassStudents.length}</strong> học sinh</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-300 font-bold bg-emerald-950/70 px-2 py-0.5 rounded-lg border border-emerald-700/60">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Trong vòng: {wheelStudents.length}/{allClassStudents.length} HS
              </span>
            </p>
          </div>
        </div>

        {/* Center: Quick Class Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 xl:pt-0 border-t xl:border-t-0 border-blue-800/60">
          <span className="text-xs font-bold text-sky-200 mr-1 hidden sm:inline">Chọn nhanh lớp:</span>
          {classes.map(c => {
            const isSelected = selectedClassId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={isSpinning}
                onClick={() => setSelectedClassId(c.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                  isSelected
                    ? 'bg-blue-600 text-white font-black ring-2 ring-sky-300 border-sky-400 shadow-sm scale-[1.03]'
                    : 'bg-[#0f2444] hover:bg-[#163a66] text-white font-bold border-blue-800'
                }`}
              >
                <span>Lớp {c.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Mode Toggle (Có thể quay lại vs Không lặp lại) */}
        <div className="flex items-center gap-2 bg-[#0b1e36] p-1.5 rounded-2xl border border-blue-900 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSpinMode('repeatable')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              spinMode === 'repeatable'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            🔄 Có thể quay lại
          </button>
          <button
            type="button"
            onClick={() => setSpinMode('no_repeat')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              spinMode === 'no_repeat'
                ? 'bg-rose-600 text-white shadow-xs font-black ring-1 ring-rose-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            🎯 Không lặp lại
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT: Wheel on Left, Results & History on Right (Screenshot 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ============================================================ */}
        {/* LEFT COLUMN: THE CIRCULAR WHEEL & SPIN CONTROLS */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
          
          {/* Top Pointer Needle at 12 o'clock */}
          <div 
            className="absolute top-8 z-20 pointer-events-none transition-transform duration-75"
            style={{
              transform: `translateX(-50%) rotate(${needleWiggle}deg)`,
              left: '50%'
            }}
          >
            <div className="relative flex flex-col items-center">
              {/* Pointer Marker (Red triangle with shadow) */}
              <div className="w-8 h-10 bg-gradient-to-b from-rose-600 to-red-600 rounded-b-full shadow-lg border-2 border-white flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs"></div>
              </div>
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-red-600 -mt-0.5 filter drop-shadow-md"></div>
            </div>
          </div>

          {/* Canvas Wheel Area */}
          <div className="relative pt-6 pb-2 cursor-pointer flex items-center justify-center" onClick={handleSpin}>
            <canvas
              ref={canvasRef}
              width={480}
              height={480}
              className="max-w-full h-auto drop-shadow-xl select-none"
            />
          </div>

          {/* Bottom Action Controls */}
          <div className="flex items-center gap-4 mt-4 flex-wrap justify-center">
            
            {/* Big Glow Button: QUAY NGAY */}
            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning || wheelStudents.length === 0}
              className="px-10 py-4 rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-black text-base md:text-lg shadow-xl shadow-red-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center gap-3 cursor-pointer tracking-wider"
            >
              <Play className="w-6 h-6 fill-white text-white" />
              <span>🎯 QUAY NGAY</span>
            </button>

            {/* Reset Wheel Button */}
            {spinMode === 'no_repeat' && removedStudentIds.length > 0 && (
              <button
                type="button"
                onClick={handleResetWheel}
                disabled={isSpinning}
                className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs border border-slate-200 dark:border-slate-600 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-emerald-500" />
                <span>Đặt lại vòng ({removedStudentIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: KẾT QUẢ GỌI TÊN & HỌC SINH ĐÃ GỌI GẦN ĐÂY */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 space-y-6">

          {/* CARD 1: KẾT QUẢ GỌI TÊN (Screenshot 1) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black text-xs uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>KẾT QUẢ GỌI TÊN</span>
            </div>

            {historyList.length === 0 ? (
              <div className="py-6 space-y-3">
                <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center mx-auto text-2xl shadow-xs border border-rose-100 dark:border-rose-900">
                  🎯
                </div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base font-display">
                  Bạn đã sẵn sàng chưa?
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 max-w-xs mx-auto">
                  Bấm nút <strong>QUAY</strong> để chọn ngẫu nhiên một bạn học sinh trả lời bài!
                </p>
              </div>
            ) : (
              /* Display Most Recent Called Student */
              <div className="py-2 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center mx-auto text-2xl shadow-xs border border-amber-200 dark:border-amber-800">
                  🏅
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vừa được gọi tên là:</p>
                  <h3 className="text-xl font-black text-blue-600 dark:text-blue-400 font-display mt-0.5">
                    {historyList[0].studentName}
                  </h3>
                  <div className="flex items-center justify-center gap-1 mt-1.5">
                    {Array.from({ length: historyList[0].stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">
                      {historyList[0].ratingText}
                    </span>
                  </div>
                </div>

                {historyList[0].note && (
                  <p className="text-xs bg-slate-50 dark:bg-slate-750 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 italic text-left">
                    "{historyList[0].note}"
                  </p>
                )}

                <div className="pt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                  <span>✓ Đã đồng bộ vào sổ đánh giá tiết học</span>
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: HỌC SINH ĐÃ GỌI GẦN ĐÂY (Screenshot 1) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4">
            
            {/* Header row */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="text-amber-500 text-base">🎖️</span>
                <span>HỌC SINH ĐÃ GỌI GẦN ĐÂY</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Xem tất cả ({historyList.length})
              </button>
            </div>

            {/* List of Recent Students */}
            {historyList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Chưa có lượt quay nào trong tiết học này.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {historyList.slice(0, 6).map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-750/70 hover:bg-blue-50/50 dark:hover:bg-slate-700 rounded-xl border border-slate-150 dark:border-slate-700 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-black text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">
                          {item.studentName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {item.ratingText} {item.note ? `• ${item.note}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span className="text-[11px] font-mono text-slate-400">
                        {item.timestamp}
                      </span>
                      <span className="text-amber-500 font-black text-xs flex items-center">
                        ⭐{item.stars}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons at bottom of Card 2 (Matching Screenshot 1) */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onClick={onNavigateToStudents}
                className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-650"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Import Excel</span>
              </button>

              <button
                type="button"
                onClick={onNavigateToStudents}
                className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-650"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Quản lý học sinh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CELEBRATION MODAL (Matching Screenshot 2 Exactly!) */}
      {/* ========================================================================= */}
      {showResultModal && winnerStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
            
            {/* Top Festive Gradient Banner (Screenshot 2) */}
            <div className="bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-600 p-6 text-white text-center relative">
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-block px-3 py-0.5 rounded-full bg-black/20 text-[11px] font-black tracking-widest uppercase mb-1">
                ✨ VÒNG XOAY KỲ DIỆU ✨
              </div>
              <h2 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white flex items-center justify-center gap-2">
                <span>🎉 CHÚC MỪNG BẠN! 🎉</span>
              </h2>
              <p className="text-xs text-white/90 font-medium mt-1">
                Đã được chọn để trả lời / tham gia bài học
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-center">
              
              {/* Medal Icon & Student Name */}
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-500 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center mx-auto text-3xl shadow-sm">
                  🏅
                </div>
                
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  HỌC SINH ĐƯỢC GỌI TÊN LÀ
                </p>

                {/* Big Student Name Box (Dashed border like Screenshot 2) */}
                <div className="py-4 px-6 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
                  <h3 className="text-2xl md:text-3xl font-black text-slate-850 dark:text-white font-display tracking-wide">
                    {winnerStudent.name}
                  </h3>
                </div>

                {/* Accumulated Stars Badge */}
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-extrabold text-xs border border-amber-300/80">
                  <span>⭐ Tổng tích lũy hiện tại: {getStudentAccumulatedStars(winnerStudent.id)} ⭐</span>
                </div>
              </div>

              {/* MỨC ĐỘ TRẢ LỜI CỦA HỌC SINH: 3 CARDS (Screenshot 2) */}
              <div className="text-left space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>MỨC ĐỘ TRẢ LỜI CỦA HỌC SINH:</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    (Bấm chọn để cộng sao)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {/* Card 1: 1 Star */}
                  <button
                    type="button"
                    onClick={() => setSelectedStars(1)}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[90px] ${
                      selectedStars === 1
                        ? 'border-amber-400 bg-amber-50/80 dark:bg-amber-950/40 shadow-sm ring-2 ring-amber-400/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-0.5 text-amber-400 text-sm">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="mt-1">
                      <p className="font-extrabold text-xs text-slate-800 dark:text-slate-100">Ko trả lời được</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">1 Ngôi sao (Động viên)</p>
                    </div>
                  </button>

                  {/* Card 2: 2 Stars */}
                  <button
                    type="button"
                    onClick={() => setSelectedStars(2)}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[90px] ${
                      selectedStars === 2
                        ? 'border-cyan-400 bg-cyan-50/80 dark:bg-cyan-950/40 shadow-sm ring-2 ring-cyan-400/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-cyan-300'
                    }`}
                  >
                    <div className="flex items-center gap-0.5 text-amber-400 text-sm">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="mt-1">
                      <p className="font-extrabold text-xs text-slate-800 dark:text-slate-100">Trả lời đúng 1 phần</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">2 Ngôi sao (Khá tốt)</p>
                    </div>
                  </button>

                  {/* Card 3: 3 Stars */}
                  <button
                    type="button"
                    onClick={() => setSelectedStars(3)}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[90px] ${
                      selectedStars === 3
                        ? 'border-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-sm ring-2 ring-emerald-400/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-0.5 text-amber-400 text-sm">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="mt-1">
                      <p className="font-extrabold text-xs text-slate-800 dark:text-slate-100">Trả lời bài tốt</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">3 Ngôi sao (Xuất sắc)</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* USER'S REQUIREMENT: GHI CHÚ CÂU TRẢ LỜI ĐỒNG BỘ VÀO ĐÁNH GIÁ TIẾT HỌC */}
              <div className="text-left space-y-1.5 pt-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                  <span>📝 Ghi chú câu trả lời của học sinh:</span>
                </label>
                <input
                  type="text"
                  value={answerNote}
                  onChange={(e) => setAnswerNote(e.target.value)}
                  placeholder="Ví dụ: Tự tin phát biểu, trả lời lưu loát kiến thức hàng phím cơ sở..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                />

                {/* Quick answer tag chips: Nền trắng chữ đen rõ nét theo yêu cầu */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1.5 text-xs">
                  <span className="text-slate-700 dark:text-slate-200 font-bold">Gợi ý nhanh:</span>
                  {[
                    'Trả lời lưu loát, xuất sắc',
                    'Hiểu bài tốt, tự tin',
                    'Nắm được ý chính',
                    'Cần chú ý nghe giảng hơn'
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setAnswerNote(tag)}
                      className="px-3 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs cursor-pointer transition-all border-2 border-slate-300 hover:border-blue-500 shadow-xs active:scale-95"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer Action Buttons (Matching Screenshot 2) */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-750">
                <button
                  type="button"
                  onClick={() => handleConfirmResult(false)}
                  className="py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-600 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                  <span>Quay lại (Giữ trong vòng)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmResult(true)}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Đã chọn – Loại khỏi vòng</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HISTORY MODAL (Xem toàn bộ lịch sử quay & ghi chú) */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
            
            <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-base font-display">
                  Lịch sử gọi tên & Ghi chú trả lời ({historyList.length} lượt)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
              {historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Chưa có lịch sử gọi tên nào cho lớp này.
                </div>
              ) : (
                historyList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
                          {item.studentName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-extrabold text-[10px]">
                          ⭐ {item.stars} sao ({item.ratingText})
                        </span>
                      </div>

                      {item.note && (
                        <p className="text-slate-600 dark:text-slate-300 italic pl-7">
                          "{item.note}"
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-slate-400 font-bold block">
                        {item.timestamp}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.date}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  ClassTrackerAPI.clearWheelRecords(selectedClassId);
                  setHistoryList([]);
                  showToast('Đã xóa toàn bộ lịch sử của lớp này!');
                }}
                disabled={historyList.length === 0}
                className="text-xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Xóa lịch sử lớp này
              </button>

              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROSTER MODAL: DS LỚP & GHI CHÚ */}
      {/* ========================================================================= */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
            
            <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-base font-display">
                  Danh sách học sinh & Tích lũy sao: {currentClass ? `Lớp ${currentClass.name}` : ''}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase">
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Mã HS</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3 text-center">Tích lũy sao</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái vòng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allClassStudents.map((s, idx) => {
                    const stars = getStudentAccumulatedStars(s.id);
                    const isRemoved = removedStudentIds.includes(s.id);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{s.studentId}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-850 dark:text-slate-100">{s.name}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-extrabold border border-amber-200 dark:border-amber-800">
                            ⭐ {stars}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isRemoved ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold">
                              Đã gọi (Tạm ẩn)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">
                              Trong vòng quay
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-150 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HELP GUIDE MODAL */}
      {/* ========================================================================= */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
            
            <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-base font-display">
                  Hướng dẫn Vòng Xoay Kỳ Diệu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center shrink-0">
                  1
                </span>
                <p>
                  <strong>Chọn lớp học:</strong> Vòng quay tự động sử dụng danh sách học sinh của lớp học đã tải lên hệ thống.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <p>
                  <strong>Bấm nút QUAY:</strong> Vòng quay sẽ xoay ngẫu nhiên và dừng lại ở một bạn học sinh với hiệu ứng âm thanh sống động.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <p>
                  <strong>Cộng sao & Ghi chú:</strong> Chấm điểm mức độ trả lời (1, 2 hoặc 3 sao) và nhập nhận xét câu trả lời của em.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-black flex items-center justify-center shrink-0">
                  4
                </span>
                <p>
                  <strong>Đồng bộ tự động:</strong> Ghi chú và số sao được lưu tự động vào phần đánh giá tiết học và nhật ký giảng dạy của lớp!
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-150 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// =========================================================================
// MODAL POPUP COMPONENT (For direct use inside LessonEvaluator assessment)
// =========================================================================
export interface LuckyWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  className: string;
  onSaveResult: (student: Student, stars: 1 | 2 | 3, note: string) => void;
}

export function LuckyWheelModal({
  isOpen,
  onClose,
  students,
  className,
  onSaveResult
}: LuckyWheelModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const currentAngleRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const [needleWiggle, setNeedleWiggle] = useState<number>(0);

  const [winnerStudent, setWinnerStudent] = useState<Student | null>(null);
  const [selectedStars, setSelectedStars] = useState<1 | 2 | 3>(3);
  const [answerNote, setAnswerNote] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Draw wheel
  const drawWheel = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 18;

    ctx.clearRect(0, 0, width, height);

    if (students.length === 0) return;

    const numSlices = students.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    for (let i = 0; i < numSlices; i++) {
      const student = students[i];
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const color = SLICE_COLORS[i % SLICE_COLORS.length];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = numSlices > 30 ? 1 : 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;

      const fontSize = numSlices > 35 ? 10 : numSlices > 25 ? 11 : numSlices > 15 ? 12 : 13;
      ctx.font = `bold ${fontSize}px sans-serif`;

      let displayName = student.name;
      const parts = displayName.split(' ');
      if (parts.length > 2) {
        displayName = `${parts[0]} ${parts[parts.length - 1]}`;
      }
      ctx.fillText(displayName, radius - 16, 0);
      ctx.restore();
    }

    ctx.restore();

    // Outer Rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 6, 0, 2 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    // Center Hub
    const hubRadius = Math.max(34, radius * 0.18);
    const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, hubRadius);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(0.6, '#f97316');
    grad.addColorStop(1, '#ea580c');

    ctx.beginPath();
    ctx.arc(centerX, centerY, hubRadius, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'black 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QUAY', centerX, centerY);
    ctx.restore();
  }, [students]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => drawWheel(currentAngleRef.current), 50);
    }
  }, [isOpen, drawWheel]);

  const handleSpin = () => {
    if (isSpinning || students.length === 0) return;
    setIsSpinning(true);

    const numSlices = students.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const targetIndex = Math.floor(Math.random() * numSlices);
    const winner = students[targetIndex];

    const centerSliceOffset = targetIndex * sliceAngle + sliceAngle / 2;
    const desiredStopAngle = (1.5 * Math.PI - centerSliceOffset + 4 * Math.PI) % (2 * Math.PI);

    const extraRounds = 5 + Math.floor(Math.random() * 3);
    const startAngle = currentAngleRef.current % (2 * Math.PI);
    let totalTargetAngle = startAngle + extraRounds * 2 * Math.PI + (desiredStopAngle - startAngle);
    if (totalTargetAngle < startAngle + extraRounds * 2 * Math.PI) {
      totalTargetAngle += 2 * Math.PI;
    }

    const duration = 5000;
    const startTime = performance.now();
    let lastTickAngle = startAngle;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const currentAngle = startAngle + (totalTargetAngle - startAngle) * easeOut;
      currentAngleRef.current = currentAngle;

      drawWheel(currentAngle);

      const deltaAngle = Math.abs(currentAngle - lastTickAngle);
      if (deltaAngle >= sliceAngle * 0.85) {
        lastTickAngle = currentAngle;
        wheelSounds.playTick();
        setNeedleWiggle((Math.random() > 0.5 ? 1 : -1) * 10);
        setTimeout(() => setNeedleWiggle(0), 40);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setNeedleWiggle(0);
        currentAngleRef.current = desiredStopAngle;
        drawWheel(desiredStopAngle);
        wheelSounds.playCelebration();

        setWinnerStudent(winner);
        setSelectedStars(3);
        setAnswerNote('');
        setShowCelebration(true);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-200" />
            <h3 className="font-black text-sm md:text-base font-display">
              VÒNG XOAY GỌI TÊN: Lớp {className} ({students.length} HS)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!showCelebration ? (
          /* Wheel Spin View */
          <div className="p-6 flex flex-col items-center justify-center space-y-4 relative">
            {/* Pointer needle */}
            <div 
              className="absolute top-8 z-20 pointer-events-none transition-transform duration-75"
              style={{
                transform: `translateX(-50%) rotate(${needleWiggle}deg)`,
                left: '50%'
              }}
            >
              <div className="flex flex-col items-center">
                <div className="w-7 h-9 bg-red-600 rounded-b-full shadow-md border-2 border-white flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
                <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[12px] border-t-red-600 -mt-0.5"></div>
              </div>
            </div>

            <div className="cursor-pointer" onClick={handleSpin}>
              <canvas ref={canvasRef} width={420} height={420} className="max-w-full drop-shadow-md select-none" />
            </div>

            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning || students.length === 0}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-black text-sm md:text-base shadow-lg shadow-red-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>🎯 QUAY NGAY</span>
            </button>
          </div>
        ) : (
          /* Celebration & Grade View */
          winnerStudent && (
            <div className="p-6 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 border-2 border-amber-300 flex items-center justify-center mx-auto text-3xl shadow-sm">
                🏅
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">HỌC SINH ĐƯỢC GỌI TÊN LÀ</p>
                <div className="py-3 px-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 my-2">
                  <h3 className="text-2xl font-black text-slate-850 dark:text-white font-display">
                    {winnerStudent.name}
                  </h3>
                </div>
              </div>

              {/* 3 Rating cards */}
              <div className="grid grid-cols-3 gap-2 text-left">
                {[
                  { star: 1 as const, title: 'Ko trả lời được', sub: '1 Sao (Động viên)', color: 'border-amber-400' },
                  { star: 2 as const, title: 'Trả lời 1 phần', sub: '2 Sao (Khá tốt)', color: 'border-cyan-400' },
                  { star: 3 as const, title: 'Trả lời bài tốt', sub: '3 Sao (Xuất sắc)', color: 'border-emerald-400' }
                ].map(opt => (
                  <button
                    key={opt.star}
                    type="button"
                    onClick={() => setSelectedStars(opt.star)}
                    className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                      selectedStars === opt.star 
                        ? `${opt.color} bg-blue-50/60 dark:bg-slate-800 shadow-xs ring-2 ring-blue-400/20` 
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-0.5 text-amber-400 text-xs">
                      {Array.from({ length: opt.star }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                      ))}
                    </div>
                    <p className="font-extrabold text-xs text-slate-800 dark:text-slate-100 mt-1">{opt.title}</p>
                    <p className="text-[10px] text-slate-400">{opt.sub}</p>
                  </button>
                ))}
              </div>

              {/* Note input */}
              <div className="text-left space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ghi chú câu trả lời (tự động ghi vào phiếu đánh giá của em):
                </label>
                <input
                  type="text"
                  value={answerNote}
                  onChange={(e) => setAnswerNote(e.target.value)}
                  placeholder="Ví dụ: Trả lời tự tin, đúng trọng tâm câu hỏi..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />

                {/* Quick answer tag chips: Nền trắng chữ đen rõ nét */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                  <span className="text-slate-700 dark:text-slate-200 font-bold">Gợi ý nhanh:</span>
                  {[
                    'Trả lời lưu loát, xuất sắc',
                    'Hiểu bài tốt, tự tin',
                    'Nắm được ý chính',
                    'Cần chú ý nghe giảng hơn'
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setAnswerNote(tag)}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs cursor-pointer transition-all border-2 border-slate-300 hover:border-blue-500 shadow-xs active:scale-95"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCelebration(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Quay tiếp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSaveResult(winnerStudent, selectedStars, answerNote);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Lưu & Ghi nhận vào tiết học
                </button>
              </div>
            </div>
          )
        )}

      </div>
    </div>
  );
}
