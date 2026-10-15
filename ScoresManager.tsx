/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Sparkles, Check, RefreshCw, Save, 
  Calendar, AlertCircle, Award, Users, Download, Upload,
  CheckCircle2, Clock, Search, Layers, X, Eye, FileText, Lock, Zap
} from 'lucide-react';
import { Class, Student, Comment, SemesterScore, Assessment, EvaluationLevel } from '../types';

export type AssessmentPeriod = 'Giữa học kỳ I' | 'Cuối học kỳ I' | 'Giữa học kỳ II' | 'Cuối học kỳ II';

export interface PeriodConfig {
  id: AssessmentPeriod;
  label: string;
  step: string;
  shortLabel: string;
  weeks: string;
  type: string;
  hasScore: boolean;
  scoreSemester?: 'Cuối học kỳ 1' | 'Cuối học kỳ 2';
  color: 'blue' | 'amber' | 'indigo' | 'emerald';
}

export const PERIOD_CONFIGS: PeriodConfig[] = [
  {
    id: 'Giữa học kỳ I',
    label: 'Giữa học kì I',
    step: 'Thời điểm 1',
    shortLabel: 'Giữa HK I',
    weeks: 'Tuần 1 - 10 (Tháng 9 - 11)',
    type: 'Đánh giá quá trình (Không thi)',
    hasScore: false,
    color: 'blue',
  },
  {
    id: 'Cuối học kỳ I',
    label: 'Cuối học kì I',
    step: 'Thời điểm 2',
    shortLabel: 'Cuối HK I',
    weeks: 'Tuần 11 - 18 (Tháng 11 - 01)',
    type: 'Có bài kiểm tra định kỳ (Điểm 0-10)',
    hasScore: true,
    scoreSemester: 'Cuối học kỳ 1',
    color: 'amber',
  },
  {
    id: 'Giữa học kỳ II',
    label: 'Giữa học kì II',
    step: 'Thời điểm 3',
    shortLabel: 'Giữa HK II',
    weeks: 'Tuần 19 - 27 (Tháng 01 - 03)',
    type: 'Đánh giá quá trình (Không thi)',
    hasScore: false,
    color: 'indigo',
  },
  {
    id: 'Cuối học kỳ II',
    label: 'Cuối học kì II',
    step: 'Thời điểm 4',
    shortLabel: 'Cuối HK II',
    weeks: 'Tuần 28 - 35 (Tháng 04 - 05)',
    type: 'Có bài kiểm tra định kỳ (0-10) & Tổng kết năm',
    hasScore: true,
    scoreSemester: 'Cuối học kỳ 2',
    color: 'emerald',
  },
];

/**
 * Tự động tính toán mức đánh giá T, H, C theo chuẩn Thông tư 27 dựa trên dữ liệu học tập:
 * - Đánh giá quá trình các buổi học (Hoàn thành tốt, Hoàn thành, Chưa hoàn thành, thái độ, kỹ năng)
 * - Điểm bài kiểm tra định kỳ (đối với Cuối HK I và Cuối HK II)
 * - T: Hoàn thành tốt | H: Hoàn thành | C: Chưa hoàn thành / Cần cố gắng
 */
export function computeAutoEvaluationLevel(
  studentId: string,
  period: AssessmentPeriod,
  assessments: Assessment[],
  scores: SemesterScore[],
  currentEditScore?: string
): EvaluationLevel {
  const studentAssessments = assessments.filter(a => a.studentId === studentId);
  const total = studentAssessments.length;
  const excellentCount = studentAssessments.filter(a => a.completion === 'Hoàn thành tốt').length;
  const goodCount = studentAssessments.filter(a => a.completion === 'Hoàn thành').length;
  const incompleteCount = studentAssessments.filter(a => a.completion === 'Chưa hoàn thành').length;

  let relevantScore: number | undefined;
  if (currentEditScore !== undefined && currentEditScore !== '') {
    const parsed = parseFloat(currentEditScore);
    if (!isNaN(parsed)) relevantScore = parsed;
  }
  
  if (relevantScore === undefined) {
    if (period === 'Cuối học kỳ I') {
      const s = scores.find(item => item.studentId === studentId && item.semester === 'Cuối học kỳ 1');
      if (s && !isNaN(s.score)) relevantScore = s.score;
    } else if (period === 'Cuối học kỳ II') {
      const s = scores.find(item => item.studentId === studentId && item.semester === 'Cuối học kỳ 2');
      if (s && !isNaN(s.score)) relevantScore = s.score;
    }
  }

  // Nếu có điểm bài kiểm tra định kỳ (Cuối HK1 hoặc Cuối HK2)
  if (relevantScore !== undefined) {
    if (relevantScore >= 9) {
      if (incompleteCount > 0 && incompleteCount > total * 0.3) return 'H';
      return 'T';
    }
    if (relevantScore >= 7) {
      if (total > 0 && excellentCount / total >= 0.45 && incompleteCount === 0) return 'T';
      return 'H';
    }
    if (relevantScore >= 5) {
      return 'H';
    }
    return 'C';
  }

  // Đánh giá giữa kỳ (không thi) hoặc khi chưa nhập điểm thi: tính dựa vào quá trình học tập thực tế
  if (total > 0) {
    if (excellentCount / total >= 0.45 && incompleteCount === 0) {
      return 'T';
    }
    if (incompleteCount > 0 && (incompleteCount / total) >= 0.35) {
      return 'C';
    }
    return 'H';
  }

  // Mặc định chuẩn phổ cập theo Thông tư 27 là Hoàn thành
  return 'H';
}

interface ScoresManagerProps {
  students: Student[];
  classes: Class[];
  assessments: Assessment[];
  comments: Comment[];
  scores: SemesterScore[];
  readOnly?: boolean;
  onAddOrUpdateScore: (studentId: string, semester: 'Cuối học kỳ 1' | 'Cuối học kỳ 2', score: number) => void;
  onGenerateAIComment: (studentId: string, period?: string, level?: EvaluationLevel) => Promise<string>;
  onAddComment: (studentId: string, content: string, type: 'AI' | 'Thủ công', period?: string, level?: EvaluationLevel) => void;
}

