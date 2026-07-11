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
        period // "Giữa học kỳ I", "Cuối học kỳ I", "Giữa học kỳ II", "Cuối học kỳ II"
      } = req.body;

      if (!studentName) {
        return res.status(400).json({ error: 'Missing studentName parameter' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Return a mock AI comment tailored to the specific period to make the app still incredibly graceful and functional
        const scoreStr = scores && scores.length > 0 
          ? ` (Điểm thi: ${scores.map((s: any) => `${s.semester}: ${s.score}/10`).join(', ')})`
          : '';
        const lessonsStr = totalLessonsEvaluated > 0 
          ? `Qua ${totalLessonsEvaluated} tiết học thực hành, ` 
          : '';
        
        let processDescription = '';
        if (completionStats.excellent > completionStats.completed) {
          processDescription = `thao tác máy tính rất nhanh nhẹn, luôn dẫn đầu lớp và hoàn thành xuất sắc các sản phẩm học tập.`;
        } else {
          processDescription = `tiếp thu bài tốt, hoàn thành đầy đủ nội dung bài học và thực hành nghiêm túc.`;
        }

        let finalComment = '';
        if (period === 'Giữa học kỳ I') {
          finalComment = `Em ${studentName} làm quen với phòng máy tính rất tốt, ${processDescription} Giờ học luôn chú ý nghe giảng, có thái độ học tập tích cực, tự tin bước đầu trong môn Tin học.`;
        } else if (period === 'Cuối học kỳ I') {
          finalComment = `Học kỳ I vừa qua, em ${studentName} đạt kết quả tốt, ${processDescription} Thao tác sử dụng bàn phím và chuột đúng kỹ thuật, thái độ học tập chuyên cần${scoreStr}.`;
        } else if (period === 'Giữa học kỳ II') {
          finalComment = `Em ${studentName} thể hiện tiến bộ rõ rệt trong nửa đầu kỳ II, ${processDescription} Em rất hào hứng khi học các chủ đề mới (như Scratch/PowerPoint) và luôn nỗ lực thực hành sáng tạo.`;
        } else if (period === 'Cuối học kỳ II') {
          finalComment = `Tổng kết cả năm học, em ${studentName} hoàn thành tốt chương trình Tin học lớp ${className}, ${processDescription} Kỹ năng thực hành máy tính vững vàng, tư duy logic tốt và luôn chăm chỉ rèn luyện${scoreStr}.`;
        } else {
          // General fallback
          finalComment = `Em ${studentName} học lớp ${className} có ý thức học tập tốt, ${processDescription} Kỹ năng thực hành máy tính đạt chuẩn kiến thức kỹ năng, chăm ngoan và tích cực đóng góp xây dựng bài${scoreStr}.`;
        }

        return res.json({ comment: finalComment, isMock: true });
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

      // Construct a highly detailed and context-aware prompt for Gemini 3.5 Flash
      const prompt = `Bạn là một giáo viên dạy bộ môn Tin học Tiểu học có tâm, am hiểu tâm lý trẻ em và biết cách nhận xét học bạ chuẩn mực theo Thông tư giáo dục tiểu học Việt Nam.
Hãy sinh ra một lời nhận xét học kỳ hoặc thời điểm cụ thể, ngắn gọn, súc tích (khoảng 2-4 câu) phù hợp với thời điểm của học sinh tiểu học sau đây:

Thông tin học sinh:
- Tên học sinh: ${studentName}
- Khối lớp: ${gradeName}
- Lớp: ${className}
- Các ghi chú đặc biệt từ giáo viên: ${notes || 'Chưa ghi chú'}
- Điểm thi định kỳ học kỳ (nếu có): ${scores && scores.length > 0 ? scores.map((s: any) => `${s.semester}: ${s.score}/10`).join(', ') : 'Chưa có điểm'}

Thời điểm đánh giá được yêu cầu:
- THỜI ĐIỂM CỤ THỂ: ${period || 'Nhận xét chung'}
${currentTimelineWeek ? `- Đang ở tuần học thực tế: ${currentTimelineWeek.week} (Từ ngày ${currentTimelineWeek.startDate} đến ngày ${currentTimelineWeek.endDate}) thuộc ${currentTimelineWeek.semester}` : ''}

Thống kê quá trình học tập thực tế (Đồng bộ từ hệ thống quản lý học tập):
- Tổng số buổi học được đánh giá trước đó: ${totalLessonsEvaluated} buổi học
- Kết quả hoàn thành bài thực hành: ${completionStats.excellent} buổi đạt loại Xuất sắc/Hoàn thành tốt, ${completionStats.completed} buổi Hoàn thành, ${completionStats.notCompleted} buổi Chưa hoàn thành.
- Tinh thần thái độ học tập: ${attitudeStats.positive} buổi Tích cực, ${attitudeStats.normal} buổi Bình thường, ${attitudeStats.needsImprovement} buổi Cần cố gắng.
- Sự phát triển kỹ năng máy tính: ${skillStats.proficient} buổi Thành thạo, ${skillStats.passed} buổi Đạt yêu cầu, ${skillStats.needsImprovement} buổi Chưa đạt.
- Kỹ năng tương tác, làm việc nhóm: ${cooperationStats.good} buổi Tốt, ${cooperationStats.passed} buổi Đạt, ${cooperationStats.needsImprovement} buổi Cần cố gắng thêm.

Danh sách đánh giá chi tiết của các buổi học gần đây nhất:
${JSON.stringify(assessments, null, 2)}

Yêu cầu nhận xét:
1. Nhận xét bằng tiếng Việt, giọng điệu ấm áp, mang tính xây dựng và động viên học sinh Tiểu học nhưng phải cực kỳ chính xác dựa trên DỮ LIỆU THỰC TẾ TRÊN.
2. PHẢI PHÙ HỢP HOÀN TOÀN VỚI THỜI ĐIỂM ĐÁNH GIÁ ĐƯỢC CHỌN:
   - Nếu thời điểm đánh giá là "Giữa học kỳ I", hãy nhận xét tập trung khen ngợi nỗ lực làm quen máy tính bước đầu, tư thế ngồi, cách đặt tay lên hàng phím và thái độ nề nếp học tập trong 10 tuần đầu. KHÔNG nhắc tới điểm thi cuối học kỳ.
   - Nếu thời điểm đánh giá là "Cuối học kỳ I", hãy tổng kết toàn diện kết quả học tập kỳ 1, kỹ năng sử dụng máy tính, thực hành, thái độ và kết hợp nhận xét với điểm số thi học kỳ I (nếu có).
   - Nếu thời điểm đánh giá là "Giữa học kỳ II", tập trung vào tiến trình học tập của nửa đầu kỳ 2 (như bắt đầu làm quen với lập trình trực quan Scratch hoặc thiết kế trình chiếu PowerPoint, thái độ chủ động thực hành), không nhắc tới điểm thi.
   - Nếu thời điểm đánh giá là "Cuối học kỳ II" (hoặc cuối năm), tổng kết toàn bộ quá trình, sự tiến bộ vượt bậc sau một năm rèn luyện kỹ năng thực hành Tin học (gõ phím, sử dụng phần mềm, tư duy Scratch/PowerPoint) và nhận xét đối chiếu với điểm thi học kỳ II (nếu có).
3. PHẢI ĐỐI CHIẾU rõ giữa:
   - Tổng số buổi học tham gia đánh giá (${totalLessonsEvaluated} buổi) để nhận xét về độ chuyên cần và quá trình rèn luyện.
   - Điểm số thi học kỳ (nếu có): Khen ngợi nếu điểm cao tương xứng với quá trình rèn luyện chăm chỉ; động viên cố gắng nếu điểm thi chưa đạt kỳ vọng dù quá trình học tốt, hoặc chỉ ra sự tập trung chưa đều nếu điểm thi thấp và quá trình nhiều buổi chưa hoàn thành.
4. Không được máy móc hay rập khuôn chung chung. Hãy dùng tên riêng "${studentName}" để nhận xét gần gũi.
5. Độ dài giới hạn nghiêm ngặt từ 40 đến 80 từ, phù hợp để lưu trữ trong học bạ số hoặc hệ thống liên lạc điện tử.
6. Trả về TRỰC TIẾP văn bản nhận xét kết quả, không viết thêm bất kỳ định dạng Markdown hay lời dẫn/kết, lời thưa gửi nào khác.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          temperature: 0.7,
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
