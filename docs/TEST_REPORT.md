# Test report

Cập nhật 2026-10-26. **Chưa có test ứng dụng hoặc request backend nào được thực thi.** Lần cập nhật này chỉ rà/gom tài liệu và kiểm tính đầy đủ của checklist offline.

## Kết quả hiện tại

| Hạng mục | Kết quả |
|---|---|
| API trong phạm vi | 124 non-Admin; 22 Admin loại khỏi thực thi |
| Frontend tích hợp | 0/124 operations |
| API test đã viết / đã chạy | 0 / 0 |
| API operations đã chạy thật / đạt | 0/124 / 0/124 |
| API test passed / failed | 0 / 0 — chưa chạy, không có pass rate |
| Browser E2E / Vitest / WebSocket | Chưa viết, chưa chạy |
| Chạy test server | BLOCKED: chưa có credentials test |
| Code coverage | N/A: chưa có application code |
| Lỗi backend xác minh | 0; không đồng nghĩa backend không có lỗi |

Đã giữ nguyên [test-case-matrix.csv](testing/test-case-matrix.csv): **1.987 API + 15 nhóm WS + 18 E2E + 99 REQ = 2.119 dòng thiết kế**, phủ đủ 124 non-Admin operations. Đây **không phải test đã implement/pass** hoặc số lượng bắt buộc phải đạt. Một row có thể có nhiều variants, không cộng ngầm thành số case đã chạy.

[Reference CSV](testing/test-reference-data.csv) giữ 101 mô tả R/N/D và 33 ngữ cảnh C để tra ID cũ. Các cột `decision_dependencies`, `execution_gate`, expected/steps nhắc PDF hoặc C* trong testcase là snapshot lịch sử, **không phải gate hiện hành**. Trước khi implement case được chọn, đối chiếu Swagger/PLAN và bỏ assertion PDF trái contract; không âm thầm biến mock thành kết quả thật. Inventory giữ reference qua `requirement_ids`/`historical_reference_ids`.

## Test ưu tiên khi triển khai

1. **Auth:** login hợp lệ/sai credentials; profile; token hết hạn → refresh một lần; logout; không gửi request Admin.
2. **Social:** post/comment/reaction lifecycle; owner vs user khác; friend/follow/block; visibility; search/cursor và notifications.
3. **Academic:** môn enrolled → propose → lecturer review → practice/answer/rate → tạo/xuất đề; kiểm state, quyền và các HTTP 409/412 đã mô tả.
4. **Realtime/extended:** gửi/nhận chat đúng member, block, reconnect; group roles; prediction/Coins/AI chỉ dùng fixture phù hợp.
5. **E2E/UI:** các luồng trên bằng browser contexts riêng, responsive, keyboard/focus, loading/error/offline. Vitest dùng cho validation, mapper, auth và component behavior cần thiết.

Mỗi API test tập trung happy path, lỗi/biên quan trọng, authentication/authorization, trạng thái và response contract khi áp dụng. Không nhân case bằng assertion lặp cho đẹp số liệu.

## Các điểm Swagger cần kiểm chứng, không phải lỗi runtime

| Điểm | Cách xử lý hiện tại |
|---|---|
| `bearerAuth`/`BearerAuth` khác tên ở 38 operations | Dùng JWT Bearer theo giả định trong PLAN; không đổi spec. |
| Group prose 200 người nhưng `member_ids.maxItems=99` | Request theo schema 2..99 ID được mời; không tự test 200 tài khoản trên shared server. |
| Success code chỉ có ví dụ `0000`; response schemas nhiều chỗ thiếu required/type | Dùng ví dụ/prose làm giả định, assert field cần cho luồng; đối chiếu response thật. Không âm thầm sửa schemas. |
| WS DTO chỉ có prose; enum message khác nhau giữa prose và REST | Làm TEXT trước, quan sát event trong dedicated conversation khi có account; ghi hạn chế nếu cần. |
| Push thiếu cấu hình Firebase Web/delivery | Hoãn kiểm push thực cho tới khi có cấu hình; settings API pass không chứng minh push đã giao. |
| Dữ liệu không có non-Admin delete/reset | Dùng fixture tái sử dụng/dedicated hoặc backend hỗ trợ cleanup; test nhánh thiếu dữ liệu ghi BLOCKED. |

Không yêu cầu sửa backend theo PDF. Chỉ ghi backend issue khi kết quả thật không đúng Swagger hoặc gây lỗi luồng được hỗ trợ; không gắn lỗi với assumption chưa được kiểm chứng.

## Coverage và cập nhật kết quả

- **Operation coverage:** operations chạy thật / 124. Báo riêng happy path đạt và phần quyền/biên chưa kiểm; một request 200 không chứng minh mọi scenario đạt.
- **Scenario coverage:** số scenario có ý nghĩa đã chạy/đạt/lỗi/blocked trong suite thực; không dùng số dòng tài liệu cũ làm denominator bắt buộc.
- **E2E coverage:** các luồng người dùng đã được kiểm qua browser; ghi rõ API thật hay mock.
- **Requirement coverage:** các luồng/chức năng theo Swagger được kiểm chứng; không duy trì ma trận PDF cũ hoặc quy đổi thành tỷ lệ rubric.
- **Code coverage:** số liệu Vitest nếu bật instrumentation; tách khỏi API/E2E coverage.

