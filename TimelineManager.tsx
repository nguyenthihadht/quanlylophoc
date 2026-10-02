/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
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
  HelpCircle,
  Users,
  Copy,
  CheckCircle2,
  Search,
  BookOpen,
  Layers,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  Clock,
  Sparkle,
  Edit3,
  Save,
  ClipboardList,
  CheckSquare
} from 'lucide-react';
import { TimelineWeek, Class, Grade, Student } from '../types';
import { 
  TIN_HOC_3_CURRICULUM, 
  TIN_HOC_4_CURRICULUM, 
  CONG_NGHE_5_CURRICULUM,
  CURRICULUM_PRESETS 
} from '../lib/curriculumData';

// Helper: Format date YYYY-MM-DD to DD/MM/YYYY
export const formatDateVN = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Helper: Parse date YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY
export const parseDateString = (str: string): string | null => {
  if (!str) return null;
  const s = str.trim();
  // YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const vnMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (vnMatch) {
    const d = vnMatch[1].padStart(2, '0');
    const m = vnMatch[2].padStart(2, '0');
    const y = vnMatch[3];
    return `${y}-${m}-${d}`;
  }
  return null;
};

// Helper: Extract date range from text like "Từ 01/09/2025 đến 07/09/2025" or "01/09/2025 - 07/09/2025"
export const extractDatesFromRange = (rangeStr: string): { start: string | null; end: string | null } => {
  if (!rangeStr) return { start: null, end: null };
  const dateRegex = /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/g;
  const matches = rangeStr.match(dateRegex);
  if (matches && matches.length >= 2) {
    return {
      start: parseDateString(matches[0]),
      end: parseDateString(matches[1])
    };
  } else if (matches && matches.length === 1) {
    const start = parseDateString(matches[0]);
    if (start) {
      const s = new Date(start);
      const e = new Date(s.getTime() + 6 * 86400000);
      return { start, end: e.toISOString().split('T')[0] };
    }
  }
  return { start: null, end: null };
};

// Helper: Calculate week start and end dates from base date
export const getWeekDateRange = (stt: number, baseDateStr: string = '2025-09-01') => {
  const base = new Date(baseDateStr || '2025-09-01');
  const start = new Date(base.getTime() + (stt - 1) * 7 * 86400000);
  const end = new Date(start.getTime() + 6 * 86400000);

  const startYMD = start.toISOString().split('T')[0];
  const endYMD = end.toISOString().split('T')[0];

  const startVN = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;
  const endVN = `${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}/${end.getFullYear()}`;

  return {
    startYMD,
    endYMD,
    startVN,
    endVN,
    timeRangeVN: `Từ ${startVN} đến ${endVN}`
  };
};

