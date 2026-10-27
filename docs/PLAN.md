# Kế hoạch SNSQB

Cập nhật 2026-10-26. Swagger là nguồn chính; PDF chỉ bổ sung khi không mâu thuẫn. Không sửa Swagger/backend và không yêu cầu duyệt lại các khác biệt PDF đã được Swagger định nghĩa. Phần hữu ích từ tài liệu Phase 0 cũ đã được gom vào đây, TEST_REPORT và các CSV hỗ trợ; không duy trì bộ Markdown phân tích riêng.

## Tiến độ và các phase

- [x] Phase 0: rà tài liệu cũ, lấy Swagger làm chuẩn, lập API checklist và báo cáo trung thực.
- [ ] **Phase 1 — Foundation + Authentication:** React/TypeScript/Vite/Tailwind; router/AppShell và UI cơ bản; Axios; login → profile → refresh → logout; cấu hình Vitest/Playwright và chặn request Admin.
- [ ] **Phase 2 — Social Network:** feed, bài viết/media/video, comment/reply/edit, ba reaction, hồ sơ, friends/follows/blocks, search, notifications/settings.
- [ ] **Phase 3 — Question Bank + Academic:** môn học/lớp/enrollment, đề xuất và duyệt câu hỏi, luyện tập/answer/rating/statistics, tạo/xem/xuất đề.
- [ ] **Phase 4 — Realtime + Extended:** chat 1-1 trước, rồi group/hidden chat; games, leaderboard, badges, cosmetics, AI refine/apply; web push khi có cấu hình.
- [ ] **Phase 5 — Testing + Defense:** regression, bổ sung coverage còn thiếu, sửa lỗi UI/integration, báo cáo kết quả và demo. Viết/chạy test phù hợp ngay trong từng phase, không dồn tới cuối.

Core frontend: auth, social feed/post/comment/reaction, quan hệ/block, submission/review/practice/exam và chat 1-1. Các chức năng mở rộng làm sau core; mọi API non-Admin vẫn được theo dõi trong [API_CHECKLIST](API_CHECKLIST.md).

## Việc đầu tiên khi bắt đầu Phase 1

1. Tạo Vite React TypeScript, Tailwind, router, component nền và scripts build/test. Dùng cấu trúc vừa đủ: `src/{app,components,features,lib}` và `tests/{api,e2e}`.
2. Tạo Axios client đúng base URL, kiểm method/path được phép và chặn Admin trước transport; unit test chặn bằng mock, không gọi Admin thật.
3. Login gửi `email`, `password`, `device_id`, `platform: WEB`; dùng đúng DTO `AuthResponse`, `GET /users/me`, `POST /auth/refresh` và `POST /auth/logout` không body.
4. Làm login/profile/AppShell có loading/error/offline, validation và keyboard focus; viết test refresh/logout/validation có ý nghĩa.
5. Chuẩn bị API/E2E tests và đọc credentials từ environment; chạy thật khi tài khoản test đã được cung cấp, cập nhật checklist/report bằng kết quả thực.

**Chưa thực hiện các bước trên trong lần cập nhật này.** Không cần thêm vòng phân tích hoặc phê duyệt trước khi bắt đầu Phase 1 theo yêu cầu tiếp theo.

## Quyết định và giả định đang dùng

