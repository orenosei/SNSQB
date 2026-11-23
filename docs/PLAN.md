# Kế hoạch & Kiến trúc SNSQB

Tài liệu kế hoạch phát triển, tiến độ các giai đoạn và kiến trúc kỹ thuật của hệ thống SNSQB.

## 1. Tiến độ các giai đoạn (Phases)

- [x] **Phase 0 — Khảo sát & Chuẩn hóa hợp đồng API:**
  - Lấy Swagger OpenAPI 3.1 (`docs/source/openapi.json`) làm chuẩn duy nhất.
  - Phân loại 146 operations: 124 non-Admin được phép và 22 Admin bị loại trừ.
  - Xây dựng công cụ kiểm toán API tự động (`docs/analysis/generate-api-audit.py`).
- [x] **Phase 1 — Nền tảng & Xác thực (Auth):**
  - Khởi tạo kiến trúc React 19 + TypeScript + Vite, Tailwind CSS, TanStack Query, Axios.
  - Đăng nhập, đổi mật khẩu, đăng xuất, tự động refresh token trong bộ nhớ, route guards.
- [x] **Phase 2 — Mạng xã hội học tập (Core Social):**
  - Bảng tin phân trang theo con trỏ (cursor pagination).
  - CRUD bài viết kèm hình ảnh/video multipart upload, bình luận phân cấp, biểu cảm (LIKE/LOVE/WOW).
  - Hồ sơ cá nhân/công khai, quan hệ bạn bè, theo dõi và danh sách chặn.
  - Tìm kiếm người dùng và bài viết.
- [x] **Phase 3 — Ngân hàng câu hỏi & Luyện tập (Academic):**
  - Đồng bộ logic theo lớp học phần (`course_class_id`) và học kỳ hiện tại (`can_propose=true`).
  - Đóng góp bộ câu hỏi trắc nghiệm (Submission sessions), thẩm định và duyệt đề xuất (Lecturer review).
  - Luyện tập trực tuyến, chấm điểm từ server, đánh giá và thống kê câu hỏi.
  - Quản lý và xuất đề thi PDF/XLSX cho giảng viên.
- [x] **Phase 4 — Realtime & Mở rộng:**
  - Nhắn tin trực tiếp 1-1 qua STOMP/WebSocket với lưu trữ draft và đồng bộ lịch sử.
  - Hệ thống thông báo học thuật và tương tác xã hội.
  - Quản trị danh sách thiết bị đăng nhập và thu hồi phiên.
  - Quản lý danh sách lớp học phần và ghi danh sinh viên cho giảng viên.
- [x] **UI Redesign — Không gian học tập chuẩn mực:**
  - Áp dụng hệ thống Design System mới: Forest `#244d43`, Paper `#f8f6ef`, Ink `#202d29`.
  - Font chữ Montserrat Variable, responsive tối ưu trên cả Desktop và Mobile dock.
  - Hiệu ứng chuyển động nhẹ nhàng với Motion (`motion/mini`).

---

## 2. Nguyên tắc kiến trúc kỹ thuật

1. **Hợp đồng API (Contract Source of Truth):**
   - Swagger tại `docs/source/openapi.json` là chuẩn duy nhất.
   - Không tự ý bịa thêm endpoint, không gọi API `/admin/**`.
   - DTO giữ nguyên định dạng `snake_case` theo đúng đặc tả của backend.

2. **Quản lý phiên & Bảo mật:**
   - Token chỉ lưu trữ trong bộ nhớ (In-memory storage) để chống XSS; tải lại trang hoặc đóng tab yêu cầu đăng nhập lại.
   - Cơ chế Single-flight refresh: khi nhận HTTP 401, chỉ thực hiện duy nhất 1 request refresh token dùng chung cho các request đồng thời.
   - Xử lý CORS trong môi trường production thông qua reverse proxy Vercel (`vercel.json` và `api/proxy.js`).

3. **Giao diện & Trải nghiệm (UI/UX):**
   - Không gian học tập lấy cảm hứng từ trang sổ tay sinh viên: nền giấy ấm, xanh đậm nhận diện, viền phân cách mỏng nhẹ.
   - Tiếp cận Mobile-first: Sidebar trên desktop chuyển đổi thành Mobile Dock và modal điều hướng tự nhiên trên thiết bị di động.
   - Hỗ trợ đầy đủ `prefers-reduced-motion` và khả năng điều hướng bàn phím (Keyboard accessibility).

---

## 3. Bản đồ Route chính thức

| Nhóm chức năng | Routes trong ứng dụng |
|---|---|
| **Xác thực & Tài khoản** | `/login`, `/me`, `/settings/profile`, `/settings/devices`, `/settings/password`, `/settings/notifications` |
| **Cộng đồng & Xã hội** | `/` (bảng tin), `/posts/new`, `/posts/:postId`, `/posts/:postId/edit`, `/my-posts`, `/users/:userId`, `/friends`, `/search`, `/videos` |
| **Ngân hàng đề & Học tập** | `/question-bank`, `/submissions`, `/submissions/new`, `/submissions/:sessionId`, `/submissions/:sessionId/edit`, `/practice/:sessionId` |
| **Giảng viên** | `/lecturer/reviews`, `/lecturer/reviews/:sessionId`, `/lecturer/exams`, `/lecturer/exams/new`, `/lecturer/exams/:examId`, `/lecturer/course-classes`, `/lecturer/course-classes/:courseClassId` |
| **Thời gian thực** | `/chat` (tin nhắn 1-1), `/notifications` |
