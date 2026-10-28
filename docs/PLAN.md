# Kế hoạch SNSQB

Cập nhật 2026-10-28. Swagger là nguồn chính; PDF chỉ bổ sung khi không mâu thuẫn. Chỉ đồng bộ Swagger từ backend khi được yêu cầu, không sửa backend và không yêu cầu duyệt lại các khác biệt PDF đã được Swagger định nghĩa. Phần hữu ích từ tài liệu Phase 0 cũ đã được gom vào đây, TEST_REPORT và các CSV hỗ trợ; không duy trì bộ Markdown phân tích riêng.

## Tiến độ và các phase

- [x] Phase 0: rà tài liệu cũ, lấy Swagger làm chuẩn, lập API checklist và báo cáo trung thực.
- [x] **Phase 1 — Foundation + Authentication:** đã triển khai frontend trong `frontend/`, login/profile/edit/refresh/logout, responsive AppShell, Axios chặn ngoài phạm vi và Playwright. Xác minh backend thật còn chờ tài khoản test.
- [x] **Phase 2 — Core Social Network (phạm vi yêu cầu):** feed, CRUD bài viết thảo luận/media, comment/reply/edit/delete, LIKE/LOVE/WOW, hồ sơ công khai, friends/follows/blocks, search người dùng/bài viết. Notifications/settings và danh mục video bài giảng chưa thuộc đợt này.
- [x] **Phase 3 — Question Bank & Practice:** danh mục môn/lớp học phần hiện tại và lịch sử; bộ câu hỏi theo phiên đề xuất, duyệt, luyện tập/answer/rating/statistics; đọc lớp phụ trách để tạo/xem/xuất đề cho giảng viên. Quản lý lớp/ghi danh riêng chưa thuộc UI core đợt này.
- [x] Đồng bộ Swagger online ngày 2026-10-28: API lớp học phần thay môn đang học; đề xuất dùng course_class_id, chỉ chọn lớp can_propose=true; lỗi tải lớp giữ bản soạn và cho thử lại, bỏ fallback danh mục môn. Status từ owner detail quyết định sửa/xóa.
- [ ] **Phase 4 — Realtime + Extended:** chat 1-1 trước, rồi group/hidden chat; games, leaderboard, badges, cosmetics, AI refine/apply; web push khi có cấu hình.
- [ ] **Phase 5 — Testing + Defense:** regression, bổ sung coverage còn thiếu, sửa lỗi UI/integration, báo cáo kết quả và demo. Viết/chạy test phù hợp ngay trong từng phase, không dồn tới cuối.

Core frontend: auth, social feed/post/comment/reaction, quan hệ/block, submission/review/practice/exam và chat 1-1. Các chức năng mở rộng làm sau core; mọi API non-Admin vẫn được theo dõi trong [API_CHECKLIST](API_CHECKLIST.md).

## Phase 1 đã triển khai

- [x] React/TypeScript/Vite, Tailwind Vite plugin, Router, TanStack Query, Axios, Lucide; lockfile và `.env.example`, Node 22.12+.
- [x] Login tiếng Việt, hồ sơ, chỉnh sửa hồ sơ, header/sidebar desktop và menu mobile. Các module social được mở tiếp trong Phase 2 bên dưới; mục chưa triển khai vẫn gắn “Sắp có”.
- [x] Nối 5 operations: POST login/refresh/logout và GET/PUT users/me. Request/envelope/DTO theo Swagger; không Admin/đăng ký/reset.
- [x] Token trong memory, route guard, refresh single-flight tối đa một lần/request, chặn phản hồi cũ khôi phục phiên, xóa cache khi logout; loading/error/validation và giữ draft khi lưu lỗi.
- [x] TypeScript và production build PASS. Playwright: **58 lượt UI PASS (29 case × desktop/mobile), 2 bài backend SKIPPED** ngày 2026-10-27. Responsive kiểm 320/375/768/1280/1536 px và xem ảnh login/profile desktop/mobile.
- [ ] Chạy API thật bằng tài khoản test chuyên dụng: bộ test đã viết cho login success/failure, GET profile, refresh, logout. Chưa có tài khoản test chuyên dụng nên chưa chạy bộ test backend; không suy PASS từ mock. Đã đối chiếu phản hồi login thực do người dùng gửi: code 1000, refresh_token null; frontend đã hỗ trợ, không lưu credentials/token. PUT profile chưa có test thật để tránh sửa dữ liệu dùng chung.

