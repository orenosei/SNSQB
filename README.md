# SNSQB

Social Network for Student-Generated Question Bank — frontend tiếng Việt cho cộng đồng học tập sinh viên.

## Trạng thái Phase 1–3

Đã có ứng dụng trong `frontend/`: React + TypeScript + Vite, Tailwind CSS, React Router, Axios, TanStack Query và Lucide React. Giao diện gồm đăng nhập, header/sidebar responsive, hồ sơ và chỉnh sửa hồ sơ. Phase 2 bổ sung bảng tin phân trang, CRUD bài viết kèm media, bình luận/phản hồi, LIKE/LOVE/WOW, hồ sơ công khai, kết bạn/theo dõi/chặn và tìm kiếm USER/POST. Phase 3 có ngân hàng QUESTION/SESSION, bộ câu hỏi của tôi, luyện tập, đánh giá và duyệt/tạo/xuất đề cho giảng viên. Tin nhắn vẫn là “Sắp có”; Đề thi chỉ mở cho vai trò LECTURER.

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

Routes hiện có: `/login`, `/me`, `/settings/profile`, `/` (bảng tin), `/posts/new`, `/posts/:postId`, `/posts/:postId/edit`, `/my-posts`, `/users/:userId`, `/friends`, `/search`, `/question-bank`, `/submissions[/new|/:sessionId|/:sessionId/edit]`, `/practice/:sessionId`, `/lecturer/reviews[/:sessionId]`, `/lecturer/exams[/new|/:examId]`. Hồ sơ và chỉnh sửa được bảo vệ. Khi triển khai static hosting, cấu hình fallback về `index.html` cho React Router; backend cần cho phép CORS của frontend.

## API đã nối trong code (59 operations)

| Method | Path | Chức năng |
|---|---|---|
| POST | `/auth/login` | Gửi email, password, device_id, platform WEB |
| POST | `/auth/refresh` | Đổi cặp token bằng refresh_token |
| POST | `/auth/logout` | Đăng xuất, không gửi body |
| GET | `/users/me` | Đọc hồ sơ hiện tại |
| PUT | `/users/me` | Sửa các trường hồ sơ được Swagger hỗ trợ |

Phase 2 dùng GET `/activity-feeds`; POST `/posts`, GET/PUT/DELETE `/posts/{id}`, GET `/posts/me` và `/users/{userId}/posts`; GET/POST `/comments`, PUT/DELETE `/comments/{commentId}`; POST `/react`; GET public profile/relationship-stats; 7 friendship operations; follow/unfollow/following/followers; block/unblock/list; GET `/search`; POST `/medias/upload` multipart (purpose POST/COMMENT). Từng operation và trạng thái ở [API_CHECKLIST](docs/API_CHECKLIST.md).

Phase 3 thêm 24 operations: subjects/enrolled course classes; propose/list/detail/update/delete bộ câu hỏi; session/questions; answer/rate/statistics/ratings; pending/open review, approve/reject/complete-review và lecturer question edit; my-classes; generate/list/detail/export đề, xuất ngân hàng môn. Dùng lại GET `/search` với QUESTION/SESSION và upload multipart purpose QUESTION. Không có API GET question đơn, xóa câu lẻ, CRUD topic, lịch sử practice tổng hợp hoặc chấm cả đề; UI chỉ làm các luồng được hỗ trợ.

Swagger đã đồng bộ từ backend ngày 2026-10-28: đề xuất dùng lớp học phần (`course_class_id`) thay cho môn. Form lấy lớp hiện tại/lịch sử qua `/sessions/my-enrolled-course-classes`, chỉ cho gửi mới vào lớp có `can_propose=true`; lỗi tải lớp giữ bản soạn và cho thử lại. Danh mục môn không thay thế quyền đề xuất. Chi tiết thay đổi ở [API_CHECKLIST](docs/API_CHECKLIST.md).

Sinh viên tạo bộ ở **Bộ câu hỏi của tôi → Tạo bộ câu hỏi**, chọn lớp được phép đề xuất trong học kỳ hiện tại, nhập phương án và đánh dấu đáp án đúng. Chỉ bộ còn PENDING được sửa/xóa. Mở bộ từ ngân hàng để luyện tập; có thể chọn nhiều phương án, kết quả do server chấm. Một câu chỉ gửi một lần; 409/412/mất mạng yêu cầu tải lại, không tự nộp lại. Trạng thái answered của lượt cũ không cung cấp lựa chọn/đúng-sai cũ nên UI không bịa điểm hoặc lịch sử.

Giảng viên có **Duyệt câu hỏi** và **Đề thi**. Mở phiên duyệt là thao tác có side effect REVIEWING, phải bấm mở; chốt hoàn tất sẽ tự từ chối các câu PENDING còn lại. Tạo đề cần lớp đang phụ trách thuộc môn đã chọn; export trả link PDF/XLSX, không gửi JWT sang URL tải. Chưa có thi/nộp/chấm nguyên đề. Nội dung hiện hiển thị text an toàn và ảnh, chưa render nâng cao Markdown/LaTeX.

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
npx playwright test --project=realtime # STOMP thật, cần origin được backend cho phép CORS
```

Kết quả Phase 4 ngày 2026-10-28: typecheck/build PASS; 6 lượt E2E UI mới PASS trên desktop/mobile (chat, direct conversation, notification read và navigation). API thật có 4 PASS, 0 FAIL, 4 SKIPPED cho Phase 4; kết quả tích lũy là 78 PASS, 0 FAIL, 26 SKIPPED. Chi tiết ở [TEST_REPORT](docs/TEST_REPORT.md). Báo cáo HTML và ảnh/trace nằm trong `frontend/playwright-report/`, `frontend/test-results/` (không commit).

`tests/e2e/` dùng mock trên localhost. `npm run test:api` chạy backend thật và tự nạp `frontend/.env` chỉ cho project `api-real`; `npm test` chạy UI mock mà không tự nạp credential thật. Đặt `SNSQB_TEST_EMAIL`, `SNSQB_TEST_PASSWORD`, và tùy chọn `SNSQB_TEST_API_BASE_URL` trong `frontend/.env` (file đã được gitignore). Không đưa credentials vào `VITE_*`, mã nguồn hoặc output test.

Bộ API dùng JWT từ login, tự tìm lớp hiện tại `can_propose=true` cho đề xuất, và tạo/xóa dữ liệu sở hữu khi có API dọn. Peer/giảng viên/approved question chỉ cần cho case tương ứng; tên biến tùy chọn ở [`.env.example`](frontend/.env.example). Media, answer/rating và đề thi có thể không có API reset/delete. Không gọi Admin.

Kiểm thử thật ngày 2026-10-28: **58/124 operations non-Admin (46,8%)** đã gọi; 104 case gồm **78 PASS, 0 FAIL, 26 SKIPPED**. 54 operation có response thành công đúng Swagger, 4 operation chỉ kiểm quyền 401/403; mock UI được báo riêng ở [TEST_REPORT](docs/TEST_REPORT.md).

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

Phase 4 đã triển khai chat 1-1, notifications, video feed, saved search, báo cáo và đổi mật khẩu. STOMP browser cần frontend chạy từ origin được backend cấp CORS; hiện Vite localhost bị chặn. Group chat, gamification và các module còn lại chưa bắt đầu. CSV thiết kế và PDF Phase 0 được giữ nguyên; Swagger và inventory đã đồng bộ online.

Kiểm tra inventory offline khi cần: `python3 docs/analysis/generate-api-audit.py --check`.
