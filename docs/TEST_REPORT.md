# Test report

Cập nhật 2026-10-27 — Phase 1 + Phase 2 core social. Swagger/backend không thay đổi; không gọi Admin APIs.

## Lần chạy gần nhất

Môi trường: Node 24.0.2, macOS arm64, Chromium Playwright; hai project UI desktop và Pixel 7. UI chạy với Vite localhost và HTTP mock riêng; không gọi server thật. Credentials cá nhân trong hội thoại không được đưa vào code/test.

| Lệnh tại frontend/ | Kết quả |
|---|---|
| `npm run typecheck` (được gọi trong build) | PASS |
| `npm run build` | PASS, tạo dist/ |
| `npm test` | **88 PASS, 0 FAIL, 16 SKIPPED**, 34,3 giây |
| `python3 docs/analysis/generate-api-audit.py --check` (tại repo root) | CHECK_OK: 146 operations, 124 non-Admin, 22 excluded |

**88 UI lượt = 44 case × 2 viewport projects**: 29 case hồi quy Phase 1 + 15 case Phase 2. **16 API case skipped = 2 auth + 14 social**, do chưa bật opt-in với tài khoản test chuyên dụng. 35/124 operations đã nối trong code, **0 operations được suite chạy thật**. Không quy đổi mock/inventory thành live API coverage; không bật đo code coverage.

Report HTML: `frontend/playwright-report/index.html`; ảnh/trace: `frontend/test-results/` (đều được gitignore). Ảnh feed desktop/mobile đã được xem. Không dùng snapshot ảnh chứa dữ liệu người dùng thật.

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

Đã sửa các lỗi phát hiện khi phát triển: input file ẩn bị quy tắc input width:100% làm tràn trang; test pending cần chờ HTTP handler; test điều hướng phải giữ phiên memory qua SPA. Lần chạy cuối không có lỗi hoặc retry test tự động.

## API suite đã chuẩn bị, chưa chạy thật

`tests/api/social.spec.ts` có 14 scenarios: đọc feed/profile/lists; CRUD post; non-owner edit/delete; ONLY_ME; FRIENDS trước/sau kết bạn; comment/reply/ownership; 401; payload sai; reaction toggle; friend send/accept/decline/unfriend; follow/unfollow; block/privacy/unblock; search; upload synthetic PNG rồi gắn vào post riêng.

Bật bằng `SNSQB_RUN_REAL_SOCIAL=1`, `SNSQB_TEST_EMAIL`, `SNSQB_TEST_PASSWORD`, `SNSQB_TEST_PEER_EMAIL`, `SNSQB_TEST_PEER_PASSWORD` trong environment. Hai account phải chuyên dụng, cùng STUDENT hoặc LECTURER, không có friendship/follow/block/pending giữa nhau; kiểm baseline trước mutation. Auth suite dùng opt-in riêng `SNSQB_RUN_REAL_API=1`.

Suite real chạy tuần tự, dùng resource do run tạo với marker ngẫu nhiên, cleanup comment trước post, dọn quan hệ giữa cặp test và logout cả hai khi kết thúc. Không xóa hoặc sửa resource có sẵn của người khác, không gọi Admin tạo fixture. API trace/video/screenshot tắt; không log credentials/token. PUT hồ sơ vẫn chỉ được kiểm bằng UI mock.

## Giới hạn backend/contract chưa thể xác minh đầy đủ

- Người dùng cung cấp login HTTP 200 với code 1000, refresh_token null, khác ví dụ Swagger 0000; frontend đã hỗ trợ cả hai. Đây là bằng chứng do người dùng cung cấp, không phải kết quả suite API.
- GET post chỉ có reacted_by_me, không có my_reaction/reaction_counts; UI chỉ biết loại sau POST /react, không giả LIKE hoặc breakdown.
- Activity feed content là object không định nghĩa field; cần GET /posts/{id} cho từng post. Quyền riêng tư/chặn/404 được hiển thị theo server.
- PENDING không chỉ rõ chiều ở profile/stats; UI chuyển tới received/sent. Không có API hủy lời mời đã gửi.
- Upload trực tiếp không có giới hạn file size trong schema và không có API xóa media rời. UI xử lý 413 theo server. Hủy soạn bài sau upload hoặc post create lỗi có thể để lại tệp; không gọi endpoint tự tạo để dọn. Test media ghi annotation nếu upload xong nhưng chưa tạo được post để cleanup.
- CORS, phân trang/visibility/authorization thực tế và cleanup trên server còn chờ dedicated accounts. Chưa kết luận lỗi runtime backend từ mock.

Các CSV testcase/reference Phase 0 là thiết kế lịch sử, không phải test đã chạy. Không bắt đầu kiểm thử học thuật/đề thi/realtime Phase 3 trở đi trong đợt này.