Không thêm React Hook Form/Zod/Vitest vì form Phase 1 đơn giản và Playwright đã bao phủ hành vi cần kiểm. Cách chạy và giới hạn phiên ở [README](../README.md). Báo cáo hiện tại ở TEST_REPORT; CSV thiết kế Phase 0 được giữ nguyên.

## Phase 2 đã triển khai

- [x] Bảng tin `/` đọc `/activity-feeds`, phân trang theo cursor và resolve mục POST qua `/posts/{id}`; không suy diễn payload `content` của sự kiện. Sự kiện ngoài bài viết có nhãn chi tiết chưa khả dụng.
- [x] Tạo/xem/sửa/xóa bài viết, bài của tôi, bài của người khác; PUBLIC/FRIENDS/ONLY_ME; chỉ hiện sửa/xóa cho tác giả, xác nhận trước khi xóa. Upload multipart qua `/medias/upload?purpose=POST|COMMENT`, map MediaItem đúng schema.
- [x] Bình luận/phản hồi phân trang và sort newest/oldest; sửa/xóa bình luận của mình; ba cảm xúc toggle theo kết quả server, không cộng số đếm giả.
- [x] Hồ sơ công khai, gửi/nhận/chấp nhận/từ chối lời mời, danh sách bạn bè/đã gửi/theo dõi/người theo dõi/đã chặn; unfriend/follow/unfollow/block/unblock. Invalidate cache sau mutation, reset nội dung nhạy cảm khi block/unblock.
- [x] Tìm kiếm USER/POST bằng query/type/after/limit; cursor search dùng offset server trả, không tự thêm filter.
- [x] 30 API operations mới; tổng 35/124 nối trong frontend. Không sửa backend/Swagger hoặc cơ chế auth; chỉ mở rộng allowlist endpoint và thông báo lỗi theo ngữ cảnh social.
- [x] Typecheck/build PASS. `npm test`: **88 UI PASS (44 case × desktop/mobile), 16 API SKIPPED**. Có 15 UI case Phase 2 và 14 API case Phase 2; test API tách biệt, chỉ bật với cặp tài khoản test chuyên dụng. Đã xem ảnh feed desktop/mobile, kiểm responsive 320/768/1280 px trên sáu trang social và hồi quy màn Phase 1.
- [ ] Chạy API suite thật khi có hai tài khoản cùng vai trò, không có quan hệ giữa hai tài khoản trước test. Không dùng credentials cá nhân từ hội thoại. Suite chỉ tạo/xóa post/comment của run, kiểm baseline và khôi phục quan hệ test.

Giới hạn contract: GET post chỉ có reacted_by_me, không biết loại cảm xúc cũ; UI không tự gán LIKE. PENDING trong profile/stats không cho biết chiều lời mời; xử lý ở danh sách received/sent. Không có hủy lời mời đã gửi hoặc xóa media rời, không tự tạo endpoint. Phase 3 được ghi ở phần tiếp theo. Chi tiết kiểm chứng ở [TEST_REPORT](TEST_REPORT.md).

## Phase 3 đã triển khai

