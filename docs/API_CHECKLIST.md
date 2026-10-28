# API checklist

Cập nhật 2026-10-28. Bản Swagger online đã đồng bộ: [source/openapi.json](source/openapi.json). Đây là checklist tiến độ đang dùng; chi tiết contract ở [api-inventory.csv](analysis/api-inventory.csv), case thiết kế ở [test-case-matrix.csv](testing/test-case-matrix.csv).

**146 REST operations = 124 non-Admin được phép + 22 Admin bị cấm.** Phân loại dựa path và rà lại nhãn/prose Admin-only; không loại operation chỉ vì mô tả cho cả Lecturer/Admin. Tất cả endpoint bên dưới có prefix `/api/v1` trên REST base URL `https://snsqb.duckdns.org/api/v1`.

| Method | Được phép |
|---|---:|
| GET | 55 |
| POST | 45 |
| PUT | 11 |
| PATCH | 2 |
| DELETE | 11 |

## Đồng bộ Swagger 2026-10-28

- Tải từ `https://snsqb.duckdns.org/api/v1/docs/openapi.json`; kiểm JSON/OpenAPI 3.1, paths, operationId không trùng và mọi `$ref` nội bộ. Bản local giữ nguyên nội dung online, chỉ định dạng JSON.
- Thay `GET /sessions/my-enrolled-subjects` bằng `GET /sessions/my-enrolled-course-classes` (`getMyEnrolledCourseClasses`): trả lớp hiện tại/lịch sử, thông tin môn/học kỳ, `active_semester`, `can_propose`. Không còn gọi endpoint đã xóa.
- Breaking: `ProposeSessionRequest` bỏ `subject_id`, bắt buộc `course_class_id`; `UpdateSubmissionSessionRequest` dùng `course_class_id` tùy chọn. `title` và `questions` vẫn bắt buộc khi tạo.
- Response tạo thêm `course_class_id`, `semester_name`; summary/detail thêm lớp, học kỳ và `status` PENDING/REVIEWING/RESOLVED. Các field mới của response đều optional theo schema. Hai schema mới: `CourseClassOptionResponse`, `GlobalResponseListCourseClassOptionResponse`.
- JWT/security schemes không đổi. Quyền đề xuất gắn với lớp trong học kỳ hiện tại; UI chỉ cho gửi mới/chuyển lớp khi `can_propose=true`, server vẫn quyết định quyền. Alias `bearerAuth`/`BearerAuth` chưa nhất quán từ bản cũ vẫn tồn tại trên online, không tự sửa source.
- Ngoài ra chỉ đổi ví dụ số nguyên sang số thực, không đổi kiểu field. Tổng vẫn 146 operations / 124 non-Admin / 22 Admin loại trừ; không có tính năng mới độc lập để tự triển khai. Inventory được tái sinh theo snapshot mới; CSV thiết kế Phase 0 là lịch sử, không phải test hợp đồng mới.

## Trạng thái

- **Frontend:** TODO / DONE / N/A (kèm lý do nếu chỉ phục vụ test hoặc không cần UI riêng). DONE khi code đã nối luồng tới endpoint theo Swagger; việc xác minh backend thật được ghi riêng ở cột API test, mock không chứng minh backend hoạt động.
- **API test:** NOT_WRITTEN / NOT_RUN / PASS / FAIL / BLOCKED. PASS/FAIL dựa lần chạy thật gần nhất; kết quả Phase 1–2 ở [TEST_REPORT](TEST_REPORT.md). Một PASS không ngụ ý đã kiểm hết mọi trường hợp.
- Hiện **Frontend 73/124** đã nối trong code; 58/124 operations non-Admin đã gọi backend thật (46,8%): 54 response thành công đúng Swagger, 4 chỉ kiểm 401/403. Typecheck/build PASS; các E2E Phase 4 có mock đều PASS; **78 API case PASS, 0 FAIL, 26 SKIPPED**. Chi tiết theo method/path ở TEST_REPORT. Realtime SockJS handshake PASS, nhưng STOMP trình duyệt thật bị CORS của backend chặn từ Vite localhost. Không gọi Admin APIs.
- Không gọi `/admin/**`, `/auth/admin/**` hoặc API khác được chỉ định Admin-only. Cả AI chat/history/sessions dưới `/admin/ai/chat**` đều bị loại. Không dùng Admin để tạo tài khoản/fixtures.
- Các khác biệt PDF đã được giải quyết bằng Swagger; không giữ decision gate C01-C33. Giả định kỹ thuật ngắn ở [PLAN](PLAN.md).

