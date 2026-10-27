# SNSQB

Social Network for Student-Generated Question Bank — frontend tiếng Việt cho cộng đồng học tập sinh viên.

## Trạng thái Phase 1–2

Đã có ứng dụng trong `frontend/`: React + TypeScript + Vite, Tailwind CSS, React Router, Axios, TanStack Query và Lucide React. Giao diện gồm đăng nhập, header/sidebar responsive, hồ sơ và chỉnh sửa hồ sơ. Phase 2 bổ sung bảng tin phân trang, CRUD bài viết kèm media, bình luận/phản hồi, LIKE/LOVE/WOW, hồ sơ công khai, kết bạn/theo dõi/chặn và tìm kiếm USER/POST. Ngân hàng câu hỏi, Tin nhắn và Đề thi vẫn là “Sắp có”.

Swagger tại [docs/source/openapi.json](docs/source/openapi.json) là nguồn chính; PDF chỉ là tham khảo phụ. Không sửa backend/Swagger, không gọi API Admin, không có đăng ký hoặc reset mật khẩu tự phục vụ.

## Chạy ứng dụng

Yêu cầu **Node.js 22.12+** (đã kiểm chứng với Node 24.0.2), npm.

```sh
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Mở URL Vite in trong terminal (mặc định `http://localhost:5173`). Biến `VITE_API_BASE_URL` trong `.env` mặc định là `https://snsqb.duckdns.org/api/v1`; khởi động lại Vite sau khi đổi cấu hình. Đây là URL công khai, không đặt credentials trong biến `VITE_*`.

Dùng tài khoản được cấp để đăng nhập. Token chỉ nằm trong bộ nhớ, **tải lại trang hoặc đóng tab cần đăng nhập lại**. Chỉ định danh thiết bị ngẫu nhiên được lưu trong localStorage. Refresh chạy một lần khi nhận 401 nếu server cấp refresh token, dùng chung cho request đồng thời; 403 không kích hoạt refresh. Nếu refresh token là null hoặc không được cấp, access token vẫn dùng được; khi nhận 401, ứng dụng yêu cầu đăng nhập lại và không gọi refresh. Đăng xuất xóa token/cache kể cả khi mạng lỗi và thông báo rõ nếu chưa xác nhận được việc thu hồi phiên trên server.

Routes hiện có: `/login`, `/me`, `/settings/profile`, `/` (bảng tin), `/posts/new`, `/posts/:postId`, `/posts/:postId/edit`, `/my-posts`, `/users/:userId`, `/friends`, `/search`. Hồ sơ và chỉnh sửa được bảo vệ. Khi triển khai static hosting, cấu hình fallback về `index.html` cho React Router; backend cần cho phép CORS của frontend.

## API đã nối trong code (35 operations)

| Method | Path | Chức năng |
|---|---|---|
| POST | `/auth/login` | Gửi email, password, device_id, platform WEB |
| POST | `/auth/refresh` | Đổi cặp token bằng refresh_token |
| POST | `/auth/logout` | Đăng xuất, không gửi body |
| GET | `/users/me` | Đọc hồ sơ hiện tại |
| PUT | `/users/me` | Sửa các trường hồ sơ được Swagger hỗ trợ |

Phase 2 dùng GET `/activity-feeds`; POST `/posts`, GET/PUT/DELETE `/posts/{id}`, GET `/posts/me` và `/users/{userId}/posts`; GET/POST `/comments`, PUT/DELETE `/comments/{commentId}`; POST `/react`; GET public profile/relationship-stats; 7 friendship operations; follow/unfollow/following/followers; block/unblock/list; GET `/search`; POST `/medias/upload` multipart (purpose POST/COMMENT). Từng operation và trạng thái ở [API_CHECKLIST](docs/API_CHECKLIST.md).

Các form social tuân schema, không tự áp giới hạn 500 từ hoặc giới hạn upload chưa có trong Swagger. Cache được làm mới sau mutation; block/unblock reset nội dung có thể mất quyền xem. Không suy đoán loại cảm xúc cũ hoặc chiều lời mời từ field không đủ thông tin.

Axios kiểm danh sách method/path trước transport, không gửi JWT tới URL ngoài. DTO/envelope theo Swagger; chấp nhận `code: "0000"` theo đặc tả và `"1000"` theo phản hồi login thực do người dùng cung cấp. Phản hồi thực cũng có `refresh_token: null`, nên frontend chỉ bắt buộc access token hợp lệ. Swagger/backend được giữ nguyên. Form sửa họ tên, tiểu sử, giới tính, ngày sinh, múi giờ, URL avatar/ảnh bìa; chỉ gửi trường thay đổi. Thông tin học tập chỉ đọc. Upload trực tiếp hiện dùng cho bài viết/bình luận; form hồ sơ vẫn dùng URL ảnh có sẵn.