| Chủ đề | Cách thực hiện |
|---|---|
| PDF khác Swagger | Theo method/path/schema/security/prose nghiệp vụ của Swagger; không biến khác biệt thành blocker, không bắt backend làm theo PDF. |
| Đăng ký/reset | Tài khoản do bên cung cấp backend cấp; không làm flow tự đăng ký/reset qua Admin APIs. |
| Comment/reaction/privacy | Cho tác giả sửa comment; dùng LIKE/LOVE/WOW và toggle cùng loại để gỡ; hỗ trợ PUBLIC/FRIENDS/ONLY_ME. UI mặc định PUBLIC là lựa chọn sản phẩm, không phải default server. |
| Group và xóa tài khoản | Có trong phạm vi vì Swagger hỗ trợ. Request tạo group tuân `member_ids` 2..99; không dùng mô tả 200 để vượt schema. Tự xóa tài khoản có xác nhận UI; test xóa chỉ dùng account disposable. |
| Review và provenance | Session PENDING/REVIEWING/RESOLVED, question PENDING/APPROVED/REJECTED; không tự thêm bước NEEDS_EDIT/bảo lưu điểm từ PDF. Hiển thị field đúng DTO từng màn, không kết luận backend lỗi chỉ vì khác PDF. Review DTO không có source thì không tự thêm. |
| Request/response | Dùng snake_case, kiểu và tên field của Swagger; thành công dự kiến `code: "0000"` theo info.description, kết hợp HTTP và dữ liệu. Đây là giả định cần đối chiếu response thật, không thay bằng `1000` từ PDF. |
| Swagger tự chưa nhất quán | Ưu tiên constraint schema cho payload so với prose/ví dụ. Dùng description bổ sung semantics như owner, side effect và đơn vị tham số; không sửa source. Field optional không tự biến thành required nếu không có rule rõ. |
| Security scheme | 38 operations dùng `bearerAuth` chưa được khai báo; giả định cùng JWT Bearer với `BearerAuth`, giữ xác thực. Không sửa spec hoặc coi chúng là public. |
| Validation/media | Theo schema từng request: presign tối đa 10 file/request, mỗi file ≤15,728,640 bytes. Không lấy giới hạn ảnh 4MB/4 ảnh trong PDF để ghi đè Swagger; direct upload xử lý 413 khi server báo, không tự suy cùng giới hạn. |
| Auth session/cache | Access/refresh token trong memory trước; reload đăng nhập lại. Refresh single-flight khi 401, không loop hoặc tự retry mutation có kết quả chưa rõ. TanStack Query cache ngắn theo feature, clear khi logout/đổi user; không cần duyệt cache theo PDF. |
| GET có side effect | Mở review GET chuyển REVIEWING; GET messages cập nhật read receipt. Không prefetch/refetch tự động hai operation này. |
| Chi tiết đã có trong Swagger | `friendId` là ID người bạn; `since` ở new-count là epoch milliseconds theo parameter description; statistics là API non-Admin được phép tích hợp. Không giữ các câu hỏi PDF cũ cho chúng. |
| Tính năng không có API được phép | Không AI chat/history dưới `/admin/ai/chat**`, không endpoint Game3 riêng hoặc import ZIP do tự invent; chỉ dùng khả năng đã mô tả. |
| Realtime/push | Bắt đầu STOMP TEXT theo mô tả; `wss://snsqb.duckdns.org/api/v1/ws` là URL suy từ host HTTPS, chưa xác minh. Chi tiết event/Firebase còn thiếu chỉ ảnh hưởng nhánh đó, không chặn core. |
| UX bổ sung từ PDF | Giữ validate trước gửi, loading/offline, refresh/load more, ảnh xem được và thông báo nhất quán. List rỗng hợp lệ là empty state, không báo mất mạng. Các gợi ý giới hạn 500 từ chưa có trong Swagger không được dùng làm assertion backend phải reject. |

## Vướng mắc thực sự

- **Hiện chưa có tài khoản test:** chặn chạy API/E2E thật và xác minh integration. Không chặn scaffold, UI, client hay chuẩn bị tests ở Phase 1. Bắt đầu smoke bằng 1 Student + 1 Lecturer; thêm tài khoản khi cần cross-user.
- **Theo feature:** học kỳ/môn/lớp/enrollment và approved questions cần tồn tại để chạy academic workflows; websocket/push cần cấu hình/kết quả kết nối thực khi triển khai. Ghi BLOCKED đúng test nếu dữ liệu/cấu hình chưa có, tiếp tục phần độc lập.
- Không còn business blocker yêu cầu người dùng chọn giữa PDF và Swagger. Hành vi chưa document đủ được kiểm chứng khi có account, ghi giả định hoặc issue ngắn; chỉ hỏi nếu không có cách tiếp tục an toàn.

## Cách làm và hoàn thành một tính năng

