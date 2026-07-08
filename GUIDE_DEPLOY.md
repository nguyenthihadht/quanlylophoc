# HƯỚNG DẪN CÀI ĐẶT & TRIỂN KHAI HỆ THỐNG HỌC BẠ TIN HỌC

Tài liệu hướng dẫn triển khai hệ thống quản lý học tập dành riêng cho giáo viên Tin học Tiểu học.

---

## I. CẤU TRÚC THƯ MỤC DỰ ÁN

Dưới đây là cấu trúc thư mục hiện tại của hệ thống:
```text
├── data/
│   └── db.json               # Lưu trữ dữ liệu lớp học, điểm số ngoại tuyến
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx        # Bảng điều khiển KPI & Nhật ký dạy gần đây
│   │   ├── SchoolManager.tsx    # Quản lý Năm học, Khối, Lớp học
│   │   ├── StudentManager.tsx   # Nhập học sinh, tải mẫu Excel, Parse CSV
│   │   ├── LessonEvaluator.tsx  # Công cụ Đánh giá nhanh Roster (1-Click)
│   │   ├── LessonDiaries.tsx    # Lịch sử bài dạy, chi tiết kết quả, in ấn
│   │   ├── StudentPortfolio.tsx # Học bạ, Nhật ký đánh giá, Nhận xét AI Gemini
│   │   ├── StatsReports.tsx     # Báo cáo SVG, biểu đồ phân bổ, xuất Excel/Word
│   │   └── BackupSettings.tsx   # Thiết lập tên trường, GV, Sao lưu & Restore JSON
│   ├── lib/
│   │   └── api.ts               # Bộ điều phối trạng thái, LocalStorage, Gọi API
│   ├── types.ts                 # Định nghĩa Interface dữ liệu (TypeScript)
│   ├── main.tsx                 # Điểm khởi tạo ứng dụng React
│   ├── index.css                # Cấu hình Tailwind CSS v4 & Google Fonts
│   └── App.tsx                  # Khung ứng dụng chính & Giao diện đăng nhập
├── .env.example                 # Mẫu khai báo biến môi trường (Gemini API Key)
├── package.json                 # Quản lý các thư viện phụ thuộc & câu lệnh chạy
├── server.ts                    # Máy chủ Express & Trợ lý ảo AI Gemini
└── vite.config.ts               # Cấu hình đóng gói Vite
```

---

## II. HƯỚNG DẪN CÀI ĐẶT CỤC BỘ (LOCAL DEVELOPMENT)

Để chạy thử nghiệm ứng dụng trên máy tính cá nhân của thầy cô:

1. **Yêu cầu hệ thống**: Cài đặt sẵn [Node.js](https://nodejs.org/) (phiên bản 18 trở lên).
2. **Cài đặt thư viện**:
   ```bash
   npm install
   ```
3. **Cấu hình API Key**:
   * Sao chép tệp `.env.example` thành `.env`:
     ```bash
     cp .env.example .env
     ```
   * Mở tệp `.env` và điền khóa [Gemini API Key](https://aistudio.google.com/) của thầy cô:
     ```env
     GEMINI_API_KEY="AIzaSyYourActualKeyHere..."
     ```
4. **Chạy ứng dụng chế độ phát triển**:
   ```bash
   npm run dev
   ```
   * Sau đó mở trình duyệt và truy cập: `http://localhost:3000`

---

## III. HƯỚNG DẪN CẤU HÌNH BIẾN MÔI TRƯỜNG VÀ DEPLOY LÊN VERCEL

Do ứng dụng có cả phần máy chủ **Node.js/Express** và giao diện **React**, khi đưa lên Vercel, chúng ta sẽ tận dụng cấu trúc **Serverless Functions** để chạy phần API máy chủ cực kỳ mượt mà.

### 1. Tạo tệp cấu hình `vercel.json` ở thư mục gốc (Nếu muốn deploy Vercel Serverless)
Tạo một tệp tên là `vercel.json` ở thư mục gốc để Vercel hiểu cách định tuyến:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/$1",
      "continue": true
    }
  ]
}
```

### 2. Cấu hình biến môi trường trên trang quản trị Vercel
1. Truy cập vào Dashboard của **Vercel** (`https://vercel.com`).
2. Chọn dự án **Học bạ Tin học** của thầy cô.
3. Chuyển sang mục **Settings** -> **Environment Variables**.
4. Thêm biến môi trường mới sau đây:
   * **Key**: `GEMINI_API_KEY`
   * **Value**: *[Dán khóa API Gemini của thầy cô vào đây]*
5. Nhấp **Save**.

### 3. Deploy bằng lệnh Vercel CLI
```bash
# Cài đặt công cụ Vercel CLI toàn cục
npm install -g vercel

# Đăng nhập vào Vercel
vercel login

# Bắt đầu deploy (lần đầu tiên)
vercel

# Đưa lên production chính thức
vercel --prod
```

---

## IV. HƯỚNG DẪN CẤU HÌNH THÊM FIREBASE (NẾU MUỐN NÂNG CẤP LƯU TRỮ TRỰC TUYẾN)

Ứng dụng hiện tại đã tối ưu hóa lưu trữ song song tại máy chủ Express (`data/db.json`) kết hợp lưu dự phòng tại bộ nhớ cục bộ (`LocalStorage`), đảm bảo dữ liệu không bao giờ bị mất ngay cả khi tắt trình duyệt.

Nếu thầy cô muốn nâng cấp lên **Firebase Firestore** để lưu trữ đám mây đa thiết bị:
1. Truy cập [Firebase Console](https://console.firebase.google.com/) và tạo một dự án mới.
2. Thêm một ứng dụng Web để nhận bộ khóa cấu hình SDK:
   ```json
   {
     "apiKey": "AIzaSy...",
     "authDomain": "tin-hoc-db.firebaseapp.com",
     "projectId": "tin-hoc-db",
     "storageBucket": "tin-hoc-db.appspot.com",
     "messagingSenderId": "...",
     "appId": "..."
   }
   ```
3. Cài đặt thư viện Firebase vào dự án:
   ```bash
   npm install firebase
   ```
4. Kích hoạt dịch vụ **Cloud Firestore** ở chế độ sản xuất hoặc thử nghiệm trong bảng điều khiển Firebase.
5. Tạo tệp `/src/lib/firebase.ts` để lưu trữ cấu hình trên và đồng bộ hóa hàm `saveState` trong `api.ts` lên Firestore thay vì lưu trữ cục bộ.
