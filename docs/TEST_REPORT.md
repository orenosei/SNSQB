# Test report

Cập nhật 2026-10-28 — Phase 1–4 (auth, social, Question Bank, chat và notifications). Swagger online và local có cùng contract; không gọi Admin APIs.

## Lần chạy gần nhất

Môi trường: Node 24.0.2, macOS arm64, Chromium Playwright; hai project UI desktop và Pixel 7. UI chạy với Vite localhost và HTTP mock riêng; không gọi server thật. Credentials cá nhân trong hội thoại không được đưa vào code/test.

| Lệnh tại frontend/ | Kết quả |
|---|---|
| `npm run typecheck` (được gọi trong build) | PASS |
| `npm run build` | PASS, tạo dist/ |
| `npm test` | **152 PASS, 0 FAIL, 34 SKIPPED**, 1,6 phút |
| `python3 docs/analysis/generate-api-audit.py --check` (tại repo root) | CHECK_OK: 146 operations, 124 non-Admin, 22 excluded |

**152 UI lượt = 76 case × 2 viewport projects**: 44 case Phase 1–2, 31 case học thuật mới và 1 case response phiên cũ. **34 API case skipped = 2 auth + 14 social + 18 academic**, đó là kết quả full suite UI ở lần trước khi thêm bài API 401. 59/124 operations đã nối trong code; kết quả API mới ghi riêng bên dưới. Không quy đổi mock/inventory thành live API coverage; không bật đo code coverage.

Report HTML: `frontend/playwright-report/index.html`; ảnh/trace: `frontend/test-results/` (đều được gitignore). Ảnh feed, ngân hàng và kết quả luyện tập desktop/mobile đã được xem. Không dùng snapshot ảnh chứa dữ liệu người dùng thật.

## API thật — 2026-10-28

Playwright `api-real` tự nạp `frontend/.env` khi chạy riêng project này. JWT lấy từ `POST /auth/login` và gắn vào các request tiếp theo; mỗi suite logout phiên test. Credential/JWT không in trong output. UI mock không được tính vào số dưới đây.

**124 operations non-Admin đủ điều kiện. 58 operation riêng biệt đã gọi thật = 46,8% coverage theo HTTP method + path.** Trong đó 54 có response thành công đúng Swagger (53 với JWT, cộng POST login); 3 GET chỉ kiểm 401 không JWT và 1 PUT chỉ kiểm 403 của STUDENT. Không tính các operation mới chỉ có test viết sẵn.

104 API cases: **78 PASS, 0 FAIL, 26 SKIPPED**. Phase 4 chạy 4 PASS/4 SKIPPED: đọc notifications/video/search settings, tạo rồi xóa search history, và SockJS metadata đều PASS. Chat history cần hội thoại có sẵn; direct chat cần peer; read notification cần fixture thông báo. Typecheck và production build PASS. POST /auth/refresh chưa chạy vì server cấp `refresh_token: null`.