Sau mỗi lần chạy, ghi ngày, môi trường, command thực tế, số passed/failed/skipped/blocked và link report. Issue quan trọng chỉ cần endpoint, bước tái hiện bằng fixture test, expected theo Swagger, actual, bằng chứng đã che secrets và trạng thái xử lý. Chưa có lần chạy nên chưa có entries.

Chỉ dùng dedicated Student/Lecturer accounts; không gọi Admin để setup/cleanup, không sửa người dùng thật. Test thật đã được cho phép trong phạm vi dữ liệu riêng; không cần thủ tục duyệt bổ sung. Credentials giữ ngoài Git/`VITE_*`; mock kết quả, schema audit và kiểm tra Markdown không được ghi là backend pass.

## Tài khoản và fixtures cần thiết

Bắt đầu smoke với 1 Student + 1 Lecturer; khi kiểm đầy đủ quyền, dùng S_A/S_B (hai STUDENT cùng lớp), S_C (STUDENT ngoài lớp), L_A/L_B (LECTURER phụ trách hai lớp/môn khác nhau). Alias chỉ là tên fixture, không phải credential. S_DELETE là Student disposable riêng cho tự xóa; password dùng account mutable và device A1/A2/B1 riêng, không revoke thiết bị chính trước cleanup. Không cần Admin account.

| Nhóm | Fixture quan trọng |
|---|---|
| Social | ≥3 bài owned, PUBLIC/FRIENDS/ONLY_ME; comment/reply hai tác giả; quan hệ none/pending/friend/follow/block; notification và saved search riêng |
| Academic | Học kỳ active, SUBJECT_A/B, CLASS_A/B và enrollment; session PENDING/REVIEWING/RESOLVED, câu APPROVED/REJECTED; câu chưa làm/đã làm/stale, ratings và duplicate text/ảnh benign |
| Exam/AI | Bank đủ số câu request thực, nhiều topic/difficulty; đề A/B; export; edit logs đúng/sai question và audit thường/hallucinated/refusal |
| Chat | DIRECT_AB, S_C nonmember; GROUP_ABC có CHIEF/ELDER/VILLAGER; tin nhắn hai tác giả, PIN test và device độc lập |
| Games/Coins/media/push | Ngày/cutoff/phiên game do môi trường test hỗ trợ, balance đủ/thiếu và item owned/expired; media synthetic trong prefix riêng; Firebase/FID test khi cần |

Fixtures chỉ dùng dữ liệu tổng hợp. Ghi account alias, owner/resource IDs, baseline và run_id trong dữ liệu hợp lệ có sẵn (không tự thêm request field run_id). Secret ở environment; che password/PIN/JWT/FID/PII/presigned URLs cả trong trace/HAR/screenshots. Expired/locked/unverified fixtures do backend hỗ trợ hoặc tạo bằng thao tác được phép; không brute force/khóa account shared để tạo lỗi.

## Cleanup và thực thi ngắn gọn

- Comment trước post bằng owner DELETE; reaction/quan hệ/profile/settings phục hồi baseline đúng fixture. Toggle có unknown outcome thì đọc lại, không gửi mù lần nữa. Search chỉ xóa saved ID của run.
- Session chỉ xóa khi owner/PENDING theo contract. Review/rating/answer/exam, lớp/enrollment, Coins/game/report/AI và orphan media không có general rollback: dùng fixture tái sử dụng, TTL hoặc backend hỗ trợ reset. Không invent delete/refund hoặc dùng Admin API để dọn.
- Message xóa đúng scope; group leave có successor phù hợp. Conversation/PIN không có delete/reset chung thì không tích lũy vô hạn. Device/password chỉ đổi hoặc thu hồi fixture, giữ khả năng cleanup. Delete account chỉ disposable.
- Teardown dù test fail, ghi ID còn sót; cleanup không làm được thì dừng phần phụ thuộc dữ liệu đó. Không đụng resource ngoài fixture để cố dọn.
- Chạy mutation tuần tự, request/page/timeouts hữu hạn, không retry vô hạn. File giới hạn lớn, lỗi 5xx có chủ đích, concurrency, game time-bound dùng local/mock hoặc môi trường riêng phù hợp; không flood/fault injection/load test shared. Không đổi clock/finalize/rebuild server để ép kết quả.

WS cần kiểm riêng CONNECT/auth, 3 SEND (`/app/chat.send`, `/app/chat.read`, `/app/chat.typing`) và 2 SUB (`/user/queue/messages`, `/topic/conv.{conversation_id}.typing`): đúng member, nonmember, block khi online, read receipt, reconnect/duplicate, expiry/revoke và remove/leave. Socket/subscriptions dọn cuối test; không khẳng định exactly-once hay global online status nếu chưa có contract.

Report mỗi run có spec/build/environment, command, ngày và kết quả/bằng chứng đã che secrets. Failure quan trọng liên kết test_id→operation_id→expected/actual→issue→retest. Tách exercised/happy-path-pass khỏi fully-verified, hiện skipped/blocked/not_run/flaky; mocked UI không tính live coverage, schema audit không chứng minh NFR/AI algorithms. Không quy đổi phần trăm operation/code thành 70% rubric PDF.
