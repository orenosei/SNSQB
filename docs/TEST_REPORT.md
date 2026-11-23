# Báo cáo & Chiến lược Kiểm thử SNSQB

Tài liệu mô tả kiến trúc kiểm thử tự động, phạm vi bao phủ và hướng dẫn chạy kiểm thử cho dự án SNSQB.

## 1. Cấu trúc bộ kiểm thử (Playwright Test Suites)

Bộ kiểm thử của dự án được tổ chức tại `frontend/tests/` và chia thành 3 nhóm độc lập:

### A. Kiểm thử Giao diện (UI Mock Tests — `tests/e2e/`)
- **Mục tiêu:** Xác minh tính đúng đắn của toàn bộ luồng giao diện người dùng, điều hướng, form nhập liệu, trạng thái rỗng/lỗi và responsive.
- **Môi trường:** Chạy trên localhost với HTTP mock nội bộ (tự cô lập, không phụ thuộc backend thực).
- **Phạm vi kiểm thử:**
  - `auth.spec.ts`: Đăng nhập, xác thực biểu mẫu, ghi nhớ điều hướng và xử lý phiên hết hạn.
  - `navigation.spec.ts`: Điều hướng desktop sidebar và mobile dock, phân quyền sinh viên và giảng viên.
  - `social.spec.ts` & `publishing.spec.ts`: Bảng tin, phân trang cuộn, đăng bài viết kèm hình ảnh, bình luận, reaction.
  - `academic.spec.ts`: Soạn thảo và nộp bộ câu hỏi, làm bài luyện tập, giảng viên duyệt câu hỏi và tạo đề thi.
  - `phase4.spec.ts`: Lưu trữ bản nháp tin nhắn chat, nhận thông báo, quản lý danh sách thiết bị.
  - `client.spec.ts` & `improvements.spec.ts`: Khả năng phục hồi khi mất mạng, xử lý token refresh và accessibility.

### B. Kiểm thử Backend thật (Live API Tests — `tests/api/`)
- **Mục tiêu:** Xác thực tính tuân thủ hợp đồng API giữa frontend client và server thật (`https://snsqb.duckdns.org/api/v1`).
- **Môi trường:** Dự án `api-real`, tự động nạp thông tin đăng nhập từ tệp `frontend/.env` (biến `SNSQB_TEST_EMAIL`, `SNSQB_TEST_PASSWORD`).
- **Phạm vi:**
  - `auth.spec.ts`: Kiểm tra API đăng nhập, cấp JWT và đăng xuất.
  - `read-only.spec.ts`: Kiểm tra các endpoint đọc dữ liệu an toàn (hồ sơ, bảng tin, môn học, lớp học phần).
  - `academic.spec.ts`: Kiểm tra luồng gửi đề xuất và duyệt câu hỏi với tài khoản test.
  - `social.spec.ts` & `phase4.spec.ts`: Kiểm tra tạo/xóa bài viết test, tìm kiếm và thông báo.

### C. Kiểm thử Thời gian thực (Realtime Tests — `tests/realtime/`)
- **Mục tiêu:** Kiểm tra kết nối WebSocket/STOMP phục vụ tính năng nhắn tin trực tiếp.
- **Yêu cầu:** Chạy trên môi trường có origin được backend cấu hình cho phép CORS.

---

## 2. Hướng dẫn chạy kiểm thử

Tất cả lệnh chạy từ thư mục `frontend/`:

```sh
# Cài đặt trình duyệt Playwright (lần đầu)
npx playwright install chromium

# 1. Kiểm tra toàn bộ kiểu TypeScript
npm run typecheck

# 2. Chạy toàn bộ UI Mock test (Desktop & Mobile)
npm run test:e2e

# 3. Chạy kiểm thử API thật (cần cấu hình .env)
npm run test:api

# 4. Chạy kiểm thử STOMP Realtime
npx playwright test --project=realtime
```

---

## 3. Nguyên tắc an toàn dữ liệu khi kiểm thử

1. **Không lưu trữ Credentials:** Tuyệt đối không commit email, mật khẩu hay JWT token vào mã nguồn hoặc Git repository.
2. **Dọn dẹp dữ liệu:** Các bài test ghi dữ liệu (tạo bài viết, bộ câu hỏi test) đều có bước dọn dẹp (cleanup/delete) ngay sau khi test hoàn tất.
3. **Không gọi Admin API:** Bộ kiểm thử tuân thủ tuyệt đối quy định không gọi đến bất kỳ endpoint quản trị viên nào (`/admin/**`).