| Method / kết quả | Endpoint đã gọi thật |
|---|---|
| GET 200 với JWT (38) | `/users/me`, `/subjects`, `/sessions/my-enrolled-course-classes`, `/sessions/my-submissions`, `/sessions/my-submissions/{sessionId}`, `/activity-feeds`, `/activity-feeds/new-count`, `/posts/me`, `/posts/{id}`, `/friendships`, `/friendships/requests/received`, `/friendships/requests/sent`, `/follows/following`, `/follows/followers`, `/blocks`, `/search`, `/search/saved`, `/notifications`, `/video-posts`, `/settings/push`, `/devices`, `/badges`, `/badges/me`, `/badges/{badgeId}`, `/badges/users/{userId}`, `/cosmetics/shop`, `/cosmetics/my-inventory`, `/games/check-in`, `/games/leaderboard`, `/games/my-predictions`, `/games/prediction/game-1/classes`, `/conversations`, `/conversations/hidden`, `/users/{userId}`, `/users/{userId}/posts`, `/users/{userId}/sessions`, `/users/{userId}/relationship-stats`, `/comments` |
| GET 401 không JWT, chưa có 200 (3) | `/lecturer/course-classes`, `/lecturer/course-classes/my-classes`, `/lecturer/course-classes/lecturers` |
| POST thành công (9) | `/auth/login` (200; không cần JWT; cả 400 sai mật khẩu), `/auth/logout`, `/posts`, `/comments`, `/react`, `/sessions/propose` (201), `/medias/upload`, `/medias/presign`, `/medias/verify` |
| PUT 200 với JWT (3) | `/posts/{id}`, `/comments/{commentId}`, `/sessions/my-submissions/{sessionId}` |
| PUT 403 với STUDENT, chưa có 200 (1) | `/questions/{questionId}` |
| DELETE 200 với JWT (4) | `/posts/{id}`, `/comments/{commentId}`, `/sessions/my-submissions/{sessionId}`, `/search/saved/{id}` |
| PATCH | Chưa có fixture hội thoại mới để thử hide/unhide; không sửa hội thoại có sẵn. |

26 SKIPPED đúng điều kiện: 8 case cần tài khoản thứ hai/quan hệ, 5 case cần giảng viên/lớp môn, 5 case cần approved session và question chưa trả lời/đánh giá, 3 case không tìm thấy question/session phù hợp, 3 case không có conversation hoặc message, 2 case không được thay đổi notification có sẵn. Nội dung ghi chỉ là post, comment, bộ câu hỏi, search record và media do test tạo; post/comment/bộ PENDING/search record được cleanup. Presign không upload tệp; ảnh multipart được gắn vào post test rồi xóa post, nhưng Swagger không có API xóa media rời. Không sửa/xóa dữ liệu có sẵn của người khác, không gọi Admin.

## Phase 4

- Chat 1-1 có danh sách hội thoại, đọc lịch sử REST, tạo direct conversation, gửi/đọc/typing qua STOMP, reconnect của client và thu hồi tin nhắn do chính người dùng gửi. Chat group không triển khai.
- Notifications có danh sách, badge, đọc một/tất cả và trang cài đặt push. Video feed, lịch sử/từ khóa trending search, đổi mật khẩu và báo cáo nội dung có UI theo Swagger.
- `GET /api/v1/ws/info` trả 200 từ backend thật. Frontend dùng SockJS `/api/v1/ws` với STOMP CONNECT header `Authorization`, subscribe `/user/queue/messages` và `/topic/conv.{id}.typing`, publish `/app/chat.send`, `/app/chat.read`, `/app/chat.typing`.
- E2E STOMP từ Vite local SKIPPED: backend từ chối CORS cho `/auth/login` từ `http://127.0.0.1:4173`, nên không thể lấy phiên browser để xác minh broker mà không bypass CORS. Cần chạy frontend trên origin được backend cho phép; gửi/nhận giữa hai account cũng cần `SNSQB_TEST_PEER_EMAIL/PASSWORD`.

## UI đã kiểm

- Login tiếng Việt, validation, pending/duplicate submit, login lỗi/thành công, code 0000/1000, refresh token null/thiếu, JWT header, token chỉ trong memory, route guard, logout/mất mạng, refresh single-flight/không lặp/không hồi sinh phiên cũ.
- Hồ sơ và chỉnh sửa, giới hạn schema, múi giờ, draft khi lỗi, dữ liệu optional và module chưa khả dụng.
- Feed resolve POST bằng API chi tiết, after cursor, empty/error; không giả định cấu trúc ActivityFeedItemDto.content.
- Tạo → sửa → xóa post; visibility và dialog xác nhận/hủy; response PUT chỉ chứa post_id/updated_at vẫn được xử lý đúng bằng refetch.
- Upload multipart đúng boundary/purpose, MediaItem không có field tự tạo; validation trước khi đăng.
- Thêm comment/reply, sửa/xóa comment của mình; không hiện owner controls cho người khác; giữ draft khi POST lỗi và không tự retry mutation.
- LIKE → LOVE → gỡ LOVE, counts theo response; không suy loại reaction cũ từ reacted_by_me.
- Gửi/chấp nhận lời mời với **hai browser contexts** dùng chung mock backend riêng; hủy kết bạn, từ chối lời mời và danh sách đã gửi. Chặn kết bạn khác vai trò ở UI.
- Follow/unfollow; block/unblock có xác nhận và xóa cache nội dung bị thu hồi quyền, không tự khôi phục quan hệ cũ.
- Search USER/POST, offset pagination, empty/error; không dùng filter chưa được Swagger mô tả.
- Responsive 320/768/1280 px trên feed, chi tiết post, friends, search, public profile, create post; hồi quy profile ở 320/375/768/1280/1536 px. Menu mobile/Escape và không tràn ngang.

