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
      const { studentName, gradeName, className, assessments, scores, notes } = req.body;

      if (!studentName) {
        return res.status(400).json({ error: 'Missing studentName parameter' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Return a mock AI comment if key isn't provided to make the app still graceful and functional
        const scoreStr = scores && scores.length > 0 
          ? ` (Điểm thi: ${scores.map((s: any) => `${s.semester}: ${s.score}/10`).join(', ')})`
          : '';
        const mockComments = [
          `Em ${studentName} học lớp ${className} có ý thức học tập rất tốt, thao tác máy tính nhanh nhẹn, hoàn thành tốt các bài tập Tin học, đạt điểm số thi rất ấn tượng, cần tiếp tục phát huy trong năm học tới.${scoreStr}`,
          `Em ${studentName} có thái độ học tập tích cực, kỹ năng sử dụng chuột và gõ phím đạt yêu cầu. Rất hợp tác với các bạn trong giờ thực hành.${scoreStr}`,
          `Em ${studentName} nắm vững kiến thức bài học, tích cực tương tác, hoàn thành xuất sắc các sản phẩm Tin học tiểu học.${scoreStr}`,
          `Em ${studentName} có tiến bộ tốt trong các bài thực hành, chăm chú nghe giảng và hoàn thành bài đầy đủ.${scoreStr}`
        ];
        const randomComment = mockComments[Math.floor(Math.random() * mockComments.length)];
        return res.json({ comment: randomComment, isMock: true });
      }

      // Initialize GoogleGenAI SDK
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct a high-quality prompt for Gemini 3.5 Flash
      const prompt = `Bạn là một giáo viên Tin học Tiểu học có tâm, am hiểu tâm lý trẻ em và đánh giá khách quan.
Hãy sinh ra một lời nhận xét học kỳ 2 (hoặc cả năm) ngắn gọn, súc tích (khoảng 2-4 câu) cho học sinh tiểu học sau đây:

Thông tin học sinh:
- Tên học sinh: ${studentName}
- Khối lớp: ${gradeName}
- Lớp: ${className}
- Các ghi chú của giáo viên: ${notes || 'Chưa ghi chú'}
- Điểm kiểm tra định kỳ (nếu có): ${scores && scores.length > 0 ? scores.map((s: any) => `${s.semester}: ${s.score}/10`).join(', ') : 'Chưa có điểm'}

Danh sách đánh giá các buổi học gần nhất (Hoàn thành, Thái độ, Kỹ năng, Hợp tác):
${JSON.stringify(assessments, null, 2)}

Yêu cầu nhận xét:
1. Nhận xét bằng tiếng Việt, ấm áp, có tính động viên học sinh Tiểu học nhưng vẫn chỉ rõ ưu khuyết điểm thực tế dựa trên danh sách đánh giá.
2. Không được máy móc, rập khuôn. Hãy cá nhân hóa nhận xét dựa trên tên, kết quả đánh giá quá trình học tập và đặc biệt là điểm thi học kỳ nếu có (ví dụ: điểm thi cao thì tuyên dương, điểm chưa tốt thì khích lệ cố gắng thêm).
3. Độ dài từ 40 đến 80 từ, phù hợp để ghi vào Sổ liên lạc điện tử hoặc Học bạ.
4. Trả về trực tiếp văn bản nhận xét, không thêm bất kỳ định dạng Markdown hay lời mở đầu/kết thúc nào.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          temperature: 0.8,
        }
      });

      const generatedComment = response.text ? response.text.trim() : '';
      res.json({ comment: generatedComment, isMock: false });
    } catch (error: any) {
      console.error('Gemini API call failed:', error);
      res.status(500).json({ error: error?.message || 'Failed to generate AI comment' });
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