export function ScoresManager({
  students,
  classes,
  assessments,
  comments,
  scores,
  readOnly = false,
  onAddOrUpdateScore,
  onGenerateAIComment,
  onAddComment
}: ScoresManagerProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active viewing period or 'all' for full-year view
  const [activeViewMode, setActiveViewMode] = useState<AssessmentPeriod | 'all'>('Giữa học kỳ I');
  
  // Scores state: studentId -> { hk1: string, hk2: string }
  const [editScores, setEditScores] = useState<Record<string, { hk1: string; hk2: string }>>({});
  
  // Comments state: studentId -> { [Period]: string }
  const [editComments, setEditComments] = useState<Record<string, Record<AssessmentPeriod, string>>>({});

  // Levels state (T, H, C): studentId -> { [Period]: EvaluationLevel }
  const [editLevels, setEditLevels] = useState<Record<string, Record<AssessmentPeriod, EvaluationLevel>>>({});
  
  // Generating states
  const [generatingIds, setGeneratingIds] = useState<Record<string, boolean>>({});
  const [bulkGeneratingPeriod, setBulkGeneratingPeriod] = useState<AssessmentPeriod | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [cancelBulkRef, setCancelBulkRef] = useState<boolean>(false);
  
  // Notification messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Sync state when selected class, scores, or comments change
  useEffect(() => {
    if (!selectedClassId) return;
    
    const classStudents = students.filter(s => s.classId === selectedClassId);
    const initialScores: Record<string, { hk1: string; hk2: string }> = {};
    const initialComments: Record<string, Record<AssessmentPeriod, string>> = {};
    const initialLevels: Record<string, Record<AssessmentPeriod, EvaluationLevel>> = {};

    classStudents.forEach(student => {
      const hk1Score = scores.find(s => s.studentId === student.id && s.semester === 'Cuối học kỳ 1');
      const hk2Score = scores.find(s => s.studentId === student.id && s.semester === 'Cuối học kỳ 2');
      
      initialScores[student.id] = {
        hk1: hk1Score ? hk1Score.score.toString() : '',
        hk2: hk2Score ? hk2Score.score.toString() : ''
      };

      // Load comments for each of the 4 periods
      const studentComments = comments.filter(c => c.studentId === student.id);
      
      const periodComments: Record<AssessmentPeriod, string> = {
        'Giữa học kỳ I': '',
        'Cuối học kỳ I': '',
        'Giữa học kỳ II': '',
        'Cuối học kỳ II': ''
      };

      const periodLevels: Record<AssessmentPeriod, EvaluationLevel> = {
        'Giữa học kỳ I': 'H',
        'Cuối học kỳ I': 'H',
        'Giữa học kỳ II': 'H',
        'Cuối học kỳ II': 'H'
      };

      studentComments.forEach(c => {
        if (c.period && c.period in periodComments) {
          periodComments[c.period as AssessmentPeriod] = c.content;
          if (c.level) {
            periodLevels[c.period as AssessmentPeriod] = c.level;
          }
        }
      });

      // Legacy fallback: if comment has no period, place it into Cuối học kỳ I
      const legacyWithoutPeriod = studentComments.filter(c => !c.period);
      if (legacyWithoutPeriod.length > 0 && !periodComments['Cuối học kỳ I']) {
        periodComments['Cuối học kỳ I'] = legacyWithoutPeriod[0].content;
        if (legacyWithoutPeriod[0].level) {
          periodLevels['Cuối học kỳ I'] = legacyWithoutPeriod[0].level;
        }
      }

      // If level wasn't saved in comment, compute auto level from learning data
      (['Giữa học kỳ I', 'Cuối học kỳ I', 'Giữa học kỳ II', 'Cuối học kỳ II'] as AssessmentPeriod[]).forEach(p => {
        const hasSaved = studentComments.find(c => c.period === p && c.level);
        if (!hasSaved) {
          periodLevels[p] = computeAutoEvaluationLevel(
            student.id, 
            p, 
            assessments, 
            scores, 
            p === 'Cuối học kỳ I' ? (hk1Score ? hk1Score.score.toString() : '') : p === 'Cuối học kỳ II' ? (hk2Score ? hk2Score.score.toString() : '') : undefined
          );
        }
      });

      initialComments[student.id] = periodComments;
      initialLevels[student.id] = periodLevels;
    });

    setEditScores(initialScores);
    setEditComments(initialComments);
    setEditLevels(initialLevels);
  }, [selectedClassId, students, scores, comments]);

  // Target class object
  const targetClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const classStudents = students.filter(s => s.classId === selectedClassId);

  // Filter students based on search query
  const filteredStudents = classStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate statistics for the 4 periods in the current class
  const getPeriodStats = (periodId: AssessmentPeriod) => {
    let commentedCount = 0;
    classStudents.forEach(student => {
      const comment = editComments[student.id]?.[periodId];
      if (comment && comment.trim().length > 0) {
        commentedCount++;
      }
    });
    return {
      total: classStudents.length,
      commented: commentedCount,
      percentage: classStudents.length > 0 ? Math.round((commentedCount / classStudents.length) * 100) : 0
    };
  };

  // Handle score text input
  const handleScoreChange = (studentId: string, semester: 'hk1' | 'hk2', val: string) => {
    if (val !== '' && !/^\d*\.?\d*$/.test(val)) return;
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && (parsed < 0 || parsed > 10)) return;

    setEditScores(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { hk1: '', hk2: '' }),
        [semester]: val
      }
    }));

    // Auto-update suggested level for this period based on new score
    const targetPeriod: AssessmentPeriod = semester === 'hk1' ? 'Cuối học kỳ I' : 'Cuối học kỳ II';
    const newSuggestedLevel = computeAutoEvaluationLevel(studentId, targetPeriod, assessments, scores, val);
    setEditLevels(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {
          'Giữa học kỳ I': 'H',
          'Cuối học kỳ I': 'H',
          'Giữa học kỳ II': 'H',
          'Cuối học kỳ II': 'H'
        }),
        [targetPeriod]: newSuggestedLevel
      }
    }));
  };

  // Handle evaluation level (T, H, C) change for a specific student and period
  const handleLevelChange = (studentId: string, period: AssessmentPeriod, val: EvaluationLevel) => {
    setEditLevels(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {
          'Giữa học kỳ I': 'H',
          'Cuối học kỳ I': 'H',
          'Giữa học kỳ II': 'H',
          'Cuối học kỳ II': 'H'
        }),
        [period]: val
      }
    }));
  };

  // Handle comment change for a specific student and period
  const handleCommentChange = (studentId: string, period: AssessmentPeriod, val: string) => {
    setEditComments(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {
          'Giữa học kỳ I': '',
          'Cuối học kỳ I': '',
          'Giữa học kỳ II': '',
          'Cuối học kỳ II': ''
        }),
        [period]: val
      }
    }));
  };

  // Save changes for a single student row
  const handleSaveStudentRow = (studentId: string, periodToSave?: AssessmentPeriod) => {
    if (readOnly) {
      setErrorMessage('🔒 Chế độ Xem tham khảo chỉ cho phép xem. Không thể lưu dữ liệu.');
      setTimeout(() => setErrorMessage(''), 3500);
      return;
    }
    try {
      const rowScores = editScores[studentId] || { hk1: '', hk2: '' };
      const studentCommentMap = editComments[studentId] || {
        'Giữa học kỳ I': '',
        'Cuối học kỳ I': '',
        'Giữa học kỳ II': '',
        'Cuối học kỳ II': ''
      };
      const studentLevelMap = editLevels[studentId] || {
        'Giữa học kỳ I': 'H',
        'Cuối học kỳ I': 'H',
        'Giữa học kỳ II': 'H',
        'Cuối học kỳ II': 'H'
      };

      // Save HK1 Score
      if (rowScores.hk1 !== '') {
        const numHk1 = parseFloat(rowScores.hk1);
        if (!isNaN(numHk1) && numHk1 >= 0 && numHk1 <= 10) {
          onAddOrUpdateScore(studentId, 'Cuối học kỳ 1', numHk1);
        }
      }

      // Save HK2 Score
      if (rowScores.hk2 !== '') {
        const numHk2 = parseFloat(rowScores.hk2);
        if (!isNaN(numHk2) && numHk2 >= 0 && numHk2 <= 10) {
          onAddOrUpdateScore(studentId, 'Cuối học kỳ 2', numHk2);
        }
      }

      // Save comments & levels
      if (periodToSave) {
        const content = studentCommentMap[periodToSave]?.trim() || '';
        const level = studentLevelMap[periodToSave] || computeAutoEvaluationLevel(studentId, periodToSave, assessments, scores);
        onAddComment(studentId, content, 'Thủ công', periodToSave, level);
      } else {
        // Save all periods if no specific period specified
        (Object.keys(studentCommentMap) as AssessmentPeriod[]).forEach(period => {
          const content = studentCommentMap[period]?.trim() || '';
          const level = studentLevelMap[period] || computeAutoEvaluationLevel(studentId, period, assessments, scores);
          onAddComment(studentId, content, 'Thủ công', period, level);
        });
      }

      setSuccessMessage('Đã lưu đánh giá (T/H/C), điểm số và nhận xét thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage('Lỗi khi lưu dữ liệu. Vui lòng kiểm tra lại.');
    }
  };

  // Save all student rows for the current class
  const handleSaveAllClassData = () => {
    if (readOnly) {
      setErrorMessage('🔒 Chế độ Xem tham khảo chỉ cho phép xem. Không thể lưu dữ liệu.');
      setTimeout(() => setErrorMessage(''), 3500);
      return;
    }
    try {
      classStudents.forEach(student => {
        handleSaveStudentRow(student.id);
      });

      setSuccessMessage(`Đã cập nhật dữ liệu toàn bộ ${classStudents.length} học sinh lớp ${targetClass?.name || ''} thành công!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage('Có lỗi xảy ra khi lưu dữ liệu cả lớp.');
    }
  };

  // Generate AI comment for a single student for a specific period
  const handleGenerateAIForStudent = async (studentId: string, period: AssessmentPeriod) => {
    if (readOnly) {
      setErrorMessage('🔒 Chế độ Xem tham khảo chỉ cho phép xem thông tin. Chức năng tạo nhận xét AI đã bị khóa.');
      setTimeout(() => setErrorMessage(''), 3500);
      return;
    }
    // Pre-save scores so the AI prompt sees them
    const rowScores = editScores[studentId] || { hk1: '', hk2: '' };
    if (rowScores.hk1 !== '') {
      const numHk1 = parseFloat(rowScores.hk1);
      if (!isNaN(numHk1)) onAddOrUpdateScore(studentId, 'Cuối học kỳ 1', numHk1);
    }
    if (rowScores.hk2 !== '') {
      const numHk2 = parseFloat(rowScores.hk2);
      if (!isNaN(numHk2)) onAddOrUpdateScore(studentId, 'Cuối học kỳ 2', numHk2);
    }

    // AI automatically determines evaluation level (T, H, C) based on learning process & scores
    const currentScore = period === 'Cuối học kỳ I' ? rowScores.hk1 : period === 'Cuối học kỳ II' ? rowScores.hk2 : undefined;
    const currentLevel: EvaluationLevel = editLevels[studentId]?.[period] || computeAutoEvaluationLevel(studentId, period, assessments, scores, currentScore);

    // Immediately update editLevels state so the UI highlights the rating T, H, or C
    setEditLevels(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {
          'Giữa học kỳ I': 'H',
          'Cuối học kỳ I': 'H',
          'Giữa học kỳ II': 'H',
          'Cuối học kỳ II': 'H'
        }),
        [period]: currentLevel
      }
    }));

    const genKey = `${studentId}_${period}`;
    setGeneratingIds(prev => ({ ...prev, [genKey]: true }));
    
    try {
      const comment = await onGenerateAIComment(studentId, period, currentLevel);
      
      // Update local state with comment
      setEditComments(prev => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {
            'Giữa học kỳ I': '',
            'Cuối học kỳ I': '',
            'Giữa học kỳ II': '',
            'Cuối học kỳ II': ''
          }),
          [period]: comment
        }
      }));

      // Automatically persist both level and comment to DB
      onAddComment(studentId, comment, 'AI', period, currentLevel);
      
      setSuccessMessage(`Đã đưa ra đánh giá [Mức ${currentLevel}] và nhận xét AI thành công cho học sinh!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage('Không thể tạo nhận xét AI. Hệ thống đã kích hoạt bộ dự phòng.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setGeneratingIds(prev => ({ ...prev, [genKey]: false }));
    }
  };

  // BULK GENERATE AI COMMENTS FOR ALL STUDENTS FOR A SPECIFIC PERIOD
  const handleBulkGenerateForPeriod = async (period: AssessmentPeriod, onlyEmpty = false) => {
    if (readOnly) {
      setErrorMessage('🔒 Chế độ Xem tham khảo chỉ cho phép xem thông tin. Chức năng tạo nhận xét AI hàng loạt đã bị khóa.');
      setTimeout(() => setErrorMessage(''), 3500);
      return;
    }
    if (classStudents.length === 0) {
      setErrorMessage('Lớp học này hiện chưa có học sinh để tạo nhận xét.');
      return;
    }

    const studentsToProcess = onlyEmpty
      ? classStudents.filter(s => !editComments[s.id]?.[period] || editComments[s.id][period].trim() === '')
      : classStudents;

    if (studentsToProcess.length === 0) {
      setSuccessMessage('Tất cả học sinh trong lớp đều đã có đánh giá và nhận xét!');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    // Switch active view to this period so the teacher immediately sees results
    setActiveViewMode(period);
    setBulkGeneratingPeriod(period);
    setBulkProgress({ current: 0, total: studentsToProcess.length });
    setCancelBulkRef(false);
    setSuccessMessage('');
    setErrorMessage('');

    let generatedCount = 0;

    for (let i = 0; i < studentsToProcess.length; i++) {
      if (cancelBulkRef) break;
      const student = studentsToProcess[i];
      setBulkProgress({ current: i + 1, total: studentsToProcess.length });
      
      const genKey = `${student.id}_${period}`;
      setGeneratingIds(prev => ({ ...prev, [genKey]: true }));

      try {
        // Pre-save scores for prompt context
        const rowScores = editScores[student.id] || { hk1: '', hk2: '' };
        if (rowScores.hk1 !== '') {
          const numHk1 = parseFloat(rowScores.hk1);
          if (!isNaN(numHk1)) onAddOrUpdateScore(student.id, 'Cuối học kỳ 1', numHk1);
        }
        if (rowScores.hk2 !== '') {
          const numHk2 = parseFloat(rowScores.hk2);
          if (!isNaN(numHk2)) onAddOrUpdateScore(student.id, 'Cuối học kỳ 2', numHk2);
        }

        const currentScore = period === 'Cuối học kỳ I' ? rowScores.hk1 : period === 'Cuối học kỳ II' ? rowScores.hk2 : undefined;
        const currentLevel: EvaluationLevel = editLevels[student.id]?.[period] || computeAutoEvaluationLevel(student.id, period, assessments, scores, currentScore);

        // Update level in state immediately
        setEditLevels(prev => ({
          ...prev,
          [student.id]: {
            ...(prev[student.id] || {
              'Giữa học kỳ I': 'H',
              'Cuối học kỳ I': 'H',
              'Giữa học kỳ II': 'H',
              'Cuối học kỳ II': 'H'
            }),
            [period]: currentLevel
          }
        }));

        const commentText = await onGenerateAIComment(student.id, period, currentLevel);

        // Update local state in real-time
        setEditComments(prev => ({
          ...prev,
          [student.id]: {
            ...(prev[student.id] || {
              'Giữa học kỳ I': '',
              'Cuối học kỳ I': '',
              'Giữa học kỳ II': '',
              'Cuối học kỳ II': ''
            }),
            [period]: commentText
          }
        }));

        // Persist comment with level
        onAddComment(student.id, commentText, 'AI', period, currentLevel);
        generatedCount++;
      } catch (err) {
        console.error(`Lỗi tạo nhận xét AI cho học sinh ${student.name}:`, err);
      } finally {
        setGeneratingIds(prev => ({ ...prev, [genKey]: false }));
      }
    }

    setBulkGeneratingPeriod(null);
    setBulkProgress(null);
    setSuccessMessage(`Đã đưa ra đánh giá (T/H/C) và nhận xét AI tích cực (< 30 chữ) thành công cho ${generatedCount}/${studentsToProcess.length} học sinh lớp ${targetClass?.name} tại thời điểm ${period}!`);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // EXPORT EXCEL WITH COMPLETE 4 PERIODS, T/H/C LEVELS & SCORES
  const handleExportExcel = () => {
    if (!targetClass) return;

    const className = targetClass.name;
    const filename = `Hoc_Ba_Tin_Hoc_Lop_${className}_4_Thoi_Diem.csv`;

    const headers = 'STT,Mã học sinh,Họ và tên,Giới tính,Lớp,Đánh giá Giữa HK1 (T/H/C),Nhận xét Giữa HK1,Điểm thi Cuối HK1,Đánh giá Cuối HK1 (T/H/C),Nhận xét Cuối HK1,Đánh giá Giữa HK2 (T/H/C),Nhận xét Giữa HK2,Điểm thi Cuối HK2,Đánh giá Cuối HK2 (T/H/C),Nhận xét Cuối HK2\n';
    
    const rows = classStudents.map((s, index) => {
      const rowScores = editScores[s.id] || { hk1: '', hk2: '' };
      const commentMap = editComments[s.id] || {
        'Giữa học kỳ I': '',
        'Cuối học kỳ I': '',
        'Giữa học kỳ II': '',
        'Cuối học kỳ II': ''
      };
      const levelMap = editLevels[s.id] || {
        'Giữa học kỳ I': computeAutoEvaluationLevel(s.id, 'Giữa học kỳ I', assessments, scores),
        'Cuối học kỳ I': computeAutoEvaluationLevel(s.id, 'Cuối học kỳ I', assessments, scores, rowScores.hk1),
        'Giữa học kỳ II': computeAutoEvaluationLevel(s.id, 'Giữa học kỳ II', assessments, scores),
        'Cuối học kỳ II': computeAutoEvaluationLevel(s.id, 'Cuối học kỳ II', assessments, scores, rowScores.hk2),
      };

      const dgGHK1 = levelMap['Giữa học kỳ I'] || 'H';
      const cGHK1 = (commentMap['Giữa học kỳ I'] || '').replace(/"/g, '""').replace(/\n/g, ' ');

      const dgCHK1 = levelMap['Cuối học kỳ I'] || 'H';
      const cCHK1 = (commentMap['Cuối học kỳ I'] || '').replace(/"/g, '""').replace(/\n/g, ' ');

      const dgGHK2 = levelMap['Giữa học kỳ II'] || 'H';
      const cGHK2 = (commentMap['Giữa học kỳ II'] || '').replace(/"/g, '""').replace(/\n/g, ' ');

      const dgCHK2 = levelMap['Cuối học kỳ II'] || 'H';
      const cCHK2 = (commentMap['Cuối học kỳ II'] || '').replace(/"/g, '""').replace(/\n/g, ' ');

      return `${index + 1},"${s.studentId}","${s.name}","${s.gender}","${className}","${dgGHK1}","${cGHK1}","${rowScores.hk1 || '-'}","${dgCHK1}","${cCHK1}","${dgGHK2}","${cGHK2}","${rowScores.hk2 || '-'}","${dgCHK2}","${cCHK2}"`;
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

  // DOWNLOAD TEMPLATE FOR IMPORT
  const handleDownloadTemplate = () => {
    if (!targetClass) return;
    const className = targetClass.name;
    const filename = `Mau_Nhap_Diem_Hoc_Ba_${className}.csv`;

    const headers = 'Mã học sinh,Họ và tên,Đánh giá Giữa HK1 (T/H/C),Nhận xét Giữa HK1,Điểm thi Cuối HK1,Đánh giá Cuối HK1 (T/H/C),Nhận xét Cuối HK1,Đánh giá Giữa HK2 (T/H/C),Nhận xét Giữa HK2,Điểm thi Cuối HK2,Đánh giá Cuối HK2 (T/H/C),Nhận xét Cuối HK2\n';
    
    const rows = classStudents.map((s) => {
      const rowScores = editScores[s.id] || { hk1: '', hk2: '' };
      const commentMap = editComments[s.id] || {
        'Giữa học kỳ I': '',
        'Cuối học kỳ I': '',
        'Giữa học kỳ II': '',
        'Cuối học kỳ II': ''
      };
      const levelMap = editLevels[s.id] || {
        'Giữa học kỳ I': computeAutoEvaluationLevel(s.id, 'Giữa học kỳ I', assessments, scores),
        'Cuối học kỳ I': computeAutoEvaluationLevel(s.id, 'Cuối học kỳ I', assessments, scores, rowScores.hk1),
        'Giữa học kỳ II': computeAutoEvaluationLevel(s.id, 'Giữa học kỳ II', assessments, scores),
        'Cuối học kỳ II': computeAutoEvaluationLevel(s.id, 'Cuối học kỳ II', assessments, scores, rowScores.hk2),
      };

      const dgGHK1 = levelMap['Giữa học kỳ I'] || 'H';
      const cGHK1 = (commentMap['Giữa học kỳ I'] || '').replace(/"/g, '""').replace(/\n/g, ' ');

      const dgCHK1 = levelMap['Cuối học kỳ I'] || 'H';
      const cCHK1 = (commentMap['Cuối học kỳ I'] || '').replace(/"/g, '""').replace(/\n/g, ' ');

      const dgGHK2 = levelMap['Giữa học kỳ II'] || 'H';
      const cGHK2 = (commentMap['Giữa học kỳ II'] || '').replace(/"/g, '""').replace(/\n/g, ' ');

      const dgCHK2 = levelMap['Cuối học kỳ II'] || 'H';
      const cCHK2 = (commentMap['Cuối học kỳ II'] || '').replace(/"/g, '""').replace(/\n/g, ' ');

      return `"${s.studentId}","${s.name}","${dgGHK1}","${cGHK1}","${rowScores.hk1}","${dgCHK1}","${cCHK1}","${dgGHK2}","${cGHK2}","${rowScores.hk2}","${dgCHK2}","${cCHK2}"`;
    }).join('\n');

    const blob = new Blob(['\ufeff' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccessMessage('Đã tải xuống file mẫu thành công! Bạn hãy mở bằng Excel để nhập mức đánh giá T, H, C, điểm và nhận xét.');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // UPLOAD CSV
  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setErrorMessage('File trống hoặc không hợp lệ.');
          return;
        }

        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          setErrorMessage('File mẫu không chứa dữ liệu hoặc thiếu tiêu đề.');
          return;
        }

        let firstLine = lines[0];
        if (firstLine.startsWith('\ufeff')) {
          firstLine = firstLine.substring(1);
        }

        const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
        
        const mshsIndex = headers.findIndex(h => h.toLowerCase().includes('mã số') || h.toLowerCase().includes('studentid') || h.toLowerCase().includes('mã học sinh'));
        const hk1Index = headers.findIndex(h => h.toLowerCase().includes('hk1') || h.toLowerCase().includes('học kỳ 1') || h.toLowerCase().includes('học kì 1'));
        const hk2Index = headers.findIndex(h => h.toLowerCase().includes('hk2') || h.toLowerCase().includes('học kỳ 2') || h.toLowerCase().includes('học kì 2'));
        
        // Level T, H, C columns
        const dgGhk1Index = headers.findIndex(h => (h.toLowerCase().includes('đánh giá') || h.toLowerCase().includes('mức') || h.toLowerCase().includes('đg')) && (h.toLowerCase().includes('giữa hk1') || h.toLowerCase().includes('giữa kỳ 1') || h.toLowerCase().includes('giữa kì 1')));
        const dgChk1Index = headers.findIndex(h => (h.toLowerCase().includes('đánh giá') || h.toLowerCase().includes('mức') || h.toLowerCase().includes('đg')) && (h.toLowerCase().includes('cuối hk1') || h.toLowerCase().includes('cuối kỳ 1') || h.toLowerCase().includes('cuối kì 1')));
        const dgGhk2Index = headers.findIndex(h => (h.toLowerCase().includes('đánh giá') || h.toLowerCase().includes('mức') || h.toLowerCase().includes('đg')) && (h.toLowerCase().includes('giữa hk2') || h.toLowerCase().includes('giữa kỳ 2') || h.toLowerCase().includes('giữa kì 2')));
        const dgChk2Index = headers.findIndex(h => (h.toLowerCase().includes('đánh giá') || h.toLowerCase().includes('mức') || h.toLowerCase().includes('đg')) && (h.toLowerCase().includes('cuối hk2') || h.toLowerCase().includes('cuối kỳ 2') || h.toLowerCase().includes('cuối kì 2')));

        // Comments columns
        const ghk1Index = headers.findIndex(h => h.toLowerCase().includes('nhận xét') && (h.toLowerCase().includes('giữa hk1') || h.toLowerCase().includes('giữa học kỳ 1') || h.toLowerCase().includes('giữa học kì 1') || h.toLowerCase().includes('giữa kì 1')));
        const chk1Index = headers.findIndex(h => h.toLowerCase().includes('nhận xét') && (h.toLowerCase().includes('cuối hk1') || h.toLowerCase().includes('cuối học kỳ 1') || h.toLowerCase().includes('cuối học kì 1') || h.toLowerCase().includes('cuối kì 1')));
        const ghk2Index = headers.findIndex(h => h.toLowerCase().includes('nhận xét') && (h.toLowerCase().includes('giữa hk2') || h.toLowerCase().includes('giữa học kỳ 2') || h.toLowerCase().includes('giữa học kì 2') || h.toLowerCase().includes('giữa kì 2')));
        const chk2Index = headers.findIndex(h => h.toLowerCase().includes('nhận xét') && (h.toLowerCase().includes('cuối hk2') || h.toLowerCase().includes('cuối học kỳ 2') || h.toLowerCase().includes('cuối học kì 2') || h.toLowerCase().includes('cuối kì 2')));
        const genericNxIndex = headers.findIndex(h => h.toLowerCase().includes('nhận xét') || h.toLowerCase().includes('comment'));

        const parseLevelVal = (val?: string): EvaluationLevel | null => {
          if (!val) return null;
          const clean = val.toUpperCase().trim();
          if (clean === 'T' || clean.includes('TỐT') || clean.includes('HOÀN THÀNH TỐT')) return 'T';
          if (clean === 'H' || clean.includes('HOÀN THÀNH')) return 'H';
          if (clean === 'C' || clean.includes('CHƯA') || clean.includes('CỐ GẮNG')) return 'C';
          return null;
        };

        if (mshsIndex === -1) {
          setErrorMessage('Không tìm thấy cột Mã học sinh trong file. Vui lòng kiểm tra lại cấu trúc.');
          return;
        }

        let updatedCount = 0;
        const newEditScores = { ...editScores };
        const newEditComments = { ...editComments };
        const newEditLevels = { ...editLevels };

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Split CSV respecting quotes
          const row: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              row.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          row.push(current.trim().replace(/^"|"$/g, ''));

          if (row.length < 2) continue;

          const studentIdInCSV = row[mshsIndex]?.trim();
          if (!studentIdInCSV) continue;

          const student = students.find(s => s.studentId === studentIdInCSV && s.classId === selectedClassId);
          if (student) {
            // Scores
            if (hk1Index !== -1) {
              const hk1Val = row[hk1Index]?.trim();
              if (hk1Val && !isNaN(parseFloat(hk1Val))) {
                newEditScores[student.id] = {
                  ...(newEditScores[student.id] || { hk1: '', hk2: '' }),
                  hk1: parseFloat(hk1Val).toString()
                };
              }
            }
            if (hk2Index !== -1) {
              const hk2Val = row[hk2Index]?.trim();
              if (hk2Val && !isNaN(parseFloat(hk2Val))) {
                newEditScores[student.id] = {
                  ...(newEditScores[student.id] || { hk1: '', hk2: '' }),
                  hk2: parseFloat(hk2Val).toString()
                };
              }
            }

            // Levels T, H, C
            const studentLevelsObj = {
              ...(newEditLevels[student.id] || {
                'Giữa học kỳ I': 'H',
                'Cuối học kỳ I': 'H',
                'Giữa học kỳ II': 'H',
                'Cuối học kỳ II': 'H'
              })
            };

            if (dgGhk1Index !== -1) {
              const parsed = parseLevelVal(row[dgGhk1Index]);
              if (parsed) studentLevelsObj['Giữa học kỳ I'] = parsed;
            }
            if (dgChk1Index !== -1) {
              const parsed = parseLevelVal(row[dgChk1Index]);
              if (parsed) studentLevelsObj['Cuối học kỳ I'] = parsed;
            }
            if (dgGhk2Index !== -1) {
              const parsed = parseLevelVal(row[dgGhk2Index]);
              if (parsed) studentLevelsObj['Giữa học kỳ II'] = parsed;
            }
            if (dgChk2Index !== -1) {
              const parsed = parseLevelVal(row[dgChk2Index]);
              if (parsed) studentLevelsObj['Cuối học kỳ II'] = parsed;
            }
            newEditLevels[student.id] = studentLevelsObj;

            // Comments for 4 periods
            const studentCommentObj = {
              ...(newEditComments[student.id] || {
                'Giữa học kỳ I': '',
                'Cuối học kỳ I': '',
                'Giữa học kỳ II': '',
                'Cuối học kỳ II': ''
              })
            };

            if (ghk1Index !== -1 && row[ghk1Index]?.trim()) studentCommentObj['Giữa học kỳ I'] = row[ghk1Index].trim();
            if (chk1Index !== -1 && row[chk1Index]?.trim()) studentCommentObj['Cuối học kỳ I'] = row[chk1Index].trim();
            if (ghk2Index !== -1 && row[ghk2Index]?.trim()) studentCommentObj['Giữa học kỳ II'] = row[ghk2Index].trim();
            if (chk2Index !== -1 && row[chk2Index]?.trim()) studentCommentObj['Cuối học kỳ II'] = row[chk2Index].trim();

            if (genericNxIndex !== -1 && ghk1Index === -1 && chk1Index === -1) {
              studentCommentObj['Cuối học kỳ I'] = row[genericNxIndex].trim();
            }

            newEditComments[student.id] = studentCommentObj;
            updatedCount++;
          }
        }

        setEditScores(newEditScores);
        setEditComments(newEditComments);
        setEditLevels(newEditLevels);
        e.target.value = '';

        setSuccessMessage(`Đã nạp thành công dữ liệu cho ${updatedCount} học sinh từ file CSV! Nhấn nút "Lưu dữ liệu lớp" để hoàn tất.`);
        setTimeout(() => setSuccessMessage(''), 5000);
      } catch (err) {
        setErrorMessage('Đã xảy ra lỗi khi đọc file CSV. Vui lòng đảm bảo file chuẩn.');
      }
    };
    reader.readAsText(file);
  };

  const isBulkActive = bulkGeneratingPeriod !== null;

  return (
    <div className="space-y-6">
      {/* Read-Only Notice Banner */}
      {readOnly && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">👁️</span>
            <div>
              <p className="font-bold">Chế độ Xem tham khảo (Chỉ xem) dành cho Đồng nghiệp</p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Thầy/Cô có thể tra cứu toàn bộ bảng điểm, nhận xét 4 thời điểm và xuất báo cáo học bạ Excel. Chức năng nhập điểm, chỉnh sửa và tạo nhận xét đã được khóa.</p>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-lg font-bold text-[10px] uppercase tracking-wider">Chỉ xem</span>
        </div>
      )}
      
      {/* 1. HERO PANEL: DEDICATED AI AUTO-COMMENT GENERATION FOR 4 PERIODS */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-3xl shadow-md space-y-5 relative overflow-hidden border border-indigo-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-bold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" /> Trợ lý AI Ghi điểm & Nhận xét Định kỳ Tiểu học (Thông tư 27)
            </div>
            <h2 className="text-xl md:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
              Tạo Nhận Xét Tự Động Bằng AI Cho Từng Thời Điểm
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Lớp đang chọn: <span className="text-amber-300 font-extrabold text-sm">{targetClass?.name}</span> ({classStudents.length} học sinh) · Môn học: <span className="text-sky-300 font-extrabold">{targetClass?.subject || 'Tin học'}</span>.
              Hệ thống tự động phân tích đánh giá quá trình từng buổi học, đối chiếu điểm thi và viết lời nhận xét chuẩn xác, ấm áp mang tính động viên cho từng em.
            </p>
          </div>

          {/* Real-time progress bar if bulk generating */}
          {isBulkActive && (
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 w-full lg:w-80 space-y-2 shrink-0">
              <div className="flex justify-between items-center text-xs font-bold text-amber-300">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tạo nhận xét AI: {bulkGeneratingPeriod}
                </span>
                <span>{bulkProgress ? `${bulkProgress.current}/${bulkProgress.total}` : ''}</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${bulkProgress ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-300">
                <span>Tiến độ: {bulkProgress ? Math.round((bulkProgress.current / bulkProgress.total) * 100) : 0}%</span>
                <button
                  type="button"
                  onClick={() => setCancelBulkRef(true)}
                  className="text-rose-300 hover:text-rose-100 hover:underline cursor-pointer font-bold"
                >
                  Dừng lại
                </button>
              </div>
            </div>
          )}
        </div>

        {/* THE 4 PROMINENT BUTTONS / CARDS FOR THE 4 TIMELINE PERIODS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {PERIOD_CONFIGS.map((period) => {
            const stats = getPeriodStats(period.id);
            const isCurrentView = activeViewMode === period.id;
            const isGeneratingThisPeriod = bulkGeneratingPeriod === period.id;

            return (
              <div
                key={period.id}
                className={`bg-white/10 backdrop-blur-md rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden group ${
                  isCurrentView 
                    ? 'border-amber-400/80 ring-2 ring-amber-400/30 bg-white/15' 
                    : 'border-white/15 hover:border-white/30 hover:bg-white/15'
                }`}
              >
                {/* Period step header badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                    {period.step}
                  </span>
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${stats.commented === stats.total && stats.total > 0 ? 'text-emerald-400' : 'text-slate-400'}`} />
                    {stats.commented}/{stats.total} em
                  </span>
                </div>

                {/* Period title and timeline details */}
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    {period.label}
                  </h3>
                  <p className="text-[11px] text-slate-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" /> {period.weeks}
                  </p>
                  <p className="text-[10px] text-slate-300/80 leading-tight">
                    {period.type}
                  </p>
                </div>

                {/* Progress bar inside card */}
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>

                {/* THE EXPLICIT AI BUTTON REQUESTED BY USER */}
                <div className="space-y-1.5 pt-1">
                  {readOnly ? (
                    <div
                      className="w-full py-2.5 px-3 bg-white/5 border border-white/15 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed select-none"
                      title="Chế độ Xem tham khảo: Chức năng sinh nhận xét AI đã được khóa để bảo toàn dữ liệu gốc"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tạo AI (Đã khóa ở chế độ xem)</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBulkGenerateForPeriod(period.id)}
                      disabled={isBulkActive}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-[1.02] active:scale-[0.98]"
                      title={`Nhấn để AI tự động phân tích và tạo nhận xét ${period.label} cho cả lớp ${targetClass?.name}`}
                    >
                      {isGeneratingThisPeriod ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tạo...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-slate-950" /> Tạo nhận xét {period.shortLabel} bằng AI
                        </>
                      )}
                    </button>
                  )}

                  {/* View / Focus Period Button */}
                  <button
                    type="button"
                    onClick={() => setActiveViewMode(period.id)}
                    className={`w-full py-1 text-[11px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                      isCurrentView 
                        ? 'text-amber-300 bg-white/10' 
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isCurrentView ? '✓ Đang xem bảng thời điểm này' : `Xem bảng ${period.shortLabel}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. PROMINENT SELECTED CLASS HERO BANNER & QUICK CLASS SWITCHER */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0b1e36] via-[#0f2444] to-[#15345a] text-white rounded-2xl border-2 border-sky-400 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-md border-2 border-sky-300 shrink-0">
              🏫
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-sky-500/25 text-sky-200 border border-sky-400/50 flex items-center gap-1">
                  <span>🎯</span> LỚP ĐANG CHỌN ĐỂ GHI ĐIỂM & NHẬN XÉT:
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {targetClass?.subject || 'Tin học'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display flex items-center gap-2 flex-wrap">
                <span className="text-amber-300">LỚP {targetClass?.name}</span>
                <span className="text-xs font-bold text-sky-100 bg-white/15 px-3 py-1 rounded-xl border border-white/20">
                  Sĩ số: {classStudents.length} Học sinh
                </span>
                {targetClass?.homeroomTeacher && (
                  <span className="text-xs font-semibold text-slate-300">
                    · GVCN: <strong className="text-white font-bold">{targetClass.homeroomTeacher}</strong>
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <span className="text-xs font-bold text-sky-200">
              Chuyển nhanh lớp:
            </span>
          </div>
        </div>

        {/* Quick Class Selector Buttons (Nền xanh đậm chữ trắng) */}
        <div className="pt-3 border-t border-blue-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-sky-200 flex items-center gap-1 mr-1">
            <span>🏫</span> Chọn lớp học:
          </span>
          {classes.map(c => {
            const isSelected = selectedClassId === c.id;
            const count = students.filter(s => s.classId === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedClassId(c.id);
                  setSuccessMessage('');
                  setErrorMessage('');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white font-black ring-2 ring-sky-300 border-sky-400 shadow-md scale-[1.04]'
                    : 'bg-[#0f2444] hover:bg-[#163a66] text-white font-bold border-blue-800/90 hover:border-sky-400'
                }`}
              >
                <span>Lớp {c.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-blue-950/80 text-blue-200 border border-blue-700/60'
                }`}>
                  {count} HS
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CLASS SELECTOR & ACTIONS BAR */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-150 dark:border-slate-700/80 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full xl:w-auto">
          {/* Class Select Dropdown with Dark High-Contrast Background */}
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              Lớp Đang Chọn:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSuccessMessage('');
                setErrorMessage('');
              }}
              className="px-4 py-2.5 text-sm font-black rounded-xl border-2 border-blue-900 bg-[#0f2444] text-white outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer min-w-[220px] shadow-sm transition-all"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id} className="bg-[#0f2444] text-white font-bold py-1">
                  Lớp {c.name} ({c.subject || 'Tin học'})
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="space-y-1 flex-1 sm:flex-none">
            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              Tìm kiếm học sinh:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên hoặc Mã HS..."
                className="w-full sm:w-64 pl-9 pr-4 py-2.5 text-sm font-extrabold rounded-xl border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/40 shadow-sm transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global actions: Download Template, Upload CSV, Save All & Export Excel */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
          {/* Download Template Button */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
            title="Tải xuống bảng điểm và nhận xét CSV mẫu 4 thời điểm cho lớp này"
          >
            <Download className="w-4 h-4 text-sky-400" /> Tải file mẫu CSV
          </button>

          {!readOnly && (
            <>
              {/* Upload Scores & Comments CSV Button */}
              <label className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-500">
                <Upload className="w-4 h-4 text-indigo-200" /> Nạp file Excel/CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleUploadCSV}
                  className="hidden"
                />
              </label>

              {/* Save All Button */}
              <button
                type="button"
                onClick={handleSaveAllClassData}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4 text-blue-200" /> Lưu dữ liệu lớp {targetClass?.name}
              </button>
            </>
          )}
          
          {/* Export Class Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="Xuất File Excel chứa Mã số, Họ tên, Điểm thi và Nhận xét 4 thời điểm của học sinh"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" /> Xuất Excel 4 Kỳ
          </button>
        </div>
      </div>

      {/* Notifications banner */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-850 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-medium">
          <Check className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-850 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400 shrink-0" /> {errorMessage}
        </div>
      )}

      {/* 3. VIEW MODE TAB BAR: FOCUS A PERIOD OR VIEW ALL 4 PERIODS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Chế độ hiển thị sổ:
          </span>
          {PERIOD_CONFIGS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveViewMode(p.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === p.id 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>{p.label}</span>
              {p.hasScore && <span className="text-[10px] opacity-80">(Điểm số)</span>}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActiveViewMode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeViewMode === 'all' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Bảng Tổng Hợp Cả Năm (4 Kỳ)
          </button>
        </div>

        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
          Hiển thị: <span className="text-blue-600 dark:text-blue-400">{filteredStudents.length}</span> / {classStudents.length} học sinh
        </div>
      </div>

      {/* 4. DATA TABLE: CONDITIONAL ACCORDING TO VIEW MODE */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700/80 shadow-xs overflow-hidden">
        
        {/* Table Header Description */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50/60 dark:bg-slate-900/20">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3.5 py-1.5 rounded-xl bg-[#0f2444] text-white font-black text-sm border-2 border-sky-400 shadow-sm flex items-center gap-1.5">
                <span>🎯</span> LỚP {targetClass?.name}
              </span>
              <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Sổ Ghi Điểm & Nhận Xét ({targetClass?.subject || 'Tin học'})</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {activeViewMode === 'all' 
                ? 'Đang xem toàn bộ 4 thời điểm đánh giá và 2 bài kiểm tra định kỳ trong năm học.'
                : `Đang xem chi tiết thời điểm: ${activeViewMode} (${PERIOD_CONFIGS.find(p => p.id === activeViewMode)?.weeks}).`}
            </p>
          </div>

          {activeViewMode !== 'all' && !readOnly && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleBulkGenerateForPeriod(activeViewMode, false)}
                disabled={isBulkActive}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Tự động tính đánh giá T/H/C và sinh lời nhận xét tích cực dưới 30 chữ cho toàn bộ học sinh"
              >
                <Sparkles className="w-3.5 h-3.5" /> Tạo Đánh giá & Nhận xét cả lớp ({activeViewMode})
              </button>
              <button
                type="button"
                onClick={() => handleBulkGenerateForPeriod(activeViewMode, true)}
                disabled={isBulkActive}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Chỉ tạo đánh giá và nhận xét cho những học sinh chưa có"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-600" /> Điền cho học sinh chưa có
              </button>
            </div>
          )}
        </div>

        {/* Helpful Explanation Legend for Thông tư 27 Evaluation */}
        <div className="mx-6 my-3 p-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/70 to-slate-50 dark:from-slate-900/80 dark:via-indigo-950/40 dark:to-slate-900/60 rounded-2xl border border-blue-200/70 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-1 rounded-lg bg-indigo-600 text-white font-black text-[11px] tracking-wide shrink-0">TT 27</span>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                <span>Cột Đánh giá T, H, C (Trước cột Lời nhận xét):</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 font-extrabold text-[11px]">
                  T: Hoàn thành tốt
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 font-extrabold text-[11px]">
                  H: Hoàn thành
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 font-extrabold text-[11px]">
                  C: Chưa hoàn thành
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Hệ thống tự động phân tích dữ liệu học tập và điểm kiểm tra để đưa ra mức T, H, C và lời nhận xét tích cực dưới 30 chữ (không chê bai học sinh). Thầy/Cô có thể bấm chọn để điều chỉnh bất cứ lúc nào.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeViewMode !== 'all' ? (
            /* VIEW 1: SINGLE-PERIOD FOCUSED VIEW */
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-900/30 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-3 w-12 text-center">STT</th>
                  <th className="py-3.5 px-3 w-28">Mã học sinh</th>
                  <th className="py-3.5 px-3 w-40">Họ và Tên</th>
                  
                  {/* Score column if period has test score */}
                  {PERIOD_CONFIGS.find(p => p.id === activeViewMode)?.hasScore && (
                    <th className="py-3.5 px-3 w-24 text-center text-amber-600 dark:text-amber-400 font-extrabold">
                      Điểm thi (0-10)
                    </th>
                  )}
                  
                  {/* T, H, C Assessment Column - PLACED BEFORE COMMENTS AS REQUESTED */}
                  <th className="py-3.5 px-3 w-44 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-slate-800 dark:text-slate-100 font-black">Đánh giá</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-black border border-indigo-200 dark:border-indigo-800">
                        T / H / C
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-normal lowercase tracking-normal">Dựa vào dữ liệu học tập</div>
                  </th>

                  <th className="py-3.5 px-4">
                    Lời nhận xét: <span className="text-indigo-600 dark:text-indigo-400">{activeViewMode}</span>
                  </th>
                  <th className="py-3.5 px-3 w-32 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Không tìm thấy học sinh nào phù hợp trong lớp này.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const studentAssessments = assessments.filter(a => a.studentId === student.id);
                    const currentPeriod = activeViewMode;
                    const periodConfig = PERIOD_CONFIGS.find(p => p.id === currentPeriod);
                    const hasScore = !!periodConfig?.hasScore;
                    const scoreKey = periodConfig?.scoreSemester === 'Cuối học kỳ 2' ? 'hk2' : 'hk1';
                    
                    const genKey = `${student.id}_${currentPeriod}`;
                    const isGen = !!generatingIds[genKey];
                    const commentVal = editComments[student.id]?.[currentPeriod] || '';

                    const currentScoreStr = editScores[student.id]?.[scoreKey];
                    const autoLevel = computeAutoEvaluationLevel(student.id, currentPeriod, assessments, scores, currentScoreStr);
                    const currentLevel = editLevels[student.id]?.[currentPeriod] || autoLevel;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-center text-slate-500">{idx + 1}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {student.studentId}
                        </td>
                        <td className="py-3.5 px-3">
                          {/* Họ và tên học sinh chữ trắng nổi bật trên nền tối / đen trên nền sáng */}
                          <div className="font-black text-slate-900 dark:text-white text-sm whitespace-nowrap leading-tight tracking-wide">{student.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                            <span>{student.gender}</span> · 
                            <span>{studentAssessments.length} tiết đánh giá</span>
                          </div>
                        </td>

                        {/* Optional Score input: chữ đen trên nền trắng */}
                        {hasScore && (
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="text"
                              value={editScores[student.id]?.[scoreKey] || ''}
                              onChange={(e) => handleScoreChange(student.id, scoreKey, e.target.value)}
                              placeholder="-"
                              readOnly={readOnly}
                              disabled={readOnly}
                              className={`w-16 px-2.5 py-1.5 text-center font-black text-sm rounded-xl border border-slate-300 bg-white text-black shadow-inner ${
                                readOnly ? 'opacity-70 cursor-default' : 'focus:outline-none focus:ring-2 focus:ring-amber-500'
                              }`}
                            />
                          </td>
                        )}

                        {/* CỘT ĐÁNH GIÁ T, H, C DỰA VÀO DỮ LIỆU HỌC TẬP (NẰM TRƯỚC CỘT LỜI NHẬN XÉT) */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600">
                              {(['T', 'H', 'C'] as EvaluationLevel[]).map((lvl) => {
                                const isSelected = currentLevel === lvl;
                                const colorClasses = 
                                  lvl === 'T'
                                    ? isSelected ? 'bg-emerald-600 text-white shadow-xs font-black' : 'text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100'
                                    : lvl === 'H'
                                    ? isSelected ? 'bg-blue-600 text-white shadow-xs font-black' : 'text-blue-800 bg-blue-50/80 hover:bg-blue-100'
                                    : isSelected ? 'bg-amber-600 text-white shadow-xs font-black' : 'text-amber-800 bg-amber-50/80 hover:bg-amber-100';
                                
                                const label = lvl === 'T' ? 'T: Hoàn thành tốt' : lvl === 'H' ? 'H: Hoàn thành' : 'C: Chưa hoàn thành / Cần cố gắng';

                                return (
                                  <button
                                    key={lvl}
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() => handleLevelChange(student.id, currentPeriod, lvl)}
                                    title={label}
                                    className={`w-8 h-7 text-xs font-bold rounded-lg transition-all flex items-center justify-center cursor-pointer disabled:cursor-default ${colorClasses}`}
                                  >
                                    {lvl}
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                              {autoLevel === currentLevel ? (
                                <span className="text-slate-600 dark:text-slate-400" title="Tự động tính từ quá trình học tập thực tế">
                                  ⚡ Tự động: <strong className="font-bold">{autoLevel}</strong>
                                </span>
                              ) : (
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold" title="Giáo viên đã tùy chỉnh đánh giá">
                                  ✎ Đã sửa (gốc: {autoLevel})
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Comment Textarea: Chữ đen trên nền trắng, dưới 30 từ, tích cực */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <textarea
                              value={commentVal}
                              onChange={(e) => handleCommentChange(student.id, currentPeriod, e.target.value)}
                              placeholder={readOnly ? (commentVal ? commentVal : `Chưa có nhận xét cho ${currentPeriod}.`) : `Nhận xét ngắn gọn dưới 30 chữ (Mức ${currentLevel}). Bấm "✨ Tạo AI" để tự động đưa ra đánh giá và nhận xét!`}
                              readOnly={readOnly}
                              className={`w-full h-16 p-2.5 text-xs rounded-xl border border-slate-300 bg-white text-black font-medium placeholder:text-slate-400 shadow-inner leading-relaxed ${
                                readOnly ? 'opacity-80 cursor-default' : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
                              }`}
                            />
                          </div>
                        </td>

                        {/* Row Action Buttons */}
                        <td className="py-3.5 px-3 text-center">
                          {readOnly ? (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-750 px-2 py-1 rounded">
                              Chỉ xem
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1.5 items-stretch">
                              <button
                                type="button"
                                onClick={() => handleGenerateAIForStudent(student.id, currentPeriod)}
                                disabled={isGen}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/40 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                                title={`Tự động đưa ra Đánh giá T/H/C và Nhận xét AI ngắn gọn dưới 30 chữ theo thời điểm: ${currentPeriod}`}
                              >
                                {isGen ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> ✨ Tạo AI ({currentLevel})
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSaveStudentRow(student.id, currentPeriod)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-800 hover:text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" /> Lưu dòng
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* VIEW 2: COMPREHENSIVE 4-PERIOD FULL YEAR TABLE VỚI CỘT ĐÁNH GIÁ T, H, C TRƯỚC LỜI NHẬN XÉT CHO MỖI THỜI ĐIỂM */
            <table className="w-full text-left border-collapse min-w-[1300px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-2 w-10 text-center">STT</th>
                  <th className="py-3 px-2 w-20">Mã HS</th>
                  <th className="py-3 px-2 w-32">Họ và Tên</th>
                  
                  {/* 1. Giữa HK I: Đánh giá T/H/C -> Lời nhận xét */}
                  <th className="py-3 px-1.5 w-16 text-center text-blue-600 dark:text-blue-400 font-black">
                    ĐG 1 (T/H/C)
                  </th>
                  <th className="py-3 px-2 min-w-[130px] text-blue-600 dark:text-blue-400">
                    1. Nhận xét Giữa HK I
                  </th>

                  {/* 2. Cuối HK I: Điểm thi 1 -> Đánh giá T/H/C -> Lời nhận xét */}
                  <th className="py-3 px-1 w-14 text-center text-amber-600 font-black">
                    Điểm 1
                  </th>
                  <th className="py-3 px-1.5 w-16 text-center text-amber-600 dark:text-amber-400 font-black">
                    ĐG 2 (T/H/C)
                  </th>
                  <th className="py-3 px-2 min-w-[130px] text-amber-600 dark:text-amber-400">
                    2. Nhận xét Cuối HK I
                  </th>

                  {/* 3. Giữa HK II: Đánh giá T/H/C -> Lời nhận xét */}
                  <th className="py-3 px-1.5 w-16 text-center text-indigo-600 dark:text-indigo-400 font-black">
                    ĐG 3 (T/H/C)
                  </th>
                  <th className="py-3 px-2 min-w-[130px] text-indigo-600 dark:text-indigo-400">
                    3. Nhận xét Giữa HK II
                  </th>

                  {/* 4. Cuối HK II: Điểm thi 2 -> Đánh giá T/H/C -> Lời nhận xét */}
                  <th className="py-3 px-1 w-14 text-center text-emerald-600 font-black">
                    Điểm 2
                  </th>
                  <th className="py-3 px-1.5 w-16 text-center text-emerald-600 dark:text-emerald-400 font-black">
                    ĐG 4 (T/H/C)
                  </th>
                  <th className="py-3 px-2 min-w-[130px] text-emerald-600 dark:text-emerald-400">
                    4. Nhận xét Cuối HK II
                  </th>

                  <th className="py-3 px-2 w-14 text-center">Lưu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      Không tìm thấy học sinh nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const rowScores = editScores[student.id] || { hk1: '', hk2: '' };
                    const commentMap = editComments[student.id] || {
                      'Giữa học kỳ I': '',
                      'Cuối học kỳ I': '',
                      'Giữa học kỳ II': '',
                      'Cuối học kỳ II': ''
                    };
                    const levelMap = editLevels[student.id] || {
                      'Giữa học kỳ I': 'H',
                      'Cuối học kỳ I': 'H',
                      'Giữa học kỳ II': 'H',
                      'Cuối học kỳ II': 'H'
                    };

                    const autoLvl1 = computeAutoEvaluationLevel(student.id, 'Giữa học kỳ I', assessments, scores);
                    const autoLvl2 = computeAutoEvaluationLevel(student.id, 'Cuối học kỳ I', assessments, scores, rowScores.hk1);
                    const autoLvl3 = computeAutoEvaluationLevel(student.id, 'Giữa học kỳ II', assessments, scores);
                    const autoLvl4 = computeAutoEvaluationLevel(student.id, 'Cuối học kỳ II', assessments, scores, rowScores.hk2);

                    const lvl1 = levelMap['Giữa học kỳ I'] || autoLvl1;
                    const lvl2 = levelMap['Cuối học kỳ I'] || autoLvl2;
                    const lvl3 = levelMap['Giữa học kỳ II'] || autoLvl3;
                    const lvl4 = levelMap['Cuối học kỳ II'] || autoLvl4;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-700/10 transition-colors">
                        <td className="py-3 px-2 font-bold text-center text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-2 font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">{student.studentId}</td>
                        <td className="py-3 px-2">
                          <div className="font-black text-slate-900 dark:text-white text-xs whitespace-nowrap tracking-wide">{student.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{student.gender}</div>
                        </td>

                        {/* 1. Giữa HK I - Đánh giá T, H, C */}
                        <td className="py-2 px-1 text-center">
                          <select
                            value={lvl1}
                            disabled={readOnly}
                            onChange={(e) => handleLevelChange(student.id, 'Giữa học kỳ I', e.target.value as EvaluationLevel)}
                            className={`w-12 py-1 text-center font-black text-xs rounded-lg border outline-none cursor-pointer ${
                              lvl1 === 'T'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black'
                                : lvl1 === 'H'
                                ? 'bg-blue-50 text-blue-800 border-blue-300 font-black'
                                : 'bg-amber-50 text-amber-800 border-amber-300 font-black'
                            }`}
                            title={`Mức đánh giá Giữa HK I: ${lvl1} (Tự động từ dữ liệu: ${autoLvl1})`}
                          >
                            <option value="T">T</option>
                            <option value="H">H</option>
                            <option value="C">C</option>
                          </select>
                        </td>

                        {/* 1. Giữa HK I - Lời nhận xét: Chữ đen trên nền trắng */}
                        <td className="py-2 px-1.5">
                          <div className="relative group">
                            <textarea
                              value={commentMap['Giữa học kỳ I'] || ''}
                              onChange={(e) => handleCommentChange(student.id, 'Giữa học kỳ I', e.target.value)}
                              placeholder={readOnly ? (commentMap['Giữa học kỳ I'] || '-') : `Nhận xét Giữa HK1 (${lvl1})...`}
                              readOnly={readOnly}
                              className={`w-full h-14 p-1.5 text-[11px] rounded-lg border border-slate-300 bg-white text-black font-medium placeholder:text-slate-400 shadow-inner leading-tight ${
                                readOnly ? 'opacity-80 cursor-default' : 'focus:outline-none focus:ring-1 focus:ring-blue-500'
                              }`}
                            />
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleGenerateAIForStudent(student.id, 'Giữa học kỳ I')}
                                className="absolute right-1 top-1 p-1 bg-white/95 text-blue-600 rounded shadow-xs text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 cursor-pointer border border-blue-200"
                                title={`Tự động đưa ra Đánh giá & Nhận xét AI Giữa HK I (Mức ${lvl1})`}
                              >
                                <Sparkles className="w-3 h-3 text-amber-500" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 2. Cuối HK I - Điểm HK1 */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="text"
                            value={rowScores.hk1 || ''}
                            onChange={(e) => handleScoreChange(student.id, 'hk1', e.target.value)}
                            placeholder="-"
                            readOnly={readOnly}
                            disabled={readOnly}
                            className={`w-11 px-1 py-1 text-center font-black text-xs rounded border border-slate-300 bg-white text-black shadow-xs ${
                              readOnly ? 'opacity-70 cursor-default' : 'focus:outline-none focus:ring-1 focus:ring-amber-500'
                            }`}
                          />
                        </td>

                        {/* 2. Cuối HK I - Đánh giá T, H, C */}
                        <td className="py-2 px-1 text-center">
                          <select
                            value={lvl2}
                            disabled={readOnly}
                            onChange={(e) => handleLevelChange(student.id, 'Cuối học kỳ I', e.target.value as EvaluationLevel)}
                            className={`w-12 py-1 text-center font-black text-xs rounded-lg border outline-none cursor-pointer ${
                              lvl2 === 'T'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black'
                                : lvl2 === 'H'
                                ? 'bg-blue-50 text-blue-800 border-blue-300 font-black'
                                : 'bg-amber-50 text-amber-800 border-amber-300 font-black'
                            }`}
                            title={`Mức đánh giá Cuối HK I: ${lvl2} (Tự động từ dữ liệu: ${autoLvl2})`}
                          >
                            <option value="T">T</option>
                            <option value="H">H</option>
                            <option value="C">C</option>
                          </select>
                        </td>

                        {/* 2. Cuối HK I - Lời nhận xét: Chữ đen trên nền trắng */}
                        <td className="py-2 px-1.5">
                          <div className="relative group">
                            <textarea
                              value={commentMap['Cuối học kỳ I'] || ''}
                              onChange={(e) => handleCommentChange(student.id, 'Cuối học kỳ I', e.target.value)}
                              placeholder={readOnly ? (commentMap['Cuối học kỳ I'] || '-') : `Nhận xét Cuối HK1 (${lvl2})...`}
                              readOnly={readOnly}
                              className={`w-full h-14 p-1.5 text-[11px] rounded-lg border border-slate-300 bg-white text-black font-medium placeholder:text-slate-400 shadow-inner leading-tight ${
                                readOnly ? 'opacity-80 cursor-default' : 'focus:outline-none focus:ring-1 focus:ring-amber-500'
                              }`}
                            />
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleGenerateAIForStudent(student.id, 'Cuối học kỳ I')}
                                className="absolute right-1 top-1 p-1 bg-white/95 text-amber-600 rounded shadow-xs text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 cursor-pointer border border-amber-200"
                                title={`Tự động đưa ra Đánh giá & Nhận xét AI Cuối HK I (Mức ${lvl2})`}
                              >
                                <Sparkles className="w-3 h-3 text-amber-500" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 3. Giữa HK II - Đánh giá T, H, C */}
                        <td className="py-2 px-1 text-center">
                          <select
                            value={lvl3}
                            disabled={readOnly}
                            onChange={(e) => handleLevelChange(student.id, 'Giữa học kỳ II', e.target.value as EvaluationLevel)}
                            className={`w-12 py-1 text-center font-black text-xs rounded-lg border outline-none cursor-pointer ${
                              lvl3 === 'T'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black'
                                : lvl3 === 'H'
                                ? 'bg-blue-50 text-blue-800 border-blue-300 font-black'
                                : 'bg-amber-50 text-amber-800 border-amber-300 font-black'
                            }`}
                            title={`Mức đánh giá Giữa HK II: ${lvl3} (Tự động từ dữ liệu: ${autoLvl3})`}
                          >
                            <option value="T">T</option>
                            <option value="H">H</option>
                            <option value="C">C</option>
                          </select>
                        </td>

                        {/* 3. Giữa HK II - Lời nhận xét: Chữ đen trên nền trắng */}
                        <td className="py-2 px-1.5">
                          <div className="relative group">
                            <textarea
                              value={commentMap['Giữa học kỳ II'] || ''}
                              onChange={(e) => handleCommentChange(student.id, 'Giữa học kỳ II', e.target.value)}
                              placeholder={readOnly ? (commentMap['Giữa học kỳ II'] || '-') : `Nhận xét Giữa HK2 (${lvl3})...`}
                              readOnly={readOnly}
                              className={`w-full h-14 p-1.5 text-[11px] rounded-lg border border-slate-300 bg-white text-black font-medium placeholder:text-slate-400 shadow-inner leading-tight ${
                                readOnly ? 'opacity-80 cursor-default' : 'focus:outline-none focus:ring-1 focus:ring-indigo-500'
                              }`}
                            />
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleGenerateAIForStudent(student.id, 'Giữa học kỳ II')}
                                className="absolute right-1 top-1 p-1 bg-white/95 text-indigo-600 rounded shadow-xs text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 cursor-pointer border border-indigo-200"
                                title={`Tự động đưa ra Đánh giá & Nhận xét AI Giữa HK II (Mức ${lvl3})`}
                              >
                                <Sparkles className="w-3 h-3 text-amber-500" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. Cuối HK II - Điểm HK2 */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="text"
                            value={rowScores.hk2 || ''}
                            onChange={(e) => handleScoreChange(student.id, 'hk2', e.target.value)}
                            placeholder="-"
                            readOnly={readOnly}
                            disabled={readOnly}
                            className={`w-11 px-1 py-1 text-center font-black text-xs rounded border border-slate-300 bg-white text-black shadow-xs ${
                              readOnly ? 'opacity-70 cursor-default' : 'focus:outline-none focus:ring-1 focus:ring-emerald-500'
                            }`}
                          />
                        </td>

                        {/* 4. Cuối HK II - Đánh giá T, H, C */}
                        <td className="py-2 px-1 text-center">
                          <select
                            value={lvl4}
                            disabled={readOnly}
                            onChange={(e) => handleLevelChange(student.id, 'Cuối học kỳ II', e.target.value as EvaluationLevel)}
                            className={`w-12 py-1 text-center font-black text-xs rounded-lg border outline-none cursor-pointer ${
                              lvl4 === 'T'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black'
                                : lvl4 === 'H'
                                ? 'bg-blue-50 text-blue-800 border-blue-300 font-black'
                                : 'bg-amber-50 text-amber-800 border-amber-300 font-black'
                            }`}
                            title={`Mức đánh giá Cuối HK II: ${lvl4} (Tự động từ dữ liệu: ${autoLvl4})`}
                          >
                            <option value="T">T</option>
                            <option value="H">H</option>
                            <option value="C">C</option>
                          </select>
                        </td>

                        {/* 4. Cuối HK II - Lời nhận xét: Chữ đen trên nền trắng */}
                        <td className="py-2 px-1.5">
                          <div className="relative group">
                            <textarea
                              value={commentMap['Cuối học kỳ II'] || ''}
                              onChange={(e) => handleCommentChange(student.id, 'Cuối học kỳ II', e.target.value)}
                              placeholder={readOnly ? (commentMap['Cuối học kỳ II'] || '-') : `Nhận xét Cuối HK2 (${lvl4})...`}
                              readOnly={readOnly}
                              className={`w-full h-14 p-1.5 text-[11px] rounded-lg border border-slate-300 bg-white text-black font-medium placeholder:text-slate-400 shadow-inner leading-tight ${
                                readOnly ? 'opacity-80 cursor-default' : 'focus:outline-none focus:ring-1 focus:ring-emerald-500'
                              }`}
                            />
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleGenerateAIForStudent(student.id, 'Cuối học kỳ II')}
                                className="absolute right-1 top-1 p-1 bg-white/95 text-emerald-600 rounded shadow-xs text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 cursor-pointer border border-emerald-200"
                                title={`Tự động đưa ra Đánh giá & Nhận xét AI Cuối HK II (Mức ${lvl4})`}
                              >
                                <Sparkles className="w-3 h-3 text-amber-500" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Save Entire Row */}
                        <td className="py-2 px-1.5 text-center">
                          {readOnly ? (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-750 px-2 py-1 rounded">
                              Chỉ xem
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSaveStudentRow(student.id)}
                              className="p-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-slate-700 dark:hover:bg-blue-600 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center"
                              title="Lưu đánh giá T/H/C, điểm và nhận xét của học sinh này"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