- [x] Ngân hàng theo SESSION/QUESTION qua search query/type/after/limit; xem nội dung/phương án từ DTO thật; danh mục môn và bộ của tôi lọc subject_id/status, phân trang contents/pagination đúng contract.
- [x] Đề xuất bộ trắc nghiệm một/nhiều đáp án, nguồn LLM/tự soạn, confidence 0–4, ảnh QUESTION; sửa/xóa bộ của mình khi owner detail trả status PENDING. Create dùng llm_generated, update dùng source; không gửi field tự tạo.
- [x] Luyện tập GET session/questions, chọn nhiều phương án, gửi timestamp updated_at chống stale; kết quả/đáp án/lời giải lấy từ server. 409/412/mất mạng không tự gửi lại; yêu cầu tải lại rồi chọn lại. Không tính điểm tổng hoặc suy đúng/sai của lượt cũ từ đáp án đúng.
- [x] Rate 0–4, báo lỗi, thống kê và danh sách đánh giá. GET chỉ có answered/rated: trạng thái cũ được hiển thị nhưng không bịa lựa chọn/kết quả đã làm; phản hồi hiện tại chỉ cache trong phiên đăng nhập.
- [x] Guard LECTURER trước API duyệt/đề thi; mở review bằng thao tác rõ ràng vì GET đổi REVIEWING; không prefetch/refetch tự động. Biên tập, approve/reject, chốt duyệt có cảnh báo từ chối PENDING còn lại; không suy RESOLVED là mọi câu APPROVED.
- [x] Tạo đề với subject_id/class_ids, số câu tùy chọn, difficulty_distribution/topic_weights và cờ đáp án/đảo phương án; đọc lớp đang phụ trách, xem đề và xuất PDF/XLSX từ URL server. Không thêm luồng thi/nộp/chấm cả đề vì Swagger không có.
- [x] 24 operations mới (tổng 59/124), mở rộng search types và upload purpose của operation đã có. Module học thuật tải theo route để giữ bundle ban đầu gọn; sidebar cuộn riêng, logout luôn truy cập được; bỏ response của phiên cũ trước khi cache.
- [x] Typecheck/build PASS. Full Playwright: **152 UI PASS, 0 FAIL, 34 API SKIPPED** (76 UI case × desktop/mobile; 18 API case học thuật mới). Responsive bank/editor/practice/review/exams 320/375/768/1280 px, hồi quy Phase 1–2, đã xem ảnh ngân hàng/kết quả luyện tập desktop/mobile.
- [ ] Chạy đường thành công có JWT trên backend thật: sinh viên dùng account hiện có, peer chỉ cho ownership/quan hệ, giảng viên cho review/exam, approved session/unanswered question cho answer. Test tự tìm lớp can_propose=true khi có; thao tác không có cleanup/reset được ghi retained IDs trong annotation.

Không có GET/DELETE question độc lập cho sinh viên, CRUD topic, practice session/history tổng hợp hoặc thi/chấm nguyên đề; không tự dựng endpoint/workflow thay thế. Câu đã gửi chưa có quy tắc xóa lẻ trong update session nên UI chỉ gỡ câu chưa gửi. Nội dung hiển thị văn bản an toàn và ảnh; render nâng cao Markdown/LaTeX chưa có. Chưa bắt đầu Phase 4.

## Quyết định và giả định đang dùng