**Chưa tự chạy kiểm thử backend thật** vì chưa có tài khoản test chuyên dụng; đã đối chiếu phản hồi login thành công do người dùng cung cấp (không lưu credentials/token vào repo). Mock UI chỉ kiểm frontend, không chứng minh backend hoạt động.

## Kiểm thử

```sh
cd frontend
npx playwright install chromium
npm run typecheck
npm run build
npm test          # UI desktop + mobile và API thật (mặc định skip)
npm run test:e2e  # Chỉ UI mock
npm run test:api  # Chỉ API thật, không cần browser/dev server
```

Kết quả ngày 2026-10-27: typecheck/build PASS; **88 lượt UI PASS, 16 bài API thật SKIPPED**. UI mock kiểm validation, payload/header, login thành công/thất bại (bao gồm code 1000, refresh token null/không được cấp), loading/lỗi mạng, route guard, refresh đồng thời/không lặp, logout, sửa hồ sơ/giữ bản nháp khi lỗi và responsive 320/375/768/1280/1536 px. Phase 2 có 15 case UI (30 lượt trên desktop/mobile) bao phủ post/comment/reaction lifecycle, hai phiên kết bạn, follow/block/search và responsive 320/768/1280 px. Đã xem ảnh chụp login/profile/feed trên desktop và mobile. Chi tiết ở [TEST_REPORT](docs/TEST_REPORT.md). Báo cáo HTML và ảnh/trace nằm trong `frontend/playwright-report/`, `frontend/test-results/` (không commit).

`tests/e2e/` chặn request API bằng mock và dùng base URL localhost riêng. `tests/api/` chỉ chạy thật khi export đủ ba biến sau bằng tài khoản test chuyên dụng:

```sh
export SNSQB_RUN_REAL_API=1
export SNSQB_TEST_EMAIL='email-tai-khoan-test'
# Đặt SNSQB_TEST_PASSWORD qua environment riêng, không commit hoặc ghi vào VITE_*.
npm run test:api
```

Playwright không tự đọc `.env`; credentials lấy từ environment của tiến trình. Có thể đổi server test bằng `SNSQB_TEST_API_BASE_URL`. Auth test thật kiểm login/profile/logout, refresh khi được cấp token và sai mật khẩu; không gọi Admin, không sửa hồ sơ hoặc dữ liệu dùng chung. PUT hồ sơ hiện chỉ có kiểm thử UI mock. Không đưa tài khoản người dùng thật vào bộ test; reporter/trace API được hạn chế để tránh ghi token.

API social được bật **riêng** với cặp tài khoản test cùng vai trò, không có quan hệ từ trước:

```sh
export SNSQB_RUN_REAL_SOCIAL=1
export SNSQB_TEST_EMAIL='tai-khoan-test-A'
export SNSQB_TEST_PEER_EMAIL='tai-khoan-test-B'
# Đặt SNSQB_TEST_PASSWORD và SNSQB_TEST_PEER_PASSWORD qua environment riêng.
npm run test:api
```

Suite kiểm baseline rồi chỉ tạo/xóa post/comment của run và quan hệ giữa A/B, cleanup ở finally/teardown. Không bật bằng tài khoản cá nhân. Không bật SNSQB_RUN_REAL_API nếu chỉ muốn chạy social. Chưa có cặp test chuyên dụng nên 14 social API scenarios đang skip. Upload media rời không có API xóa; hủy soạn sau upload có thể để lại tệp. GET post không cung cấp loại reaction cũ; PENDING không cho biết chiều lời mời ở profile. Đây là giới hạn contract, không tạo API thay thế.

## Cấu trúc và bước tiếp theo

```text
frontend/
  src/
    app/          # Router và application shell
    components/   # Brand, avatar, feedback
    features/     # auth, profile
    lib/          # Axios client và xử lý lỗi
  tests/
    e2e/          # UI mock
    api/          # Backend thật, cần tài khoản test
```

Phase 2 core social đã triển khai. Phase 3 còn danh mục môn/lớp học, đề xuất và duyệt câu hỏi, luyện tập, tạo/xuất đề theo [docs/PLAN.md](docs/PLAN.md); chưa bắt đầu tự động. Notifications, danh mục video bài giảng và search history chưa thuộc đợt Phase 2 này. CSV/Swagger/PDF Phase 0 được giữ nguyên.

Kiểm tra inventory offline khi cần: `python3 docs/analysis/generate-api-audit.py --check`.