Làm một luồng dùng được → thêm test có giá trị → kiểm UI responsive/accessible và lỗi → cập nhật đúng hàng API và kết quả test. Không cần risk register, ma trận hàng nghìn case hoặc hồ sơ phê duyệt. Server thật đã được người dùng cho phép với account/dữ liệu test riêng; không xin lại quyền cho từng request thông thường. Thao tác xóa, đổi password, Coins/review và enrollment chỉ dùng fixture có thể dọn hoặc dùng lại an toàn; không sửa dữ liệu thật, không load test shared server.

## Routes và UI nền cần giữ

| Nhóm | Routes frontend dự kiến |
|---|---|
| Auth/profile | `/login`, `/account-help`, `/me`, `/users/:userId`, `/settings/profile`, `/settings/security`, `/settings/devices` |
| Social | `/`, `/posts/new`, `/posts/:postId`, `/posts/:postId/edit`, `/videos`, `/search`, `/friends`, `/friends/requests`, `/notifications`, `/settings/notifications`, `/settings/blocked` |
| Academic | `/subjects`, `/submissions`, `/submissions/new`, `/submissions/:sessionId`, `/submissions/:sessionId/edit`, `/practice/:sessionId` |
| Lecturer | `/lecturer/classes`, `/lecturer/classes/new`, `/lecturer/classes/:courseClassId`, `/lecturer/reviews`, `/lecturer/reviews/:sessionId`, `/lecturer/exams`, `/lecturer/exams/new`, `/lecturer/exams/:examId`, `/lecturer/exports` |
| Realtime/extended | `/messages`, `/messages/hidden`, `/messages/:conversationId`, `/games`, `/games/history`, `/leaderboard`, `/badges`, `/shop`, `/inventory` |
| Fallback | `/forbidden`, `/not-found`, `*` |

Đây là route UI, không phải endpoint mới. `QuestionCard` đọc từ session/practice; không invent `GET /questions/{id}`. Không có Admin UI hoặc AI chat route. Guard phân biệt role global, ownership, enrollment và membership; quyền thực tế vẫn do backend kiểm tra. Global roles là STUDENT/LECTURER/ADMIN; CHIEF/VILLAGE_ELDER/VILLAGER chỉ là vai trò trong group.

UI gợi HUST với primary `#B91C35`, accent/focus `#1D4ED8`, nền `#F7F8FA`, surface `#FFFFFF`, chữ `#172033`/`#475569`; tokens tập trung, font hệ thống hỗ trợ tiếng Việt, body 16px/line-height 1.5. Card/form/dialog tái sử dụng; sidebar desktop, một cột mobile và chat list→thread. Kiểm 320/375/768/1280/1536px, zoom 200%, labels/keyboard/focus, contrast và reduced motion; trạng thái không chỉ biểu diễn bằng màu. Đây là lựa chọn frontend, chưa có screen hoặc CSS được triển khai.

API DTO giữ snake_case; mapper theo feature, không tự ép string/boolean hoặc bù field thiếu. Tách local form state khỏi server state; cursor theo response, đổi filter reset cursor. JWT không gửi sang presigned storage URLs; dùng client tách biệt cho upload/download. Markdown/LaTeX cần render an toàn, không raw HTML tùy ý. Không tự dựng online presence/event/ACK hoặc Idempotency-Key khi Swagger chưa mô tả. Rich message types và multi-select chưa rõ thì bắt đầu TEXT/single-choice, không coi đó là giới hạn backend đã xác minh.

Refresh tối đa một lần/request, không refresh trên mọi 403; logout hủy query/socket và xóa data phiên cũ. Session RESOLVED không đồng nghĩa mọi question APPROVED; complete-review tự reject các câu PENDING còn lại theo Swagger, cần UX xác nhận rõ hậu quả. Error 409 đã trả lời và 412 stale phải xử lý riêng; giữ draft khi request fail, không tự phát lại mutation khi online trở lại. ID int64 không được âm thầm làm tròn nếu vượt safe integer JavaScript; kiểm dữ liệu thật trước chọn parser phù hợp.
