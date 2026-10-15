/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'db.json');

// Helper to load database
function loadDb() {
  if (fs.existsSync(DB_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch (e) {
      console.error('Error reading db.json, returning empty', e);
    }
  }
  return getSeedData();
}

// Helper to save database
function saveDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Mock seed data for instant, beautiful experience
function getSeedData() {
  const schoolYears = [
    { id: 'y1', name: '2025-2026', isCurrent: false },
    { id: 'y2', name: '2026-2027', isCurrent: true }
  ];

  const grades = [
    { id: 'g3', name: 'Khối 3' },
    { id: 'g4', name: 'Khối 4' },
    { id: 'g5', name: 'Khối 5' }
  ];

  const classes = [
    { id: 'c31', name: '3A1', gradeId: 'g3', homeroomTeacher: 'Cô Lê Thị Mai' },
    { id: 'c32', name: '3A2', gradeId: 'g3', homeroomTeacher: 'Thầy Nguyễn Văn Nam' },
    { id: 'c41', name: '4A1', gradeId: 'g4', homeroomTeacher: 'Cô Phạm Thanh Thủy' },
    { id: 'c51', name: '5A1', gradeId: 'g5', homeroomTeacher: 'Cô Trần Minh Phương' }
  ];

  const students = [
    // 3A1
    { id: 's1', studentId: 'HS00301', name: 'Nguyễn Minh Khang', gender: 'Nam', dob: '2017-04-12', classId: 'c31', note: 'Học sinh thông minh, nhanh nhẹn' },
    { id: 's2', studentId: 'HS00302', name: 'Trần Thị Mỹ Linh', gender: 'Nữ', dob: '2017-08-25', classId: 'c31', note: 'Chăm ngoan, biết lắng nghe' },
    { id: 's3', studentId: 'HS00303', name: 'Lê Hoàng Nam', gender: 'Nam', dob: '2017-02-15', classId: 'c31', note: 'Còn rụt rè, cần khuyến khích' },
    // 3A2
    { id: 's4', studentId: 'HS00304', name: 'Phạm Hải Đăng', gender: 'Nam', dob: '2017-11-03', classId: 'c32', note: 'Hiếu động, thích khám phá máy tính' },
    { id: 's5', studentId: 'HS00305', name: 'Đỗ Thùy Chi', gender: 'Nữ', dob: '2017-09-18', classId: 'c32', note: 'Rất cẩn thận và chăm chỉ' },
    // 4A1
    { id: 's6', studentId: 'HS00401', name: 'Hoàng Quốc Bảo', gender: 'Nam', dob: '2016-05-20', classId: 'c41', note: 'Kỹ năng gõ bàn phím khá tốt' },
    { id: 's7', studentId: 'HS00402', name: 'Phan Thanh Trúc', gender: 'Nữ', dob: '2016-01-30', classId: 'c41', note: 'Luôn hoàn thành bài tập sớm' },
    { id: 's8', studentId: 'HS00403', name: 'Vũ Việt Anh', gender: 'Nam', dob: '2016-07-14', classId: 'c41', note: 'Đôi khi chưa tập trung trong giờ học' },
    // 5A1
    { id: 's9', studentId: 'HS00501', name: 'Bùi Hồng Nhung', gender: 'Nữ', dob: '2015-10-05', classId: 'c51', note: 'Sáng tạo trong vẽ tranh MS Paint' },
    { id: 's10', studentId: 'HS00502', name: 'Đặng Minh Quân', gender: 'Nam', dob: '2015-12-22', classId: 'c51', note: 'Có tư duy logic rất tốt' }
  ];

  const lessons = [
    { id: 'l1', date: '2026-06-15', classId: 'c31', lessonName: 'Làm quen với bàn phím máy tính', content: 'Hướng dẫn học sinh nhận biết khu vực phím, cách đặt tay lên hàng phím cơ sở và thực hành gõ phím nhẹ nhàng.', createdBy: 'Cô Nguyễn Thị Hà' },
    { id: 'l2', date: '2026-06-22', classId: 'c31', lessonName: 'Tập gõ hàng phím cơ sở', content: 'Thực hành gõ 10 ngón phím cơ sở với phần mềm hỗ trợ RapidTyping.', createdBy: 'Cô Nguyễn Thị Hà' },
    { id: 'l3', date: '2026-06-18', classId: 'c41', lessonName: 'Tìm kiếm thông tin trên Internet', content: 'Cách sử dụng Google để tìm tư liệu hình ảnh và văn bản phục vụ môn học.', createdBy: 'Cô Nguyễn Thị Hà' }
  ];

  const assessments = [
    // Lesson 1 - c31
    { id: 'a1', studentId: 's1', lessonId: 'l1', date: '2026-06-15', completion: 'Hoàn thành tốt', attitude: 'Tích cực', skill: 'Thành thạo', cooperation: 'Tốt' },
    { id: 'a2', studentId: 's2', lessonId: 'l1', date: '2026-06-15', completion: 'Hoàn thành', attitude: 'Bình thường', skill: 'Đạt', cooperation: 'Đạt' },
    { id: 'a3', studentId: 's3', lessonId: 'l1', date: '2026-06-15', completion: 'Chưa hoàn thành', attitude: 'Chưa tập trung', skill: 'Cần hỗ trợ', cooperation: 'Cần cố gắng' },

    // Lesson 2 - c31
    { id: 'a4', studentId: 's1', lessonId: 'l2', date: '2026-06-22', completion: 'Hoàn thành tốt', attitude: 'Tích cực', skill: 'Thành thạo', cooperation: 'Tốt' },
    { id: 'a5', studentId: 's2', lessonId: 'l2', date: '2026-06-22', completion: 'Hoàn thành tốt', attitude: 'Tích cực', skill: 'Đạt', cooperation: 'Tốt' },
    { id: 'a6', studentId: 's3', lessonId: 'l2', date: '2026-06-22', completion: 'Hoàn thành', attitude: 'Bình thường', skill: 'Đạt', cooperation: 'Đạt' },

    // Lesson 3 - c41
    { id: 'a7', studentId: 's6', lessonId: 'l3', date: '2026-06-18', completion: 'Hoàn thành tốt', attitude: 'Tích cực', skill: 'Thành thạo', cooperation: 'Tốt' },
    { id: 'a8', studentId: 's7', lessonId: 'l3', date: '2026-06-18', completion: 'Hoàn thành tốt', attitude: 'Tích cực', skill: 'Thành thạo', cooperation: 'Tốt' },
    { id: 'a9', studentId: 's8', lessonId: 'l3', date: '2026-06-18', completion: 'Chưa hoàn thành', attitude: 'Chưa tập trung', skill: 'Cần hỗ trợ', cooperation: 'Cần cố gắng' }
  ];

  const comments = [
    { id: 'co1', studentId: 's1', content: 'Học sinh Nguyễn Minh Khang hoàn thành tốt các bài học, gõ bàn phím rất nhanh và thao tác thành thạo. Tích cực tham gia thảo luận lớp.', createdBy: 'Cô Nguyễn Thị Hà', date: '2026-07-01', type: 'AI' }
  ];

  const settings = {
    schoolName: 'Trường Tiểu học Nguyễn Du',
    teacherName: 'Cô Nguyễn Thị Hà',
    theme: 'light'
  };

  return {
    schoolYears,
    grades,
    classes,
    students,
    lessons,
    assessments,
    comments,
    settings
  };
}

// Initial seed write if database doesn't exist
if (!fs.existsSync(DB_PATH)) {
  saveDb(getSeedData());
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/db', (req, res) => {
    try {
      const db = loadDb();
      res.json(db);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read database' });
    }
  });

  app.post('/api/db', (req, res) => {
    try {
      saveDb(req.body);
      res.json({ success: true, message: 'Database updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update database' });
    }
  });

  // Gemini AI Comment Generator Endpoint
  app.post('/api/gemini/comment', async (req, res) => {
    try {
      const { 
        studentName, 
        gradeName, 
        className, 
        subject = 'Tin học',
        totalLessonsEvaluated = 0,
        completionStats = { excellent: 0, completed: 0, notCompleted: 0 },
        attitudeStats = { positive: 0, normal: 0, needsImprovement: 0 },
        skillStats = { proficient: 0, passed: 0, needsImprovement: 0 },
        cooperationStats = { good: 0, passed: 0, needsImprovement: 0 },
        assessments, 
        scores, 
        notes,
        currentTimelineWeek = null,
        timeline = [],
        period, // "Giữa học kỳ I", "Cuối học kỳ I", "Giữa học kỳ II", "Cuối học kỳ II"
        level // 'T' | 'H' | 'C'
      } = req.body;

      if (!studentName) {
        return res.status(400).json({ error: 'Missing studentName parameter' });
      }

      const isTech = (subject || '').toLowerCase().includes('công nghệ');
      const subjectNameDisplay = isTech ? 'Công nghệ' : 'Tin học';

      const getPositiveFallback = () => {
        if (level === 'T' || (!level && completionStats.excellent > completionStats.completed)) {
          if (period === 'Giữa học kỳ I') {
            return `Em ${studentName} chăm ngoan, tiếp thu bài nhanh, làm quen với môn ${subjectNameDisplay} rất tốt và luôn tích cực trong giờ học.`;
          } else if (period === 'Cuối học kỳ I') {
            return `Em ${studentName} chăm ngoan, hoàn thành xuất sắc các bài thực hành môn ${subjectNameDisplay} học kỳ I, tích cực phát biểu xây dựng bài.`;
          } else if (period === 'Giữa học kỳ II') {
            return `Em ${studentName} có nhiều tiến bộ, thao tác máy tính nhanh nhẹn, sáng tạo và luôn hào hứng trong các tiết học ${subjectNameDisplay}.`;
          } else if (period === 'Cuối học kỳ II') {
            return `Em ${studentName} hoàn thành xuất sắc chương trình môn ${subjectNameDisplay}, kỹ năng thực hành vững vàng, chăm chỉ và tự giác rèn luyện.`;
          }
          return `Em ${studentName} chăm ngoan, tiếp thu bài nhanh, hoàn thành xuất sắc các bài thực hành và luôn tích cực trong giờ học.`;
        } else if (level === 'C') {
          // Positive and encouraging, ABSOLUTELY NO CRITICIZING
          if (period === 'Giữa học kỳ I') {
            return `Em ${studentName} ngoan ngoãn, có nhiều cố gắng làm quen môn ${subjectNameDisplay}, chú ý nghe giảng. Hãy tự tin phát huy nhé!`;
          } else if (period === 'Cuối học kỳ I') {
            return `Em ${studentName} chăm ngoan, luôn nỗ lực trong các tiết thực hành môn ${subjectNameDisplay}. Em hãy tiếp tục cố gắng hơn nữa nhé!`;
          } else if (period === 'Giữa học kỳ II') {
            return `Em ${studentName} có tiến bộ trong học tập, chăm chỉ nghe giảng và thực hành. Hãy tự tin tương tác nhiều hơn nhé!`;
          } else if (period === 'Cuối học kỳ II') {
            return `Em ${studentName} ngoan ngoãn, hoàn thành bài học và luôn có ý thức rèn luyện môn ${subjectNameDisplay}. Tiếp tục cố gắng em nhé!`;
          }
          return `Em ${studentName} chăm ngoan, có nhiều cố gắng trong học tập, chú ý nghe giảng. Hãy tự tin phát huy hơn nữa nhé!`;
        } else {
          // Level H (Hoàn thành)
          if (period === 'Giữa học kỳ I') {
            return `Em ${studentName} chăm ngoan, nề nếp học tập tốt, hoàn thành đầy đủ các bài thực hành môn ${subjectNameDisplay} đầu năm.`;
          } else if (period === 'Cuối học kỳ I') {
            return `Em ${studentName} nắm vững kiến thức môn ${subjectNameDisplay}, hoàn thành tốt các bài thực hành trên lớp. Tiếp tục phát huy nhé!`;
          } else if (period === 'Giữa học kỳ II') {
            return `Em ${studentName} tiếp thu bài tốt, chăm chỉ thực hành môn ${subjectNameDisplay} và tích cực tham gia các hoạt động nhóm.`;
          } else if (period === 'Cuối học kỳ II') {
            return `Em ${studentName} hoàn thành tốt nội dung chương trình môn ${subjectNameDisplay}, kỹ năng thực hành đạt chuẩn, chăm ngoan, lễ phép.`;
          }
          return `Em ${studentName} chăm ngoan, chú ý nghe giảng, nắm vững kiến thức và hoàn thành tốt các bài thực hành trên lớp.`;
        }
      };

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ comment: getPositiveFallback(), level: level || 'H', isMock: true });
      }

      try {
        // Initialize GoogleGenAI SDK
        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        // Construct prompt for Gemini
        const levelLabel = level === 'T' ? 'T (Hoàn thành tốt)' : level === 'H' ? 'H (Hoàn thành)' : level === 'C' ? 'C (Chưa hoàn thành - Cần động viên khích lệ)' : 'Tự động tính từ quá trình';
        const prompt = `Bạn là một giáo viên Tiểu học Việt Nam dạy môn ${subjectNameDisplay}, viết nhận xét học bạ học sinh theo Thông tư 27.
YÊU CẦU ĐẶC BIỆT QUAN TRỌNG:
1. ĐỘ DÀI: NGẮN GỌN, BẮT BUỘC DƯỚI 30 CHỮ (DƯỚI 30 TỪ). Khoảng 15 đến 25 từ là lý tưởng nhất.
2. NỘI DUNG TÍCH CỰC, ĐỘNG VIÊN: Giọng văn ấm áp, khen ngợi sự tiến bộ, khích lệ tinh thần học tập của học sinh Tiểu học.
3. TUYỆT ĐỐI KHÔNG CHÊ BAI HỌC SINH trong bất kỳ trường hợp nào. Ngay cả khi mức đánh giá là C hoặc điểm thi chưa cao, tuyệt đối không dùng từ tiêu cực; hãy ghi nhận sự cố gắng, chăm ngoan của em và khích lệ em tiếp tục rèn luyện.
4. Bắt đầu bằng tên riêng: "Em ${studentName}..." để tạo sự gần gũi.
5. Chỉ trả về DUY NHẤT lời nhận xét ngắn (dưới 30 chữ), không kèm theo định dạng Markdown, dấu ngoặc kép, tiêu đề hay lời dẫn giải nào.

Thông tin học sinh:
- Họ tên: ${studentName}
- Lớp: ${className}
- Môn học: ${subjectNameDisplay}
- Thời điểm đánh giá: ${period || 'Định kỳ'}
- Mức đánh giá: ${levelLabel}
- Điểm thi (nếu có): ${scores && scores.length > 0 ? scores.map((s: any) => `${s.semester}: ${s.score}/10`).join(', ') : 'Chưa có'}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            temperature: 0.7,
          }
        });

        let generatedComment = response.text ? response.text.trim().replace(/^["'“”]+|["'“”]+$/g, '') : '';
        
        // Safety check: ensure under 30 words
        const words = generatedComment.split(/\s+/).filter(Boolean);
        if (words.length > 30) {
          generatedComment = words.slice(0, 28).join(' ') + '...';
        }

        if (!generatedComment) {
          generatedComment = getPositiveFallback();
        }

        return res.json({ comment: generatedComment, level: level || 'H', isMock: false });
      } catch (geminiError: any) {
        console.warn('Gemini API call returned warning, using high-quality positive fallback:', geminiError?.message);
        return res.json({ comment: getPositiveFallback(), level: level || 'H', isMock: true });
      }
    } catch (outerError: any) {
      console.error('API endpoint error:', outerError);
      res.status(500).json({ error: outerError?.message || 'Server error' });
    }
  });

  // Integration with Vite
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