Đã sửa các lỗi phát hiện khi phát triển Phase 1–2: input file ẩn bị quy tắc input width:100% làm tràn trang; test pending cần chờ HTTP handler; test điều hướng phải giữ phiên memory qua SPA. Lần chạy cuối không có lỗi hoặc retry test tự động.

## Phase 3 đã kiểm bằng UI mock

- Search QUESTION/SESSION, cursor offset; xem question/options từ SearchResultItemDto mà không tạo GET question đơn; danh mục môn và bộ của tôi dùng contents, filter subject_id/status.
- Create HTTP 201 → owner detail → update → delete bộ PENDING có xác nhận. Payload create dùng llm_generated; update giữ question_id, dùng source, không ghi đè source_url chưa đọc được. Ảnh là URL array, upload purpose QUESTION, khóa gửi trong lúc upload.
- Validation nội dung/phương án/đáp án/keys/confidence; draft giữ khi server reject; guard bộ processed/non-owner trước update.
- Practice một/nhiều đáp án; ẩn lời giải trước trả lời, gửi question_updated_at, hiển thị is_correct/correct_answer/explanation từ server, progress theo answered. Lượt cũ không có selection/result thì hiện thiếu thông tin, không suy điểm.
- 409 không resubmit; 412 bắt reload và chọn lại, gửi timestamp mới. Review đáp án trong phiên hiện tại; ratings 0–4, báo lỗi, statistics/ratings và kết quả rating từ server.
- Guard student trên bốn route giảng viên trước transport. GET review chỉ sau nút mở, đúng một lần; approve/reject/complete không tự mở lại; warning duplicate dùng matched_snipet đúng tên field. Chốt duyệt có xác nhận rõ tự REJECTED các câu PENDING.
- Lecturer edit không tự approve mặc định; đổi target review reset nội dung/selection và yêu cầu mở lại. Tạo đề theo subject/class, kiểm tổng difficulty ratios, topic weights tùy chọn; xem đề, export PDF/XLSX và ngân hàng môn từ download_url.
- Responsive 320/375/768/1280 trên bank/editor/practice/review/create-exam/detail-exam; hồi quy Phase 1–2 vẫn qua. Module học thuật lazy-load, initial JS ~446 kB (gzip ~141 kB), không còn cảnh báo chunk >500 kB.
- Bắt và sửa lỗi dropdown thiếu nhãn rõ, đổi tab làm mất draft tìm kiếm, menu mobile dài đẩy logout ra ngoài viewport; ConfirmDialog dùng type=button để không submit form ngoài ý muốn. Response thành công của phiên cũ bị chặn trước cache để tránh lẫn dữ liệu khi đổi tài khoản.

Lần full suite cuối: 152/152 UI PASS, không retry tự động. Test cập nhật theo Swagger mới: payload tạo/sửa course_class_id, hai lớp cùng môn không bị gộp, hiển thị lớp/học kỳ/status, khóa lớp lịch sử/can_propose=false/thiếu flag, chặn chọn lớp không hợp lệ dù sửa DOM, giữ lớp cũ khi sửa nội dung và lookup lỗi, không cấp quyền sửa/xóa khi detail thiếu status, chặn endpoint đã bị xóa trước transport. Lần chạy ban đầu có 2 lỗi assertion trên option disabled; đã sửa sang kiểm DOM property và kiểm hành vi submit, lần full cuối không lỗi. Sau full suite chỉ làm rõ nhãn placeholder ở form sửa, kiểm lại 4 lượt tạo/sửa và build.