## 01. Xác thực (Auth) — 4 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /auth/refresh` | `refreshToken` | DONE | BLOCKED — đã viết, chờ kiểm thử đăng nhập backend thật |
| `POST /auth/logout` | `logout` | DONE | PASS — response thành công; /auth/login cũng kiểm 400 |
| `POST /auth/login` | `login` | DONE | PASS — response thành công; /auth/login cũng kiểm 400 |
| `POST /auth/change-password` | `changePassword` | DONE | NOT_WRITTEN — không đổi mật khẩu account đang dùng |

## 03. Hồ sơ người dùng (User Profile) — 4 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /users/me` | `getMyProfile` | DONE | PASS — HTTP 200 JWT |
| `PUT /users/me` | `updateMyProfile` | DONE | NOT_WRITTEN — chỉ test UI mock, không sửa dữ liệu chung |
| `DELETE /users/me` | `deleteMyProfile` | TODO | NOT_WRITTEN |
| `GET /users/{userId}` | `getUserProfile` | DONE | PASS — HTTP 200 JWT |

## 04. Mạng xã hội - Bài viết (Posts) — 8 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /posts/{id}` | `getPost` | DONE | PASS — HTTP 200 JWT |
| `PUT /posts/{id}` | `updatePost` | DONE | PASS — HTTP 200 JWT |
| `DELETE /posts/{id}` | `deletePost` | DONE | PASS — HTTP 200 JWT |
| `PUT /posts/{id}/lecturer-notes` | `updateLecturerNote` | TODO | NOT_WRITTEN |
| `POST /posts` | `createPost` | DONE | PASS — response thành công; /auth/login cũng kiểm 400 |
| `GET /video-posts` | `getVideoPosts` | DONE | PASS — HTTP 200 JWT |
| `GET /users/{userId}/posts` | `getUserPosts` | DONE | PASS — HTTP 200 JWT |
| `GET /posts/me` | `getMyPosts` | DONE | PASS — HTTP 200 JWT |

## 05. Tương tác - Bình luận (Comments) — 4 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `PUT /comments/{commentId}` | `updateComment` | DONE | PASS — HTTP 200 JWT |
| `DELETE /comments/{commentId}` | `deleteComment` | DONE | PASS — HTTP 200 JWT |
| `GET /comments` | `getComments` | DONE | PASS — HTTP 200 JWT |
| `POST /comments` | `createComment` | DONE | PASS — response thành công; /auth/login cũng kiểm 400 |

## 06. Tương tác - Cảm xúc (Reactions) — 1 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /react` | `toggleReact` | DONE | PASS — response thành công; /auth/login cũng kiểm 400 |

## 07. Quan hệ - Kết bạn (Friendships) — 7 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /friendships/request` | `sendFriendRequest` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT; peer nếu case cần |
| `POST /friendships/decline` | `declineFriendRequest` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT; peer nếu case cần |
| `POST /friendships/accept` | `acceptFriendRequest` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT; peer nếu case cần |
| `GET /friendships` | `getMyFriends` | DONE | PASS — HTTP 200 JWT |
| `GET /friendships/requests/sent` | `getSentFriendRequests` | DONE | PASS — HTTP 200 JWT |
| `GET /friendships/requests/received` | `getReceivedFriendRequests` | DONE | PASS — HTTP 200 JWT |
| `DELETE /friendships/{friendId}` | `unfriend` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT; peer nếu case cần |