| Chủ đề | Cách thực hiện |
|---|---|
| PDF khác Swagger | Theo method/path/schema/security/prose nghiệp vụ của Swagger; không biến khác biệt thành blocker, không bắt backend làm theo PDF. |
| Đăng ký/reset | Tài khoản do bên cung cấp backend cấp; không làm flow tự đăng ký/reset qua Admin APIs. |
| Comment/reaction/privacy | Cho tác giả sửa comment; dùng LIKE/LOVE/WOW và toggle cùng loại để gỡ; hỗ trợ PUBLIC/FRIENDS/ONLY_ME. UI mặc định PUBLIC là lựa chọn sản phẩm, không phải default server. |
| Group và xóa tài khoản | Có trong phạm vi vì Swagger hỗ trợ. Request tạo group tuân `member_ids` 2..99; không dùng mô tả 200 để vượt schema. Tự xóa tài khoản có xác nhận UI; test xóa chỉ dùng account disposable. |
| Review và provenance | Session PENDING/REVIEWING/RESOLVED, question PENDING/APPROVED/REJECTED; không tự thêm bước NEEDS_EDIT/bảo lưu điểm từ PDF. Hiển thị field đúng DTO từng màn, không kết luận backend lỗi chỉ vì khác PDF. Review DTO không có source thì không tự thêm. |
| Request/response | Dùng snake_case, kiểu và tên field của Swagger; kết hợp HTTP và envelope. Chấp nhận `code: "0000"` theo Swagger và `"1000"` theo phản hồi login thực do người dùng cung cấp. Hỗ trợ refresh_token null như phản hồi thực; không sửa Swagger/backend. |
| Swagger tự chưa nhất quán | Ưu tiên constraint schema cho payload so với prose/ví dụ. Dùng description bổ sung semantics như owner, side effect và đơn vị tham số; không sửa source. Field optional không tự biến thành required nếu không có rule rõ. |
| Security scheme | 38 operations dùng `bearerAuth` chưa được khai báo; giả định cùng JWT Bearer với `BearerAuth`, giữ xác thực. Không sửa spec hoặc coi chúng là public. |
| Validation/media | Theo schema từng request: presign tối đa 10 file/request, mỗi file ≤15,728,640 bytes. Không lấy giới hạn ảnh 4MB/4 ảnh trong PDF để ghi đè Swagger; direct upload xử lý 413 khi server báo, không tự suy cùng giới hạn. |
| Auth session/cache | Access/refresh token trong memory trước; reload đăng nhập lại. Refresh single-flight khi 401 và có refresh token; thiếu/null thì yêu cầu đăng nhập lại, không gửi request refresh. Không loop hoặc tự retry mutation có kết quả chưa rõ. TanStack Query cache ngắn theo feature, clear khi logout/đổi user; không cần duyệt cache theo PDF. |
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

UI gợi HUST với primary `#B91C35`, accent/focus `#1D4ED8`, nền `#F7F8FA`, surface `#FFFFFF`, chữ `#172033`/`#475569`; tokens tập trung, font hệ thống hỗ trợ tiếng Việt, body 16px/line-height 1.5. Card/form/dialog tái sử dụng; sidebar desktop, một cột mobile và chat list→thread. Kiểm 320/375/768/1280/1536px, zoom 200%, labels/keyboard/focus, contrast và reduced motion; trạng thái không chỉ biểu diễn bằng màu. Login/profile/AppShell đã triển khai theo hướng này; các screen tương lai chưa được xây.

API DTO giữ snake_case; mapper theo feature, không tự ép string/boolean hoặc bù field thiếu. Tách local form state khỏi server state; cursor theo response, đổi filter reset cursor. JWT không gửi sang presigned storage URLs; dùng client tách biệt cho upload/download. Markdown/LaTeX cần render an toàn, không raw HTML tùy ý. Không tự dựng online presence/event/ACK hoặc Idempotency-Key khi Swagger chưa mô tả. Rich message types và multi-select chưa rõ thì bắt đầu TEXT/single-choice, không coi đó là giới hạn backend đã xác minh.

Refresh tối đa một lần/request, không refresh trên mọi 403; logout hủy query/socket và xóa data phiên cũ. Session RESOLVED không đồng nghĩa mọi question APPROVED; complete-review tự reject các câu PENDING còn lại theo Swagger, cần UX xác nhận rõ hậu quả. Error 409 đã trả lời và 412 stale phải xử lý riêng; giữ draft khi request fail, không tự phát lại mutation khi online trở lại. ID int64 không được âm thầm làm tròn nếu vượt safe integer JavaScript; kiểm dữ liệu thật trước chọn parser phù hợp.