Đồng bộ Swagger: JSON/OpenAPI 3.1, operationId duy nhất và refs nội bộ đã kiểm; snapshot local bằng nội dung online. Đã đối chiếu chính xác tên field/required của 6 DTO mới/bị đổi và kiểm checklist khớp 124 operations non-Admin; generator inventory `--check` PASS. Chỉ tải tài liệu online, không gọi API nghiệp vụ thật.

## Giới hạn backend/contract chưa thể xác minh đầy đủ

- Trước đồng bộ, người dùng báo `/sessions/my-enrolled-subjects` HTTP 500. Swagger mới đã bỏ endpoint này, frontend chuyển sang `/sessions/my-enrolled-course-classes` và bỏ fallback danh mục môn. Chưa gọi API lớp học phần bằng tài khoản cá nhân; chưa có log để kết luận nguyên nhân 500 cũ hay xác nhận backend mới chạy đúng.
- Người dùng cung cấp login HTTP 200 với code 1000, refresh_token null, khác ví dụ Swagger 0000; frontend đã hỗ trợ cả hai. Đây là bằng chứng do người dùng cung cấp, không phải kết quả suite API.
- GET post chỉ có reacted_by_me, không có my_reaction/reaction_counts; UI chỉ biết loại sau POST /react, không giả LIKE hoặc breakdown.
- Activity feed content là object không định nghĩa field; cần GET /posts/{id} cho từng post. Quyền riêng tư/chặn/404 được hiển thị theo server.
- PENDING không chỉ rõ chiều ở profile/stats; UI chuyển tới received/sent. Không có API hủy lời mời đã gửi.
- Upload trực tiếp không có giới hạn file size trong schema và không có API xóa media rời. UI xử lý 413 theo server. Hủy soạn bài sau upload hoặc post create lỗi có thể để lại tệp; không gọi endpoint tự tạo để dọn. Test media ghi annotation nếu upload xong nhưng chưa tạo được post để cleanup.
- CORS, phân trang/visibility/authorization thực tế và cleanup trên server còn chờ dedicated accounts. Chưa kết luận lỗi runtime backend từ mock.

- Không có practice start/end/history/score tổng hợp hoặc submit/chấm cả exam. Tiến độ answered chỉ là trạng thái mỗi câu; lịch sử chọn đáp án/đúng-sai cũ không có trong MyInteractionDto. Không tính authoritative score trên client.
- Question CRUD cho sinh viên đi qua session đề xuất. Không có GET/DELETE question đơn hoặc quy tắc xóa câu lẻ khi update; không tự bỏ câu đã gửi để giả xóa. Không có CRUD topic/taxonomy; search chỉ query/type/after/limit, subject/status filter chỉ dùng đúng list API hỗ trợ.
- MySubmissionDetailResponse đã có status: UI kiểm PENDING trực tiếp trên owner detail và chặn sửa/xóa khi status thiếu; không dò toàn bộ danh sách. source_url vẫn không có: giữ nguyên nếu người dùng không nhập thay đổi. Session RESOLVED không đồng nghĩa tất cả câu APPROVED.
- GET review có side effect REVIEWING; processed session, answers/ratings và exam không có general cleanup/reset. Real integration/authorization còn chờ fixture riêng; test code được viết không chứng minh backend đã pass.
- Nội dung hiện render text an toàn/ảnh; chưa có Markdown/LaTeX renderer nâng cao.

Các CSV testcase/reference Phase 0 là thiết kế lịch sử, không phải test đã chạy. Chưa triển khai hoặc kiểm realtime/Phase 4.