## 08. Quan hệ - Theo dõi (Follows) — 5 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /follows/{targetUserId}` | `followUser` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT; peer nếu case cần |
| `DELETE /follows/{targetUserId}` | `unfollowUser` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT; peer nếu case cần |
| `GET /users/{userId}/relationship-stats` | `getRelationshipStats` | DONE | PASS — HTTP 200 JWT |
| `GET /follows/following` | `getFollowing` | DONE | PASS — HTTP 200 JWT |
| `GET /follows/followers` | `getFollowers` | DONE | PASS — HTTP 200 JWT |

## 09. Quan hệ - Chặn (Blocks) — 3 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /blocks/{targetUserId}` | `blockUser` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT; peer nếu case cần |
| `DELETE /blocks/{targetUserId}` | `unblockUser` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT; peer nếu case cần |
| `GET /blocks` | `getBlockedUsers` | DONE | PASS — HTTP 200 JWT |

## 10. Trò chuyện - Cuộc hội thoại (Conversations) — 14 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `PUT /conversations/{id}` | `updateGroupInfo` | TODO | NOT_WRITTEN |
| `PUT /conversations/{id}/members/{userId}/role` | `updateMemberRole` | TODO | NOT_WRITTEN |
| `POST /users/me/hidden-chat-pin` | `setHiddenChatPin` | TODO | NOT_WRITTEN |
| `GET /conversations/{id}/members` | `getGroupMembers` | TODO | NOT_WRITTEN |
| `POST /conversations/{id}/members` | `addGroupMembers` | TODO | NOT_WRITTEN |
| `POST /conversations/{id}/leave` | `leaveGroup` | TODO | NOT_WRITTEN |
| `POST /conversations/hidden/unlock` | `unlockHiddenChat` | TODO | NOT_WRITTEN |
| `POST /conversations/group` | `createGroupConversation` | TODO | NOT_WRITTEN |
| `POST /conversations/direct` | `createDirectConversation` | DONE | BLOCKED — cần peer để tạo hội thoại 1-1 |
| `PATCH /conversations/{id}/unhide` | `unhideConversation` | TODO | NOT_WRITTEN |
| `PATCH /conversations/{id}/hide` | `hideConversation` | TODO | NOT_WRITTEN |
| `GET /conversations` | `getConversations` | DONE | PASS — HTTP 200 JWT |
| `GET /conversations/hidden` | `getHiddenConversations` | TODO | PASS — HTTP 200 JWT |
| `DELETE /conversations/{id}/members/{userId}` | `removeGroupMember` | TODO | NOT_WRITTEN |

## 11. Trò chuyện - Tin nhắn (Messages) — 2 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /conversations/{id}/messages` | `getMessages` | DONE | BLOCKED — account chưa có hội thoại để đọc |
| `DELETE /messages/{id}` | `deleteMessage` | DONE | BLOCKED — không có tin nhắn do test tạo |

## 12. Thông báo (Notifications) — 5 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /settings/push` | `getPushSettings` | DONE | PASS — HTTP 200 JWT |
| `PUT /settings/push` | `updatePushSettings` | DONE | BLOCKED — không ghi đè cài đặt hiện có trong test thật |
| `POST /notifications/{id}/read` | `markAsRead` | DONE | BLOCKED — không có API tạo thông báo test |
| `POST /notifications/read-all` | `markAllAsRead` | DONE | BLOCKED — không đổi trạng thái thông báo có sẵn |
| `GET /notifications` | `getNotifications` | DONE | PASS — HTTP 200 JWT |

## 13. Dòng hoạt động (Activity Feed) — 2 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /activity-feeds` | `getActivityFeeds` | DONE | PASS — HTTP 200 JWT |
| `GET /activity-feeds/new-count` | `getNewFeedCount` | TODO | PASS — HTTP 200 JWT |

## 15b. Danh mục Môn học (Subjects Catalog) — 1 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /subjects` | `getAllSubjects` | DONE | PASS — HTTP 200 JWT |

