# SNSQB

**Social Network for Student-Generated Question Bank** — Nền tảng học tập cộng đồng và ngân hàng câu hỏi trắc nghiệm sinh viên.

## Giới thiệu tính năng

Ứng dụng được xây dựng trên nền tảng React 19 + TypeScript + Vite, Tailwind CSS, TanStack Query và Motion.

- **Xác thực & Tài khoản:** Đăng nhập, đổi mật khẩu, quản lý phiên và thiết bị đăng nhập (`/login`, `/settings/profile`, `/settings/devices`, `/settings/password`).
- **Mạng xã hội học tập:** Bảng tin phân trang, đăng bài viết kèm hình ảnh/video, bình luận, tương tác cảm xúc, kết bạn/theo dõi/chặn, tìm kiếm người dùng và nội dung (`/`, `/posts/new`, `/friends`, `/search`, `/videos`).
- **Ngân hàng câu hỏi & Luyện tập:** 
  - **Sinh viên:** Đóng góp bộ câu hỏi theo lớp học phần, tra cứu ngân hàng câu hỏi, làm bài luyện tập trực tuyến, đánh giá câu hỏi (`/question-bank`, `/submissions`, `/practice/:sessionId`).
  - **Giảng viên:** Thẩm định/duyệt bộ câu hỏi, quản lý lớp học phần và ghi danh sinh viên, tạo và xuất đề thi PDF/XLSX (`/lecturer/reviews`, `/lecturer/exams`, `/lecturer/course-classes`).
- **Tin nhắn & Thông báo:** Nhắn tin trực tiếp 1-1 thời gian thực (WebSocket/STOMP), nhận thông báo tương tác và học thuật (`/chat`, `/notifications`).

## Hướng dẫn cài đặt & Khởi chạy

Yêu cầu môi trường: **Node.js 22.12+** và **npm**.

```sh
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Ứng dụng mặc định chạy tại `http://localhost:5173`. Cấu hình địa chỉ backend trong tệp `.env` (`VITE_API_BASE_URL`).

## Kiểm thử & Build

```sh
cd frontend
npm run typecheck    # Kiểm tra kiểu TypeScript
npm run build        # Build bản phát hành production
npm test             # Chạy toàn bộ test suite UI và API
npm run test:e2e     # Chạy Playwright E2E UI mock (desktop & mobile)
npm run test:api     # Chạy kiểm thử API thật (cần cấu hình credentials trong .env)
```

## Cấu trúc thư mục

```text
frontend/
  src/
    app/             # Khởi tạo App, router và AppShell
    components/      # UI components dùng chung (Modal, PageHeader, Avatar, Brand,...)
    features/        # Các module chức năng (academic, auth, chat, course-classes, feed, posts, profile,...)
    lib/             # Cấu hình Axios API client và tiện ích
  tests/             # Kiểm thử tự động E2E và API
docs/                # Tài liệu kỹ thuật, đặc tả OpenAPI và thiết kế hệ thống
```