// Helper: Parse a single CSV row handling quotes properly
export const splitCSVRow = (rowStr: string, delim: string = ','): string[] => {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (char === '"') {
      if (inQuotes && rowStr[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delim && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
};

interface TimelineManagerProps {
  timeline: TimelineWeek[];
  classes: Class[];
  grades: Grade[];
  students: Student[];
  onSaveTimeline: (timeline: TimelineWeek[]) => void;
}

export interface ManualWeekRow {
  stt: number;
  week: string;
  startDate: string;
  endDate: string;
  lessonName: string;
  semester: 'Học kỳ 1' | 'Học kỳ 2';
}

export default function TimelineManager({ 
  timeline, 
  classes, 
  grades, 
  students, 
  onSaveTimeline 
}: TimelineManagerProps) {
  // Active selected grade: default to Grade 3, or first grade in list
  const [selectedGradeId, setSelectedGradeId] = useState<string>(() => {
    const g3 = grades.find(g => g.name.includes('3'));
    return g3?.id || grades[0]?.id || '';
  });

  // Current selected grade object
  const currentGrade = useMemo(() => {
    return grades.find(g => g.id === selectedGradeId) || grades[0];
  }, [grades, selectedGradeId]);

  // Helper to determine a grade's subject
  const getGradeSubject = (g?: Grade): 'Tin học' | 'Công nghệ' => {
    if (!g) return 'Tin học';
    if (g.name.includes('5')) return 'Công nghệ';
    return 'Tin học';
  };

  // Determine current grade subject: Tin học for Grade 3, 4; Công nghệ for Grade 5
  const currentSubject = useMemo(() => {
    return getGradeSubject(currentGrade);
  }, [currentGrade]);

  // All classes belonging to current selected grade
  const gradeClasses = useMemo(() => {
    if (!currentGrade) return [];
    return classes.filter(c => c.gradeId === currentGrade.id);
  }, [classes, currentGrade]);

  // Filter semester: 'all' | 'hk1' | 'hk2'
  const [semesterFilter, setSemesterFilter] = useState<'all' | 'Học kỳ 1' | 'Học kỳ 2'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [startDateInput, setStartDateInput] = useState('2025-09-01');

  // Inline editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStt, setEditStt] = useState(1);
  const [editWeekName, setEditWeekName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editSemester, setEditSemester] = useState<'Học kỳ 1' | 'Học kỳ 2'>('Học kỳ 1');
  const [editLessonName, setEditLessonName] = useState('');

  // Modals & Notices
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Manual 35-Week Input Modal states
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualRows, setManualRows] = useState<ManualWeekRow[]>([]);
  const [manualBaseDate, setManualBaseDate] = useState('2025-09-01');
  const [isPasteTextModalOpen, setIsPasteTextModalOpen] = useState(false);
  const [pasteTextContent, setPasteTextContent] = useState('');

  // Drag and drop
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for adding single week manually
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newStt, setNewStt] = useState(1);
  const [newWeekName, setNewWeekName] = useState('Tuần 1');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newSemester, setNewSemester] = useState<'Học kỳ 1' | 'Học kỳ 2'>('Học kỳ 1');
  const [newLessonName, setNewLessonName] = useState('');

  // Student count for selected grade
  const gradeStudentCount = useMemo(() => {
    if (!currentGrade) return students.length;
    const gClassIds = gradeClasses.map(c => c.id);
    return students.filter(s => gClassIds.includes(s.classId)).length;
  }, [students, gradeClasses, currentGrade]);

  // Get active timeline list for current selected Grade
  // Deduplicate by `stt` so exactly one row per week is displayed
  const gradeSpecificWeeks = useMemo(() => {
    if (!currentGrade) return [];
    const gId = currentGrade.id;

    // First check master grade weeks
    const masterWeeks = timeline.filter(w => w.gradeId === gId && (!w.classId || w.classId === ''));
    if (masterWeeks.length > 0) {
      const map = new Map<number, TimelineWeek>();
      masterWeeks.forEach(w => {
        if (!map.has(w.stt)) map.set(w.stt, w);
      });
      return Array.from(map.values()).sort((a, b) => a.stt - b.stt);
    }

    // Otherwise check class-level weeks
    const gClassIds = gradeClasses.map(c => c.id);
    const classWeeks = timeline.filter(w => w.classId && gClassIds.includes(w.classId));
    if (classWeeks.length > 0) {
      const map = new Map<number, TimelineWeek>();
      classWeeks.forEach(w => {
        if (!map.has(w.stt)) {
          map.set(w.stt, { ...w, gradeId: gId, classId: '' });
        }
      });
      return Array.from(map.values()).sort((a, b) => a.stt - b.stt);
    }

    return [];
  }, [timeline, currentGrade, gradeClasses]);

  // Today's date for current week highlight
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered weeks to display
  const displayedWeeks = useMemo(() => {
    let result = [...gradeSpecificWeeks];
    if (semesterFilter !== 'all') {
      result = result.filter(w => w.semester === semesterFilter);
    }
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      result = result.filter(w => 
        (w.week && w.week.toLowerCase().includes(q)) || 
        (w.lessonName && w.lessonName.toLowerCase().includes(q)) ||
        (w.stt && String(w.stt).includes(q))
      );
    }
    return result.sort((a, b) => a.stt - b.stt);
  }, [gradeSpecificWeeks, semesterFilter, searchKeyword]);

  // Helper to save a list of weeks for current grade (syncing master + all classes in this grade)
  const saveWeeksForCurrentGrade = (weeksToSave: TimelineWeek[]) => {
    if (!currentGrade) return;
    const gId = currentGrade.id;
    const gClasses = classes.filter(c => c.gradeId === gId);
    const gClassIds = gClasses.map(c => c.id);

    // Remove old weeks belonging to this grade or classes in this grade
    const otherWeeks = timeline.filter(w => {
      if (w.gradeId === gId) return false;
      if (w.classId && gClassIds.includes(w.classId)) return false;
      return true;
    });

    const newWeeks: TimelineWeek[] = [];
    weeksToSave.forEach(w => {
      // Grade master record
      newWeeks.push({
        ...w,
        id: `timeline_g_${gId}_w${w.stt}_${Date.now()}`,
        gradeId: gId,
        classId: '',
        subject: currentSubject
      });

      // Class copies
      gClasses.forEach(cls => {
        newWeeks.push({
          ...w,
          id: `timeline_c_${cls.id}_w${w.stt}_${Date.now()}`,
          gradeId: gId,
          classId: cls.id,
          subject: cls.subject || currentSubject
        });
      });
    });

    onSaveTimeline([...otherWeeks, ...newWeeks]);
  };

  // Helper to generate 35 weeks from preset lesson list for current grade
  const applyPresetCurriculum = (presetType?: 'tin_hoc_3' | 'tin_hoc_4' | 'cong_nghe_5') => {
    if (!currentGrade) return;

    let targetPreset = presetType;
    if (!targetPreset) {
      if (currentGrade.name.includes('5')) {
        targetPreset = 'cong_nghe_5';
      } else if (currentGrade.name.includes('4')) {
        targetPreset = 'tin_hoc_4';
      } else {
        targetPreset = 'tin_hoc_3';
      }
    }

    let lessonsList: string[] = [];
    let subj = 'Tin học';

    if (targetPreset === 'tin_hoc_3') {
      lessonsList = TIN_HOC_3_CURRICULUM;
      subj = 'Tin học';
    } else if (targetPreset === 'tin_hoc_4') {
      lessonsList = TIN_HOC_4_CURRICULUM;
      subj = 'Tin học';
    } else {
      lessonsList = CONG_NGHE_5_CURRICULUM;
      subj = 'Công nghệ';
    }

    const startDate = new Date(startDateInput || '2025-09-01');
    const newWeeks: TimelineWeek[] = [];

    for (let i = 1; i <= 35; i++) {
      const weekStart = new Date(startDate.getTime());
      weekStart.setDate(startDate.getDate() + (i - 1) * 7);
      
      const weekEnd = new Date(weekStart.getTime());
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];
      const semester = i <= 18 ? 'Học kỳ 1' : 'Học kỳ 2';

      newWeeks.push({
        id: `timeline_w${i}_${Date.now()}`,
        stt: i,
        week: `Tuần ${i}`,
        startDate: startStr,
        endDate: endStr,
        semester,
        lessonName: lessonsList[i - 1] || `Bài học Tuần ${i}`,
        gradeId: currentGrade.id,
        classId: '',
        subject: subj
      });
    }

    saveWeeksForCurrentGrade(newWeeks);
    setImportSuccess(`Đã nạp thành công 35 tuần chuẩn cho ${currentGrade.name} (${subj})! Áp dụng chung cho cả ${gradeClasses.length} lớp.`);
    setTimeout(() => setImportSuccess(null), 4000);
  };

  // Delete all weeks of current grade
  const handleClearCurrentGrade = () => {
    if (!currentGrade) return;

    if (confirm(`Bạn có chắc chắn muốn xóa toàn bộ phân phối chương trình của ${currentGrade.name} (sẽ xóa cho cả ${gradeClasses.length} lớp)?`)) {
      const gId = currentGrade.id;
      const gClassIds = gradeClasses.map(c => c.id);
      const otherWeeks = timeline.filter(w => {
        if (w.gradeId === gId) return false;
        if (w.classId && gClassIds.includes(w.classId)) return false;
        return true;
      });
      onSaveTimeline(otherWeeks);
      setImportSuccess(`Đã xóa phân phối chương trình của ${currentGrade.name}.`);
      setTimeout(() => setImportSuccess(null), 3000);
    }
  };

  // Open the Manual 35-Week Curriculum Editor
  const openManualModal = (gradeTargetId?: string) => {
    const targetGrade = grades.find(g => g.id === (gradeTargetId || selectedGradeId)) || currentGrade;
    if (!targetGrade) return;

    if (gradeTargetId && gradeTargetId !== selectedGradeId) {
      setSelectedGradeId(gradeTargetId);
    }

    const baseDate = startDateInput || '2025-09-01';
    setManualBaseDate(baseDate);

    // Get current weeks for target grade
    const gWeeks = timeline.filter(w => w.gradeId === targetGrade.id && (!w.classId || w.classId === ''));
    let existingWeeks = gWeeks;
    if (existingWeeks.length === 0) {
      const gClassIds = classes.filter(c => c.gradeId === targetGrade.id).map(c => c.id);
      existingWeeks = timeline.filter(w => w.classId && gClassIds.includes(w.classId));
    }

    if (existingWeeks.length > 0) {
      const map = new Map<number, TimelineWeek>();
      existingWeeks.forEach(w => {
        if (!map.has(w.stt)) map.set(w.stt, w);
      });
      const sorted = Array.from(map.values()).sort((a, b) => a.stt - b.stt);
      const rows: ManualWeekRow[] = sorted.map((w, idx) => ({
        stt: w.stt || (idx + 1),
        week: w.week || `Tuần ${idx + 1}`,
        startDate: w.startDate,
        endDate: w.endDate,
        lessonName: w.lessonName || '',
        semester: w.semester || (idx + 1 <= 18 ? 'Học kỳ 1' : 'Học kỳ 2')
      }));

      // Pad up to 35 if fewer
      if (rows.length < 35) {
        for (let i = rows.length + 1; i <= 35; i++) {
          const dateRange = getWeekDateRange(i, baseDate);
          rows.push({
            stt: i,
            week: `Tuần ${i}`,
            startDate: dateRange.startYMD,
            endDate: dateRange.endYMD,
            lessonName: '',
            semester: i <= 18 ? 'Học kỳ 1' : 'Học kỳ 2'
          });
        }
      }
      setManualRows(rows.slice(0, 35));
    } else {
      // 35 fresh rows (prefill with preset if empty!)
      const presetList = targetGrade.name.includes('5')
        ? CONG_NGHE_5_CURRICULUM
        : targetGrade.name.includes('4')
          ? TIN_HOC_4_CURRICULUM
          : TIN_HOC_3_CURRICULUM;

      const rows: ManualWeekRow[] = [];
      for (let i = 1; i <= 35; i++) {
        const dateRange = getWeekDateRange(i, baseDate);
        rows.push({
          stt: i,
          week: `Tuần ${i}`,
          startDate: dateRange.startYMD,
          endDate: dateRange.endYMD,
          lessonName: presetList[i - 1] || '',
          semester: i <= 18 ? 'Học kỳ 1' : 'Học kỳ 2'
        });
      }
      setManualRows(rows);
    }

    setIsManualModalOpen(true);
  };

  // Update a single field in the manual editor
  const updateManualRow = (index: number, field: keyof ManualWeekRow, value: any) => {
    setManualRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Recalculate all 35 dates based on a starting date
  const recalculateManualDates = (newBaseDate?: string) => {
    const targetDate = typeof newBaseDate === 'string' ? newBaseDate : manualBaseDate;
    setManualBaseDate(targetDate);
    setManualRows(prev => prev.map(r => {
      const dateRange = getWeekDateRange(r.stt, targetDate);
      return {
        ...r,
        startDate: dateRange.startYMD,
        endDate: dateRange.endYMD
      };
    }));
  };

  // Load preset curriculum suggestions into manual rows
  const loadManualPreset = (presetKey?: 'tin_hoc_3' | 'tin_hoc_4' | 'cong_nghe_5') => {
    let preset: readonly string[] = TIN_HOC_3_CURRICULUM;
    if (presetKey === 'cong_nghe_5') {
      preset = CONG_NGHE_5_CURRICULUM;
    } else if (presetKey === 'tin_hoc_4') {
      preset = TIN_HOC_4_CURRICULUM;
    } else if (presetKey === 'tin_hoc_3') {
      preset = TIN_HOC_3_CURRICULUM;
    } else {
      preset = currentSubject === 'Công nghệ'
        ? CONG_NGHE_5_CURRICULUM
        : currentGrade?.name.includes('4')
          ? TIN_HOC_4_CURRICULUM
          : TIN_HOC_3_CURRICULUM;
    }

    setManualRows(prev => prev.map((r, idx) => ({
      ...r,
      lessonName: preset[idx] || r.lessonName
    })));
  };

  // Clear lesson names for manual blank typing
  const clearManualLessonNames = () => {
    if (confirm('Bạn có chắc chắn muốn xóa trống toàn bộ tên bài để gõ tay từ đầu?')) {
      setManualRows(prev => prev.map(r => ({ ...r, lessonName: '' })));
    }
  };

  // Paste multiple lesson lines into manual rows
  const handleApplyPastedLessons = () => {
    const lines = pasteTextContent
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      alert('Vui lòng dán văn bản có chứa các dòng tên bài học.');
      return;
    }

    setManualRows(prev => {
      return prev.map((row, idx) => {
        if (idx < lines.length) {
          // Clean prefixes like "Tuần 1:", "Tuần 1 -", "1.", "1/"
          const cleaned = lines[idx].replace(/^(Tuần\s*\d+[\s:\-–—]+|\d+[\.\/\-–—]\s*)/i, '').trim();
          return { ...row, lessonName: cleaned || lines[idx] };
        }
        return row;
      });
    });

    setIsPasteTextModalOpen(false);
    setPasteTextContent('');
    setImportSuccess(`Đã áp dụng ${lines.length} bài học vào 35 tuần!`);
    setTimeout(() => setImportSuccess(null), 3000);
  };

  // Save the manual 35-week curriculum
  const saveManualCurriculum = () => {
    if (!currentGrade) return;

    const weeksToSave: TimelineWeek[] = manualRows.map(r => ({
      id: `manual_w${r.stt}_${Date.now()}`,
      stt: r.stt,
      week: r.week || `Tuần ${r.stt}`,
      startDate: r.startDate,
      endDate: r.endDate,
      semester: r.semester,
      lessonName: r.lessonName.trim() || `Bài học Tuần ${r.stt}`,
      gradeId: currentGrade.id,
      classId: '',
      subject: currentSubject
    }));

    saveWeeksForCurrentGrade(weeksToSave);
    setIsManualModalOpen(false);
    setImportSuccess(`Đã lưu thành công phân phối 35 tuần cho ${currentGrade.name} (${currentSubject})! Áp dụng chung cho cả ${gradeClasses.length} lớp.`);
    setTimeout(() => setImportSuccess(null), 4000);
  };

  // Quick initialize 35 blank weeks for current grade
  const initialize35BlankWeeks = () => {
    if (!currentGrade) return;
    const baseDate = startDateInput || '2025-09-01';
    const newWeeks: TimelineWeek[] = [];

    for (let i = 1; i <= 35; i++) {
      const dateRange = getWeekDateRange(i, baseDate);
      newWeeks.push({
        id: `timeline_w${i}_${Date.now()}`,
        stt: i,
        week: `Tuần ${i}`,
        startDate: dateRange.startYMD,
        endDate: dateRange.endYMD,
        semester: i <= 18 ? 'Học kỳ 1' : 'Học kỳ 2',
        lessonName: '',
        gradeId: currentGrade.id,
        classId: '',
        subject: currentSubject
      });
    }

    saveWeeksForCurrentGrade(newWeeks);
    setImportSuccess(`Đã khởi tạo khung 35 tuần trống cho ${currentGrade.name}. Bạn có thể nhập bài ngay!`);
    setTimeout(() => setImportSuccess(null), 4000);
  };

  // Add a single week manually
  const handleAddWeek = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStartDate || !newEndDate) {
      setImportError('Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }

    const targetWeekNumber = Number(newStt) || (gradeSpecificWeeks.length + 1);
    const newWeek: TimelineWeek = {
      id: `timeline_w${Date.now()}`,
      stt: targetWeekNumber,
      week: newWeekName || `Tuần ${targetWeekNumber}`,
      startDate: newStartDate,
      endDate: newEndDate,
      semester: newSemester,
      lessonName: newLessonName.trim() || `Bài học Tuần ${targetWeekNumber}`,
      gradeId: currentGrade?.id,
      classId: '',
      subject: currentSubject
    };

    let updatedWeeks = [...gradeSpecificWeeks.filter(w => w.stt !== targetWeekNumber), newWeek];
    updatedWeeks.sort((a, b) => a.stt - b.stt);

    saveWeeksForCurrentGrade(updatedWeeks);

    setNewStt(updatedWeeks.length + 1);
    setNewWeekName(`Tuần ${updatedWeeks.length + 1}`);
    setNewStartDate('');
    setNewEndDate('');
    setNewLessonName('');
    setIsAddFormOpen(false);
    setImportError(null);
    setImportSuccess('Đã thêm tuần mới vào phân phối chương trình!');
    setTimeout(() => setImportSuccess(null), 3000);
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

  // Save inline edit
  const saveEditing = (id: string) => {
    let updatedWeeks = gradeSpecificWeeks.map(w => {
      if (w.id === id || w.stt === Number(editStt)) {
        return {
          ...w,
          stt: Number(editStt),
          week: editWeekName,
          startDate: editStartDate,
          endDate: editEndDate,
          semester: editSemester,
          lessonName: editLessonName.trim(),
          gradeId: currentGrade?.id,
          classId: '',
          subject: currentSubject
        };
      }
      return w;
    }).sort((a, b) => a.stt - b.stt);

    saveWeeksForCurrentGrade(updatedWeeks);
    setEditingId(null);
    setImportSuccess('Đã lưu cập nhật tuần học!');
    setTimeout(() => setImportSuccess(null), 3000);
  };

  // Delete single week
  const handleDeleteWeek = (id: string) => {
    const updatedWeeks = gradeSpecificWeeks.filter(w => w.id !== id);
    saveWeeksForCurrentGrade(updatedWeeks);
    setImportSuccess('Đã xóa tuần học!');
    setTimeout(() => setImportSuccess(null), 3000);
  };

  // Parse CSV function with enhanced column detection
  const parseCSV = (text: string) => {
    try {
      // Remove UTF-8 BOM if present
      const cleanText = text.replace(/^\uFEFF/, '');
      const rawLines = cleanText.split(/\r?\n/);
      const lines = rawLines.map(l => l.trim()).filter(l => l.length > 0);

      if (lines.length < 2) {
        throw new Error('Tệp rỗng hoặc không có dữ liệu các tuần học.');
      }

      // Detect delimiter from header (comma or semicolon or tab)
      const firstLine = lines[0];
      const delim = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

      // Parse header line to determine column positions
      const headerTokens = splitCSVRow(firstLine, delim).map(h => h.toLowerCase().replace(/["']/g, '').trim());

      let colWeek = -1;
      let colTimeRange = -1;
      let colStartDate = -1;
      let colEndDate = -1;
      let colLesson = -1;
      let colSemester = -1;
      let colStt = -1;
      let colGradeClass = -1;

      headerTokens.forEach((h, idx) => {
        if (h.includes('số thứ tự tuần') || h.includes('so thu tu tuan') || h.includes('stt tuần') || h.includes('stt tuan')) {
          colStt = idx;
          colWeek = idx;
        } else if (h.includes('thời gian bắt đầu') || h.includes('thoi gian bat dau') || h.includes('ngày bắt đầu') || h.includes('ngay bat dau') || h.includes('từ ngày') || h.includes('tu ngay') || h.includes('start')) {
          colStartDate = idx;
        } else if (h.includes('thời gian kết thúc') || h.includes('thoi gian ket thuc') || h.includes('ngày kết thúc') || h.includes('ngay ket thuc') || h.includes('đến ngày') || h.includes('den ngay') || h.includes('end')) {
          colEndDate = idx;
        } else if (h.includes('tên bài') || h.includes('ten bai') || h.includes('bài học') || h.includes('bai hoc') || h.includes('tên bài dạy') || h.includes('chủ đề') || h.includes('chu de') || h.includes('nội dung') || h.includes('lesson')) {
          colLesson = idx;
        } else if (h.includes('khối lớp') || h.includes('khoi lop') || h.includes('khối') || h.includes('khoi') || h.includes('lớp') || h.includes('lop') || h.includes('grade') || h.includes('class')) {
          colGradeClass = idx;
        } else if (h.includes('học kỳ') || h.includes('hoc ky') || h.includes('semester') || h.includes('hk')) {
          colSemester = idx;
        } else if (h.includes('thời gian trong tuần') || h.includes('thời gian') || h.includes('thoi gian')) {
          colTimeRange = idx;
        } else if (h.includes('stt') || h === 'no' || h === 'id') {
          colStt = idx;
        } else if (h.includes('tuần') || h.includes('tuan') || h === 'week') {
          colWeek = idx;
        }
      });

      const importedWeeks: TimelineWeek[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const parts = splitCSVRow(line, delim).map(p => p.replace(/^["']|["']$/g, '').trim());
        if (parts.length < 2) continue;

        let stt = i;
        let week = `Tuần ${i}`;
        let lessonName = '';
        let startDate = '';
        let endDate = '';
        let semester: 'Học kỳ 1' | 'Học kỳ 2' = i <= 18 ? 'Học kỳ 1' : 'Học kỳ 2';
        let rowGradeClass = '';

        if (colLesson !== -1 && parts[colLesson] !== undefined) {
          // Mapped by header names
          lessonName = parts[colLesson] || '';

          if (colStt !== -1 && parts[colStt]) {
            const numMatch = parts[colStt].match(/\d+/);
            if (numMatch) {
              stt = parseInt(numMatch[0], 10);
              week = `Tuần ${stt}`;
            } else {
              week = parts[colStt];
            }
          } else if (colWeek !== -1 && parts[colWeek]) {
            const numMatch = parts[colWeek].match(/\d+/);
            if (numMatch) {
              stt = parseInt(numMatch[0], 10);
              week = `Tuần ${stt}`;
            } else {
              week = parts[colWeek];
            }
          }

          // Read explicit start date
          if (colStartDate !== -1 && parts[colStartDate]) {
            const parsedS = parseDateString(parts[colStartDate]);
            if (parsedS) startDate = parsedS;
          }

          // Read explicit end date
          if (colEndDate !== -1 && parts[colEndDate]) {
            const parsedE = parseDateString(parts[colEndDate]);
            if (parsedE) endDate = parsedE;
          }

          // If dates still missing, check time range column "Từ DD/MM/YYYY đến DD/MM/YYYY"
          if ((!startDate || !endDate) && colTimeRange !== -1 && parts[colTimeRange]) {
            const extracted = extractDatesFromRange(parts[colTimeRange]);
            if (extracted.start) startDate = extracted.start;
            if (extracted.end) endDate = extracted.end;
          }

          // Read Grade/Class column
          if (colGradeClass !== -1 && parts[colGradeClass]) {
            rowGradeClass = parts[colGradeClass];
          }

          // Read Semester
          if (colSemester !== -1 && parts[colSemester]) {
            const semStr = parts[colSemester].toLowerCase();
            semester = (semStr.includes('2') || semStr.includes('ii') || semStr.includes('hk2')) ? 'Học kỳ 2' : 'Học kỳ 1';
          }
        } else {
          // Fallback positional handling
          if (parts.length >= 5) {
            // Priority Format: [Số thứ tự tuần, Thời gian bắt đầu, Thời gian kết thúc, Tên bài, Khối lớp, (Học kỳ)]
            const p0 = parts[0];
            const p1 = parts[1];
            const p2 = parts[2];
            const p3 = parts[3];
            const p4 = parts[4];
            const p5 = parts[5];

            const numMatch = p0.match(/\d+/);
            stt = numMatch ? parseInt(numMatch[0], 10) : i;
            week = p0.includes('Tuần') ? p0 : `Tuần ${stt}`;

            // Check if p1 & p2 are dates, and p3 is lessonName
            const parsedDate1 = parseDateString(p1);
            const parsedDate2 = parseDateString(p2);

            if (parsedDate1 && parsedDate2) {
              // Exact 5/6 column layout: [STT Tuần, Bắt đầu, Kết thúc, Tên bài, Khối lớp, Học kỳ]
              startDate = parsedDate1;
              endDate = parsedDate2;
              lessonName = p3;
              rowGradeClass = p4;
              if (p5) {
                const sStr = p5.toLowerCase();
                semester = (sStr.includes('2') || sStr.includes('ii')) ? 'Học kỳ 2' : 'Học kỳ 1';
              } else {
                semester = stt <= 18 ? 'Học kỳ 1' : 'Học kỳ 2';
              }
            } else if (parts.length >= 6) {
              // Legacy 6 columns: [Tuần, Thời gian VN, Từ ngày, Đến ngày, Tên bài, Học kỳ]
              if (isNaN(Date.parse(p4)) && p4.length > 0) {
                lessonName = p4;
                startDate = parseDateString(p2) || '';
                endDate = parseDateString(p3) || '';
                if (!startDate || !endDate) {
                  const extracted = extractDatesFromRange(p1);
                  if (extracted.start) startDate = extracted.start;
                  if (extracted.end) endDate = extracted.end;
                }
                const sStr = p5.toLowerCase();
                semester = (sStr.includes('2') || sStr.includes('ii')) ? 'Học kỳ 2' : 'Học kỳ 1';
              } else {
                stt = Number(p0) || i;
                week = p1 || `Tuần ${stt}`;
                lessonName = p2;
                startDate = parseDateString(p3) || p3;
                endDate = parseDateString(p4) || p4;
                const sStr = p5.toLowerCase();
                semester = (sStr.includes('2') || sStr.includes('ii')) ? 'Học kỳ 2' : 'Học kỳ 1';
              }
            }
          } else if (parts.length === 3) {
            // [Số thứ tự tuần, Khối lớp, Tên bài] or [Tuần, Thời gian, Tên bài]
            const p0 = parts[0];
            const p1 = parts[1];
            const p2 = parts[2];

            const numMatch = p0.match(/\d+/);
            stt = numMatch ? parseInt(numMatch[0], 10) : i;
            week = p0.includes('Tuần') ? p0 : `Tuần ${stt}`;

            const p1Lower = p1.toLowerCase();
            if (p1Lower.includes('khối') || p1Lower.includes('khoi') || p1Lower.includes('lớp') || p1Lower.includes('lop') || /^[345]/.test(p1.trim())) {
              // Exact 3 columns: Số thứ tự tuần, Khối lớp, Tên bài
              rowGradeClass = p1;
              lessonName = p2;
            } else {
              // Legacy format: [Tuần, Thời gian trong tuần, Tên bài]
              lessonName = p2;
              const extracted = extractDatesFromRange(p1);
              if (extracted.start) startDate = extracted.start;
              if (extracted.end) endDate = extracted.end;
            }
            semester = stt <= 18 ? 'Học kỳ 1' : 'Học kỳ 2';
          } else if (parts.length === 4) {
            // [Tuần, Thời gian trong tuần, Tên bài, Học kỳ]
            const p0 = parts[0];
            const p1 = parts[1];
            const p2 = parts[2];
            const p3 = parts[3];

            const numMatch = p0.match(/\d+/);
            stt = numMatch ? parseInt(numMatch[0], 10) : i;
            week = p0.includes('Tuần') ? p0 : `Tuần ${stt}`;
            lessonName = p2;

            const extracted = extractDatesFromRange(p1);
            if (extracted.start) startDate = extracted.start;
            if (extracted.end) endDate = extracted.end;
            const sStr = p3.toLowerCase();
            semester = (sStr.includes('2') || sStr.includes('ii')) ? 'Học kỳ 2' : 'Học kỳ 1';
          } else {
            // Generic 2+ columns: assume last column is lesson name
            lessonName = parts[parts.length - 1];
            const numMatch = parts[0].match(/\d+/);
            stt = numMatch ? parseInt(numMatch[0], 10) : i;
            week = parts[0].includes('Tuần') ? parts[0] : `Tuần ${stt}`;
          }
        }

        // Fill dates automatically if missing
        if (!startDate || !endDate) {
          const defaultRange = getWeekDateRange(stt, startDateInput || '2025-09-01');
          if (!startDate) startDate = defaultRange.startYMD;
          if (!endDate) endDate = defaultRange.endYMD;
        }

        // Determine class, grade, and subject from rowGradeClass if available
        let rowGradeId = currentGrade?.id;
        let rowSubject = currentSubject;

        if (rowGradeClass) {
          const rgLower = rowGradeClass.toLowerCase();
          // Check if specifies grade (Khối 3, Khối 4, Khối 5)
          const matchedGrade = grades.find(g => 
            g.name.toLowerCase().includes(rgLower) || 
            rgLower.includes(g.name.toLowerCase()) ||
            (rgLower.includes('3') && g.name.includes('3')) ||
            (rgLower.includes('4') && g.name.includes('4')) ||
            (rgLower.includes('5') && g.name.includes('5'))
          );
          if (matchedGrade) {
            rowGradeId = matchedGrade.id;
            rowSubject = getGradeSubject(matchedGrade);
          } else {
            // Check if matches class to derive its grade
            const matchedClass = classes.find(c => 
              c.name.toLowerCase() === rgLower || 
              rgLower === `lớp ${c.name.toLowerCase()}` || 
              rgLower === `lop ${c.name.toLowerCase()}`
            );
            if (matchedClass) {
              rowGradeId = matchedClass.gradeId;
              const g = grades.find(gr => gr.id === matchedClass.gradeId);
              rowSubject = getGradeSubject(g);
            }
          }
        }

        importedWeeks.push({
          id: `timeline_w${stt}_${Date.now()}_${i}`,
          stt,
          week: week || `Tuần ${stt}`,
          startDate,
          endDate,
          semester,
          lessonName: lessonName || `Bài học Tuần ${stt}`,
          gradeId: rowGradeId,
          classId: '',
          subject: rowSubject
        });
      }

      if (importedWeeks.length === 0) {
        throw new Error('Không tìm thấy dòng dữ liệu bài học hợp lệ nào.');
      }

      importedWeeks.sort((a, b) => a.stt - b.stt);

      // Identify target grade
      const targetGradeId = importedWeeks[0].gradeId || currentGrade?.id;
      const targetGrade = grades.find(g => g.id === targetGradeId) || currentGrade;

      if (targetGrade) {
        const targetClasses = classes.filter(c => c.gradeId === targetGrade.id);
        const targetClassIds = targetClasses.map(c => c.id);
        const otherWeeks = timeline.filter(w => {
          if (w.gradeId === targetGrade.id) return false;
          if (w.classId && targetClassIds.includes(w.classId)) return false;
          return true;
        });
        
        const allNewWeeks: TimelineWeek[] = [];
        // Grade master
        importedWeeks.forEach(w => {
          allNewWeeks.push({
            ...w,
            id: `timeline_g_${targetGrade.id}_w${w.stt}_${Date.now()}`,
            classId: '',
            gradeId: targetGrade.id,
            subject: w.subject || getGradeSubject(targetGrade)
          });
        });

        // Sync to all classes of this grade
        targetClasses.forEach(cls => {
          importedWeeks.forEach(w => {
            allNewWeeks.push({
              ...w,
              id: `timeline_c_${cls.id}_w${w.stt}_${Date.now()}`,
              classId: cls.id,
              gradeId: targetGrade.id,
              subject: cls.subject || w.subject || getGradeSubject(targetGrade)
            });
          });
        });

        onSaveTimeline([...otherWeeks, ...allNewWeeks]);
        setImportSuccess(`Đã nạp thành công ${importedWeeks.length} tuần cho ${targetGrade.name}! Tự động áp dụng chung cho toàn bộ ${targetClasses.length} lớp.`);
      }

      setIsUploadModalOpen(false);
      setImportError(null);
      setTimeout(() => setImportSuccess(null), 5000);
    } catch (err: any) {
      setImportError(err.message || 'Lỗi xử lý file CSV. Vui lòng kiểm tra lại định dạng.');
    }
  };

  // Drag-and-drop
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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setImportError('Vui lòng chọn tệp định dạng .csv hoặc .txt');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseCSV(content);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Export Template CSV with requested columns: Số thứ tự tuần, Khối lớp, Tên bài
  const downloadTemplate = (type: 'tin_hoc_3' | 'tin_hoc_4' | 'cong_nghe_5' | 'current_grade' | 'blank') => {
    // Header includes strictly requested 3 columns: Số thứ tự tuần, Khối lớp, Tên bài
    const headers = 'Số thứ tự tuần,Khối lớp,Tên bài\n';
    let rows = '';
    let filenameSubject = 'tin_hoc_3';

    if (type === 'tin_hoc_3') {
      filenameSubject = 'Tin_Hoc_Lop_3';
      rows = TIN_HOC_3_CURRICULUM.map((lesson, idx) => {
        const i = idx + 1;
        return `${i},Khối 3,"${lesson.replace(/"/g, '""')}"\n`;
      }).join('');
    } else if (type === 'tin_hoc_4') {
      filenameSubject = 'Tin_Hoc_Lop_4';
      rows = TIN_HOC_4_CURRICULUM.map((lesson, idx) => {
        const i = idx + 1;
        return `${i},Khối 4,"${lesson.replace(/"/g, '""')}"\n`;
      }).join('');
    } else if (type === 'cong_nghe_5') {
      filenameSubject = 'Cong_Nghe_Lop_5';
      rows = CONG_NGHE_5_CURRICULUM.map((lesson, idx) => {
        const i = idx + 1;
        return `${i},Khối 5,"${lesson.replace(/"/g, '""')}"\n`;
      }).join('');
    } else if (type === 'current_grade') {
      const gradeLabel = currentGrade?.name || 'Khối 3';
      const cleanGradeName = gradeLabel.replace(/\s+/g, '_');
      filenameSubject = `${cleanGradeName}_${currentSubject === 'Công nghệ' ? 'Cong_Nghe' : 'Tin_Hoc'}`;
      
      if (gradeSpecificWeeks.length > 0) {
        rows = gradeSpecificWeeks.map((w, idx) => {
          const i = w.stt || (idx + 1);
          return `${i},${gradeLabel},"${(w.lessonName || '').replace(/"/g, '""')}"\n`;
        }).join('');
      } else {
        // Fallback to 35 weeks preset based on grade
        const presetList = currentSubject === 'Công nghệ' 
          ? CONG_NGHE_5_CURRICULUM 
          : currentGrade?.name.includes('4') 
            ? TIN_HOC_4_CURRICULUM 
            : TIN_HOC_3_CURRICULUM;

        rows = presetList.map((lesson, idx) => {
          const i = idx + 1;
          return `${i},${gradeLabel},"${lesson.replace(/"/g, '""')}"\n`;
        }).join('');
      }
    } else {
      filenameSubject = 'Khung_Mau_35_Tuan';
      const gradeLabel = currentGrade?.name || 'Khối 3';
      // 35 weeks empty frame with weeks, ready for teacher to fill lesson names
      const blankWeeks: string[] = [];
      for (let i = 1; i <= 35; i++) {
        blankWeeks.push(`${i},${gradeLabel},""\n`);
      }
      rows = blankWeeks.join('');
    }

    const csvContent = '\uFEFF' + headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Phan_Phoi_Chuong_Trinh_${filenameSubject}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="timeline_manager_panel" className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-750 text-white p-6 rounded-2xl shadow-sm border border-blue-500/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/20 text-white backdrop-blur-xs border border-white/25">
                Kế hoạch giảng dạy
              </span>
              <span className="text-xs text-blue-100 font-medium">
                • Tin học 3, 4 & Công nghệ 5
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight font-display">
              Phân Phối Chương Trình Theo Khối Lớp
            </h2>
            <p className="text-blue-100 text-xs md:text-sm mt-1 max-w-2xl">
              Nhập và tùy biến phân phối chương trình 35 tuần theo từng Khối (Khối 3, Khối 4, Khối 5). Hệ thống tự động áp dụng chung cho tất cả các lớp trong khối và đồng bộ vào Nhật ký giảng dạy, Đánh giá học sinh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Download Template for active subject */}
            <button
              onClick={() => downloadTemplate(currentSubject === 'Công nghệ' ? 'cong_nghe_5' : currentGrade?.name.includes('4') ? 'tin_hoc_4' : 'tin_hoc_3')}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs md:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
              title={`Tải file mẫu Excel (.csv) môn ${currentSubject} có cột Tuần, Thời gian, Tên bài để import`}
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-950" /> Xuất file mẫu môn {currentSubject}
            </button>

            {/* Dropdown for other subjects */}
            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs md:text-sm rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-white/25"
                title="Chọn môn hoặc khối cụ thể để xuất file mẫu"
              >
                <Download className="w-4 h-4" /> Xuất mẫu từng môn <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-150 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Chọn môn học xuất mẫu (.csv):
                  </div>
                  <button
                    onClick={() => { downloadTemplate('tin_hoc_3'); setIsExportMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-xs rounded-xl hover:bg-blue-50 dark:hover:bg-slate-750 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>💻</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Tin học - Khối 3</span>
                    </div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">35 tuần</span>
                  </button>
                  <button
                    onClick={() => { downloadTemplate('tin_hoc_4'); setIsExportMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-xs rounded-xl hover:bg-blue-50 dark:hover:bg-slate-750 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>💻</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Tin học - Khối 4</span>
                    </div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">35 tuần</span>
                  </button>
                  <button
                    onClick={() => { downloadTemplate('cong_nghe_5'); setIsExportMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-xs rounded-xl hover:bg-amber-50 dark:hover:bg-slate-750 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>🛠️</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Công nghệ - Khối 5</span>
                    </div>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded-md">35 tuần</span>
                  </button>
                  <div className="border-t border-slate-150 dark:border-slate-750 my-1.5" />
                  <button
                    onClick={() => { downloadTemplate('current_grade'); setIsExportMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Mẫu theo {currentGrade?.name || 'Khối đang chọn'} ({currentSubject})
                    </span>
                  </button>
                  <button
                    onClick={() => { downloadTemplate('blank'); setIsExportMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                    <span>Khung mẫu trống 35 tuần (tự điền bài)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Manual 35-Week Input Button */}
            <button
              onClick={openManualModal}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs md:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer border border-emerald-300"
              title="Nhập thủ công phân phối chương trình 35 tuần với chữ trắng nền tối"
            >
              <Edit3 className="w-4 h-4 text-slate-950" /> Nhập thủ công 35 tuần
            </button>

            {/* Upload Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs md:text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Import file lên (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {importSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{importSuccess}</span>
        </div>
      )}
      {importError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-sm flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{importError}</span>
        </div>
      )}

      {/* Grade Selector & Control Bar */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs space-y-4">
        {/* Nút Chọn Khối (Khối 3, Khối 4, Khối 5) */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏫</span> Nút Chọn Khối Lớp Nhập Phân Phối:
            </label>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Đang chọn: <strong className="text-blue-600 dark:text-blue-400 font-black">{currentGrade?.name}</strong> • Môn: <strong className="text-amber-600 dark:text-amber-400 font-black">{currentSubject}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {grades.map(g => {
              const isSelected = g.id === selectedGradeId;
              const gSubject = getGradeSubject(g);
              const gClasses = classes.filter(c => c.gradeId === g.id);
              
              // Count weeks for this grade
              const masterWeeks = timeline.filter(w => w.gradeId === g.id && (!w.classId || w.classId === ''));
              let gWeeksCount = masterWeeks.length;
              if (gWeeksCount === 0) {
                const gClassIds = gClasses.map(c => c.id);
                const classWeeks = timeline.filter(w => w.classId && gClassIds.includes(w.classId));
                const distinctStts = new Set(classWeeks.map(w => w.stt));
                gWeeksCount = distinctStts.size;
              }

              const hasWeeks = gWeeksCount > 0;

              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGradeId(g.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-xs ${
                    isSelected
                      ? gSubject === 'Công nghệ'
                        ? 'bg-amber-500 text-slate-950 font-black border-amber-600 ring-2 ring-amber-400 shadow-md scale-[1.01]'
                        : 'bg-blue-600 text-white font-black border-blue-700 ring-2 ring-blue-400 shadow-md scale-[1.01]'
                      : 'bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-650 hover:bg-blue-50/60 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{gSubject === 'Công nghệ' ? '🛠️' : '💻'}</span>
                      <span className="font-extrabold text-sm md:text-base tracking-tight">{g.name}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isSelected
                        ? 'bg-black/20 text-inherit'
                        : gSubject === 'Công nghệ'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300'
                    }`}>
                      {gSubject}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-xs">
                    <span className={`text-[11px] ${isSelected ? 'opacity-90' : 'text-slate-500 dark:text-slate-400'}`}>
                      {gClasses.length} lớp ({gClasses.map(c => c.name).join(', ') || 'Chưa có lớp'})
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isSelected
                        ? 'bg-black/20 text-inherit'
                        : hasWeeks
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {hasWeeks ? `${gWeeksCount}/35 tuần` : 'Chưa có bài'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Thanh trạng thái và hành động cho Khối đang chọn */}
        {currentGrade && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-750 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Đang quản lý: <strong className="text-blue-600 dark:text-blue-400">{currentGrade.name}</strong> ({currentSubject})
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                gradeSpecificWeeks.length > 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
              }`}>
                {gradeSpecificWeeks.length}/35 tuần
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                • Áp dụng chung cho {gradeClasses.length} lớp: <strong className="text-slate-700 dark:text-slate-200">{gradeClasses.map(c => c.name).join(', ')}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openManualModal(currentGrade.id)}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="Nhập thủ công toàn bộ phân phối 35 tuần với chữ trắng nền tối"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-300" /> Nhập thủ công 35 tuần
              </button>

              <button
                type="button"
                onClick={() => downloadTemplate('current_grade')}
                className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title={`Xuất file mẫu PPCT của ${currentGrade.name} (${currentSubject})`}
              >
                <Download className="w-3.5 h-3.5" /> Xuất file mẫu môn {currentSubject}
              </button>

              <button
                type="button"
                onClick={handleClearCurrentGrade}
                className="px-3 py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Xóa phân phối của khối này"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa của khối này
              </button>
            </div>
          </div>
        )}

        {/* Nạp nhanh 35 tuần chuẩn hoặc khởi tạo khung trống */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-750">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nạp mẫu chuẩn Bộ GD&ĐT (CT 2018) cho {currentGrade?.name}:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentGrade?.name.includes('5') ? (
                <button
                  type="button"
                  onClick={() => applyPresetCurriculum('cong_nghe_5')}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>🛠️</span> Nạp 35 tuần chuẩn Công nghệ 5
                </button>
              ) : currentGrade?.name.includes('4') ? (
                <button
                  type="button"
                  onClick={() => applyPresetCurriculum('tin_hoc_4')}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>💻</span> Nạp 35 tuần chuẩn Tin học 4
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => applyPresetCurriculum('tin_hoc_3')}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>💻</span> Nạp 35 tuần chuẩn Tin học 3
                </button>
              )}

              <button
                type="button"
                onClick={initialize35BlankWeeks}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Tạo sẵn khung 35 tuần trống cho khối đang chọn để gõ trực tiếp"
              >
                <span>✨</span> Khởi tạo 35 tuần trống nhập tay
              </button>
              <button
                type="button"
                onClick={() => downloadTemplate('blank')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                title="Tải file CSV khung 35 tuần trống có sẵn ngày"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" /> Tải file mẫu trống
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-700 shadow-xs overflow-hidden">
        {/* Table Filters & Toolbar */}
        <div className="p-4 md:p-5 border-b border-slate-150 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Semester Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-750 p-1 rounded-xl">
              <button
                onClick={() => setSemesterFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  semesterFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Toàn năm ({gradeSpecificWeeks.length} tuần)
              </button>
              <button
                onClick={() => setSemesterFilter('Học kỳ 1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  semesterFilter === 'Học kỳ 1'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Học kỳ 1 (Tuần 1 - 18)
              </button>
              <button
                onClick={() => setSemesterFilter('Học kỳ 2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  semesterFilter === 'Học kỳ 2'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Học kỳ 2 (Tuần 19 - 35)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search input - dark background white text */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm bài học, tuần..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-slate-950 text-white border border-slate-700 rounded-xl text-xs placeholder-slate-400 outline-none focus:ring-2 focus:ring-cyan-400 w-44 md:w-56 [color-scheme:dark]"
              />
            </div>

            <button
              onClick={() => setIsAddFormOpen(!isAddFormOpen)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm tuần
            </button>
          </div>
        </div>

        {/* Add Week Collapsible Form - High Contrast Dark Theme */}
        {isAddFormOpen && (
          <form onSubmit={handleAddWeek} className="p-5 bg-slate-900 border-b border-slate-750 text-white space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" /> Thêm tuần mới cho {currentGrade?.name || 'Khối đang chọn'}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-medium">
                  Chữ trắng trên nền tối
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Số thứ tự tuần</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-bold">Tuần</span>
                  <input
                    type="number"
                    value={newStt}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setNewStt(v);
                      setNewWeekName(`Tuần ${v}`);
                      setNewSemester(v <= 18 ? 'Học kỳ 1' : 'Học kỳ 2');
                    }}
                    className="w-full px-3 py-2 bg-slate-950 text-white border border-slate-700 rounded-xl text-xs font-bold [color-scheme:dark] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Khối lớp</label>
                <div className="px-3 py-2 bg-slate-950 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center min-h-[38px]">
                  {currentGrade?.name || 'Khối 3'} ({currentSubject})
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Tên bài</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bài 5: Sử dụng bàn phím máy tính"
                  value={newLessonName}
                  onChange={(e) => setNewLessonName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 text-white border border-slate-700 rounded-xl text-xs font-semibold [color-scheme:dark] placeholder-slate-500 focus:bg-black focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black shadow-xs cursor-pointer"
              >
                Lưu tuần này
              </button>
            </div>
          </form>
        )}

        {/* Weeks Table List */}
        {displayedWeeks.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                {currentGrade?.name || 'Khối này'} chưa có phân phối chương trình
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Thầy Cô có thể nhập thủ công 35 tuần (chữ trắng nền tối), tải tệp CSV lên, hoặc nạp nhanh theo mẫu chuẩn Bộ GD&ĐT.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button
                onClick={openManualModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4 text-cyan-300" /> Nhập thủ công 35 tuần
              </button>
              <button
                onClick={initialize35BlankWeeks}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>✨</span> Khởi tạo 35 tuần trống
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" /> Tải file CSV lên
              </button>
              {currentSubject === 'Tin học' ? (
                <button
                  onClick={() => applyPresetCurriculum(currentGrade?.name.includes('4') ? 'tin_hoc_4' : 'tin_hoc_3')}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" /> Nạp mẫu Tin học chuẩn
                </button>
              ) : (
                <button
                  onClick={() => applyPresetCurriculum('cong_nghe_5')}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-200 dark:border-amber-800 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" /> Nạp mẫu Công nghệ 5 chuẩn
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850/70 border-b border-slate-150 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider">
                  <th className="py-3 px-4 w-36 text-center">Số thứ tự tuần</th>
                  <th className="py-3 px-4 w-40">Khối lớp</th>
                  <th className="py-3 px-4">Tên bài</th>
                  <th className="py-3 px-4 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {displayedWeeks.map((w) => {
                  const isEditing = editingId === w.id;

                  if (isEditing) {
                    return (
                      <tr key={w.id} className="bg-slate-900 text-white border-y-2 border-cyan-400 shadow-md">
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs text-slate-400 font-bold">Tuần</span>
                            <input
                              type="number"
                              value={editStt}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setEditStt(v);
                                setEditWeekName(`Tuần ${v}`);
                              }}
                              className="w-14 px-2 py-1 bg-slate-950 text-white border border-slate-700 rounded-lg text-center font-bold [color-scheme:dark] focus:border-cyan-400 outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                            {currentGrade?.name || 'Khối 3'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editLessonName}
                            onChange={(e) => setEditLessonName(e.target.value)}
                            placeholder="Nhập tên bài học..."
                            className="w-full px-3 py-1.5 bg-slate-950 text-white border border-slate-700 rounded-lg font-bold text-xs [color-scheme:dark] placeholder-slate-500 focus:bg-black focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => saveEditing(w.id)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer shadow-xs"
                              title="Lưu thay đổi"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr 
                      key={w.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-blue-600 dark:text-blue-400 font-mono text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200/50 dark:border-blue-900/50">
                          {w.week || `Tuần ${w.stt}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          currentSubject === 'Công nghệ' 
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300' 
                            : 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300'
                        }`}>
                          {currentGrade?.name || 'Khối'} ({currentSubject})
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                          {w.lessonName || 'Chưa đặt tên bài'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEditing(w)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                            title="Sửa tuần này"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Xóa ${w.week}?`)) {
                                handleDeleteWeek(w.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                            title="Xóa tuần này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Upload File CSV */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Upload className="w-5 h-5" /> Tải Lên Phân Phối Chương Trình
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Áp dụng chung cho Khối {currentGrade?.name} ({currentSubject} • {gradeClasses.length} lớp)
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Grade Selector inside Upload Modal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Chọn Khối Lớp Cần Nạp Phân Phối:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {grades.map(g => {
                    const isSelected = g.id === selectedGradeId;
                    const gSubj = getGradeSubject(g);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGradeId(g.id)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                          isSelected
                            ? gSubj === 'Công nghệ'
                              ? 'bg-amber-500 text-slate-950 font-black border-amber-600 ring-2 ring-amber-400'
                              : 'bg-blue-600 text-white font-black border-blue-700 ring-2 ring-blue-400'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div>{gSubj === 'Công nghệ' ? '🛠️' : '💻'} {g.name}</div>
                        <div className="text-[10px] opacity-80 mt-0.5 font-normal">{gSubj}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dedicated Template Download Section */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-black text-blue-950 dark:text-blue-200">
                      Xuất file mẫu phân phối chương trình từng môn:
                    </span>
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-700">
                    Mở bằng Excel
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  File mẫu gồm sẵn các cột: <strong className="text-blue-700 dark:text-blue-300">Số thứ tự tuần</strong>, <strong className="text-blue-700 dark:text-blue-300">Thời gian bắt đầu</strong>, <strong className="text-blue-700 dark:text-blue-300">Thời gian kết thúc</strong>, <strong className="text-blue-700 dark:text-blue-300">Tên bài</strong>, <strong className="text-blue-700 dark:text-blue-300">Khối lớp</strong> và <strong className="text-blue-700 dark:text-blue-300">Học kỳ</strong>.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => downloadTemplate('tin_hoc_3')}
                    className="px-2.5 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>💻</span> Tin học 3
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTemplate('tin_hoc_4')}
                    className="px-2.5 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>💻</span> Tin học 4
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTemplate('cong_nghe_5')}
                    className="px-2.5 py-2 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>🛠️</span> Công nghệ 5
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTemplate('blank')}
                    className="px-2.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>📄</span> Khung trống
                  </button>
                </div>
              </div>

              {/* Automatic Sync Notice */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <span className="font-bold">✓</span>
                <span>Phân phối nạp vào sẽ áp dụng đồng thời cho tất cả <strong>{gradeClasses.length} lớp</strong> của <strong>{currentGrade?.name}</strong> ({gradeClasses.map(c => c.name).join(', ')}).</span>
              </div>

              {/* Start Date Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Ngày bắt đầu năm học (dùng tính tự động nếu tệp thiếu ngày):
                </label>
                <input
                  type="date"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-650 rounded-xl text-xs font-semibold"
                />
              </div>

              {/* Column Structure Guide */}
              <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl border border-slate-750 text-xs space-y-2">
                <div className="font-bold text-amber-400 flex items-center justify-between">
                  <span>📋 Cột chuẩn file mẫu CSV (chuẩn bị sẵn để import):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Excel / CSV UTF-8</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px] font-mono">
                  <div className="bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    <strong className="text-cyan-300 block">Cột 1:</strong> Số thứ tự tuần
                  </div>
                  <div className="bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    <strong className="text-cyan-300 block">Cột 2:</strong> Thời gian bắt đầu
                  </div>
                  <div className="bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    <strong className="text-cyan-300 block">Cột 3:</strong> Thời gian kết thúc
                  </div>
                  <div className="bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    <strong className="text-cyan-300 block">Cột 4:</strong> Tên bài
                  </div>
                  <div className="bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    <strong className="text-cyan-300 block">Cột 5:</strong> Khối lớp
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  * Hệ thống nhận diện linh hoạt: ngày bắt đầu/kết thúc (DD/MM/YYYY hoặc YYYY-MM-DD), khối lớp (Khối 3, 4, 5 hoặc mã lớp).
                </p>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 scale-[0.99]'
                    : 'border-slate-300 dark:border-slate-650 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <FileText className="w-10 h-10 mx-auto text-blue-500 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Nhấp để chọn tệp CSV hoặc Kéo & Thả tệp vào đây
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Định dạng hỗ trợ: .csv, .txt (Tương thích UTF-8 tiếng Việt và Excel)
                </p>
              </div>

              {/* Quick Template Download Buttons */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-750">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Tải nhanh file mẫu có sẵn các cột trên:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadTemplate('tin_hoc_3')}
                    className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 border border-blue-200 dark:border-blue-800 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Mẫu Tin học 3
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTemplate('tin_hoc_4')}
                    className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 border border-blue-200 dark:border-blue-800 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Mẫu Tin học 4
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTemplate('cong_nghe_5')}
                    className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center gap-1 border border-amber-200 dark:border-amber-800 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Mẫu Công nghệ 5
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTemplate('blank')}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-650 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-slate-400" /> Khung trống 35 tuần
                  </button>
                </div>
              </div>

              <div className="flex justify-end items-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* MODAL: Nhập Thủ Công Phân Phối Chương Trình 35 Tuần (Chữ trắng trên nền tối) */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl text-white my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-750 bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-white">
                      Nhập Thủ Công Phân Phối Chương Trình
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700">
                      Chữ Trắng Trên Nền Tối
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Đang chỉnh sửa cho <span className="text-cyan-300 font-bold">{currentGrade?.name}</span> ({currentSubject} • áp dụng chung cho {gradeClasses.length} lớp)
                  </p>
                </div>
              </div>

              {/* Grade Switchers inside modal for swift navigation */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl p-1 gap-1">
                  {grades.map(g => {
                    const isSelected = g.id === selectedGradeId;
                    const gSubj = getGradeSubject(g);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => openManualModal(g.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? gSubj === 'Công nghệ'
                              ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                              : 'bg-blue-600 text-white shadow-xs font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {gSubj === 'Công nghệ' ? '🛠️' : '💻'} {g.name}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer ml-1"
                  title="Đóng modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Quick Actions Bar */}
            <div className="p-3 sm:p-4 bg-slate-950/70 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
                    Ngày bắt đầu Tuần 1:
                  </label>
                  <input
                    type="date"
                    value={manualBaseDate}
                    onChange={(e) => setManualBaseDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 text-white border border-slate-700 rounded-lg text-xs font-semibold [color-scheme:dark] focus:border-cyan-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={recalculateManualDates}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    title="Tự động tính ngày Thứ Hai đến Thứ Sáu cho cả 35 tuần"
                  >
                    🔄 Tính lại ngày 35 tuần
                  </button>
                </div>
              </div>

              {/* Fast Preset Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-bold hidden lg:inline">Nạp nhanh mẫu:</span>
                <button
                  type="button"
                  onClick={() => loadManualPreset('tin_hoc_3')}
                  className="px-2.5 py-1.5 bg-blue-950/70 hover:bg-blue-900/80 text-blue-200 border border-blue-800/80 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  💻 Mẫu Tin học 3
                </button>
                <button
                  type="button"
                  onClick={() => loadManualPreset('tin_hoc_4')}
                  className="px-2.5 py-1.5 bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-800/80 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  💻 Mẫu Tin học 4
                </button>
                <button
                  type="button"
                  onClick={() => loadManualPreset('cong_nghe_5')}
                  className="px-2.5 py-1.5 bg-amber-950/70 hover:bg-amber-900/80 text-amber-200 border border-amber-800/80 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  🛠️ Mẫu Công nghệ 5
                </button>
                <button
                  type="button"
                  onClick={() => setIsPasteTextModalOpen(true)}
                  className="px-2.5 py-1.5 bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 border border-purple-800/80 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  title="Dán nhanh danh sách tên bài giảng từ Word/Excel"
                >
                  <ClipboardList className="w-3.5 h-3.5" /> Dán từ text
                </button>
                <button
                  type="button"
                  onClick={clearManualLessonNames}
                  className="px-2.5 py-1.5 bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/70 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  title="Xóa trắng nội dung tên bài để tự nhập từ đầu"
                >
                  🧹 Xóa trắng bài
                </button>
              </div>
            </div>

            {/* Instruction Banner */}
            <div className="px-4 py-2 bg-cyan-950/40 border-b border-cyan-900/40 text-cyan-200 text-xs flex items-center justify-between shrink-0">
              <span className="flex items-center gap-2">
                <span>💡</span> Thầy Cô nhập trực tiếp tên bài giảng vào từng ô bên dưới. Ô nhập liệu hiển thị <strong>chữ trắng trên nền đen</strong>, tương phản cao, rõ nét và dễ nhìn.
              </span>
              <span className="font-bold text-slate-300">
                Tổng cộng: 35 tuần ({manualRows.filter(r => r.lessonName.trim() !== '').length}/35 tuần có bài)
              </span>
            </div>

            {/* Scrollable Rows Table */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900 z-10">
                  <tr className="border-b border-slate-750 text-slate-400 uppercase font-black tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-32 text-center">Số thứ tự tuần</th>
                    <th className="py-2.5 px-3 w-36">Khối lớp</th>
                    <th className="py-2.5 px-3">Tên bài</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {manualRows.map((row, index) => {
                    const isSemester2First = row.stt === 19;
                    return (
                      <React.Fragment key={row.stt}>
                        {isSemester2First && (
                          <tr className="bg-indigo-950/60 border-y border-indigo-800">
                            <td colSpan={3} className="py-2 px-4 text-center font-black text-indigo-300 text-xs">
                              ⭐ HỌC KỲ 2 (TUẦN 19 ĐẾN TUẦN 35)
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-slate-850/60 transition-colors">
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-extrabold text-blue-400 font-mono text-xs px-2.5 py-1 bg-blue-950/60 rounded-lg border border-blue-800/60">
                              Tuần {row.stt}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                              {currentGrade?.name || 'Khối'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder={`Nhập tên bài học Tuần ${row.stt}...`}
                              value={row.lessonName}
                              onChange={(e) => updateManualRow(index, 'lessonName', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-950 text-white font-bold text-xs border border-slate-750 rounded-lg placeholder-slate-500 outline-none focus:bg-black focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                            />
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-750 bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Tự động áp dụng chung cho toàn bộ <strong className="text-amber-300 font-black">{gradeClasses.length} lớp</strong> thuộc <strong className="text-cyan-300 font-black">{currentGrade?.name}</strong> ({gradeClasses.map(c => c.name).join(', ')})</span>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={saveManualCurriculum}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs md:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-slate-950" /> Lưu Phân Phối Cho {currentGrade?.name} (35 Tuần)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Dán nhanh danh sách tên bài từ văn bản bên ngoài */}
      {isPasteTextModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-750">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-purple-400" /> Dán Nhanh Tên Bài Giảng (Text)
              </h3>
              <button
                type="button"
                onClick={() => setIsPasteTextModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Thầy Cô hãy copy danh sách 35 dòng tên bài từ file Word hoặc Excel rồi dán vào khung bên dưới. Hệ thống sẽ tự động điền lần lượt vào 35 tuần từ Tuần 1 đến Tuần 35:
            </p>

            <div>
              <textarea
                value={pasteTextContent}
                onChange={(e) => setPasteTextContent(e.target.value)}
                placeholder={"Ví dụ:\nBài 1: Thông tin và quyết định\nBài 2: Xử lý thông tin\nBài 3: Máy tính và em\n..."}
                rows={12}
                className="w-full px-3.5 py-3 bg-slate-950 text-white border border-slate-700 rounded-xl font-mono text-xs [color-scheme:dark] placeholder-slate-500 focus:border-cyan-400 outline-none leading-relaxed"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Số dòng hiện tại: {pasteTextContent.split('\n').filter(l => l.trim() !== '').length} dòng
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsPasteTextModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyPastedLessons}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckSquare className="w-4 h-4" /> Điền vào 35 tuần
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