## 16a. Quản lý Lớp học phần (Course Classes) — 7 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /lecturer/course-classes` | `getCourseClasses` | TODO | PASS — HTTP 401; đường 200 cần LECTURER |
| `POST /lecturer/course-classes` | `createCourseClass` | TODO | NOT_WRITTEN |
| `GET /lecturer/course-classes/{courseClassId}/students` | `getClassStudents` | TODO | NOT_WRITTEN |
| `POST /lecturer/course-classes/{courseClassId}/students` | `assignStudents` | TODO | NOT_WRITTEN |
| `GET /lecturer/course-classes/{courseClassId}` | `getCourseClassDetail` | TODO | NOT_WRITTEN |
| `GET /lecturer/course-classes/my-classes` | `getMyCourseClasses` | DONE | PASS — HTTP 401; đường 200 cần LECTURER |
| `GET /lecturer/course-classes/lecturers` | `getLecturers` | TODO | PASS — HTTP 401; đường 200 cần LECTURER |

## 17. Phiên Đề xuất Câu hỏi (Sessions) — 6 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /sessions/my-submissions/{sessionId}` | `getMySubmissionDetail` | DONE | PASS — HTTP 200 JWT |
| `PUT /sessions/my-submissions/{sessionId}` | `updateMySubmissionSession` | DONE | PASS — HTTP 200 JWT |
| `DELETE /sessions/my-submissions/{sessionId}` | `deleteMySubmissionSession` | DONE | PASS — HTTP 200 JWT |
| `POST /sessions/propose` | `proposeSession` | DONE | PASS — response thành công; /auth/login cũng kiểm 400 |
| `GET /sessions/my-submissions` | `getMySubmissions` | DONE | PASS — HTTP 200 JWT |
| `GET /sessions/my-enrolled-course-classes` | `getMyEnrolledCourseClasses` | DONE | PASS — HTTP 200 JWT |

## 18. Giảng viên Duyệt Câu hỏi (Question Review) — 6 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `PUT /questions/{questionId}` | `editQuestion` | DONE | PASS — HTTP 403 STUDENT; đường 200 cần LECTURER |
| `POST /sessions/{sessionId}/complete-review` | `completeSessionReview` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |
| `POST /sessions/reject` | `rejectQuestions` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |
| `POST /sessions/approve` | `approveQuestions` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |
| `GET /sessions/{sessionId}` | `getSessionDetailForReview` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |
| `GET /sessions/pending` | `getPendingSessions` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |

## 19. Luyện tập & Đánh giá Câu hỏi (Question Interaction) — 6 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /questions/{questionId}/rate` | `rateQuestion` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |
| `POST /questions/{questionId}/answer` | `answerQuestion` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |
| `GET /users/{userId}/sessions` | `getUserProposedSessions` | TODO | PASS — HTTP 200 JWT |
| `GET /sessions/{sessionId}/questions` | `getSessionQuestions` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |
| `GET /questions/{questionId}/statistics` | `getQuestionStatistics` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |
| `GET /questions/{questionId}/ratings` | `getQuestionRatings` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |

## 20. Đề thi & Xuất Đề (Exams) — 5 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /exams/generate` | `generateExam` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |
| `GET /lecturer/questions/export` | `exportQuestions` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |
| `GET /exams/{examId}` | `getExamDetail` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |
| `GET /exams/{examId}/export` | `exportExam` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |
| `GET /exams/my-exams` | `getMyExams` | DONE | BLOCKED — test đã viết, chờ kiểm thử JWT/fixture phù hợp |

## 21. Gamification & Minigames — 11 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /questions/{questionId}/ratings/{ratingUserId}/review-error` | `reviewErrorGame5` | TODO | NOT_WRITTEN |
| `POST /games/prediction/submit` | `submitGame6` | TODO | NOT_WRITTEN |
| `POST /games/prediction/participants` | `predictGame1` | TODO | NOT_WRITTEN |
| `POST /games/prediction/bank-size` | `predictGame4` | TODO | NOT_WRITTEN |
| `POST /games/prediction/approved-questions` | `predictGame2` | TODO | NOT_WRITTEN |
| `GET /games/check-in` | `getCheckInStatus` | TODO | PASS — HTTP 200 JWT |
| `POST /games/check-in` | `checkInDaily` | TODO | NOT_WRITTEN |
| `GET /games/prediction/game-1/classes` | `getMyCourseClassesForGame1Prediction` | TODO | PASS — HTTP 200 JWT |
| `GET /games/prediction/active-session` | `getActiveGame6Session` | TODO | NOT_WRITTEN |
| `GET /games/my-predictions` | `getMyPredictions` | TODO | PASS — HTTP 200 JWT |
| `GET /games/leaderboard` | `getLeaderboard` | TODO | PASS — HTTP 200 JWT |

## 22. Huy hiệu & Danh hiệu (Badges) — 4 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /badges` | `getAllBadges_1` | TODO | PASS — HTTP 200 JWT |
| `GET /badges/{badgeId}` | `getBadgeById` | TODO | PASS — HTTP 200 JWT |
| `GET /badges/users/{userId}` | `getUserBadges` | TODO | PASS — HTTP 200 JWT |
| `GET /badges/me` | `getMyBadges` | TODO | PASS — HTTP 200 JWT |

## 23. Cửa hàng & Vật phẩm Trang trí (Cosmetics) — 5 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `PUT /cosmetics/unequip` | `unequipCosmetic` | TODO | NOT_WRITTEN |
| `PUT /cosmetics/equip` | `equipCosmetic` | TODO | NOT_WRITTEN |
| `POST /cosmetics/{id}/buy` | `buyCosmetic` | TODO | NOT_WRITTEN |
| `GET /cosmetics/shop` | `getShop` | TODO | PASS — HTTP 200 JWT |
| `GET /cosmetics/my-inventory` | `getMyInventory` | TODO | PASS — HTTP 200 JWT |

## 24. Tích hợp Trí tuệ Nhân tạo (AI Integration) — 2 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /questions/{questionId}/ai-refine` | `refineQuestion` | TODO | NOT_WRITTEN |
| `POST /questions/{questionId}/ai-apply` | `applyAiRefinement` | TODO | NOT_WRITTEN |

## 25. Tìm kiếm Toàn văn (Search) — 3 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /search` | `search` | DONE | PASS — HTTP 200 JWT |
| `GET /search/saved` | `getSavedAndTrendingSearches` | DONE | PASS — HTTP 200 JWT |
| `DELETE /search/saved/{id}` | `deleteSavedSearch` | DONE | PASS — xóa search record do test tạo |

## 26. Báo cáo & Khiếu nại (Reports) — 1 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /report` | `createReport` | DONE | NOT_WRITTEN — report không có API dọn dữ liệu |

## 27. Tải lên Media (Cloudflare R2) — 3 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /medias/verify` | `verifyMedias` | TODO | PASS — response thành công; /auth/login cũng kiểm 400 |
| `POST /medias/upload` | `uploadMedia` | DONE | PASS — response thành công; /auth/login cũng kiểm 400 |
| `POST /medias/presign` | `getPresignedUrls` | TODO | PASS — response thành công; /auth/login cũng kiểm 400 |

## 28. Quản lý Thiết bị (Devices) — 5 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /devices/{deviceId}/logout` | `revokeDevice` | TODO | NOT_WRITTEN |
| `POST /devices/fid` | `syncFid` | TODO | NOT_WRITTEN |
| `POST /devices/fid/unregister` | `unregisterFid` | TODO | NOT_WRITTEN |
| `GET /devices` | `getMyDevices` | TODO | PASS — HTTP 200 JWT |
| `DELETE /devices/{deviceId}` | `deleteDevice` | TODO | NOT_WRITTEN |

## Lưu ý khi tích hợp

- Hai operation public theo `security: []`: `login`, `refreshToken`. Các operation khác giữ xác thực Bearer, kể cả scheme viết `bearerAuth` (giả định alias, không sửa spec).
- `getSessionDetailForReview` và `getMessages` là GET có side effect được mô tả; tránh prefetch/refetch tự động.
- Mutation và xóa tài khoản/đổi password/revoke device/review/Coins chỉ dùng fixture test riêng; không tự retry toggle hoặc giao dịch khi kết quả chưa rõ.
- Kiểu dữ liệu, required, constraints, role và response lấy trực tiếp từ operation/schema trong Swagger khi viết code; không cần sao chép toàn bộ schemas vào checklist.
