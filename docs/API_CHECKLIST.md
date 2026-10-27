# API checklist

Cập nhật 2026-10-27. Nguồn chính, bất biến: [source/openapi.json](source/openapi.json). Đây là checklist tiến độ đang dùng; chi tiết contract ở [api-inventory.csv](analysis/api-inventory.csv), case thiết kế ở [test-case-matrix.csv](testing/test-case-matrix.csv).

**146 REST operations = 124 non-Admin được phép + 22 Admin bị cấm.** Phân loại dựa path và rà lại nhãn/prose Admin-only; không loại operation chỉ vì mô tả cho cả Lecturer/Admin. Tất cả endpoint bên dưới có prefix `/api/v1` trên REST base URL `https://snsqb.duckdns.org/api/v1`.

| Method | Được phép |
|---|---:|
| GET | 55 |
| POST | 45 |
| PUT | 11 |
| PATCH | 2 |
| DELETE | 11 |

## Trạng thái

- **Frontend:** TODO / DONE / N/A (kèm lý do nếu chỉ phục vụ test hoặc không cần UI riêng). DONE khi code đã nối luồng tới endpoint theo Swagger; việc xác minh backend thật được ghi riêng ở cột API test, mock không chứng minh backend hoạt động.
- **API test:** NOT_WRITTEN / NOT_RUN / PASS / FAIL / BLOCKED. PASS/FAIL dựa lần chạy thật gần nhất; kết quả Phase 1–2 ở [TEST_REPORT](TEST_REPORT.md). Một PASS không ngụ ý đã kiểm hết mọi trường hợp.
- Hiện **Frontend 35/124** đã nối trong code, chưa xác minh server thật. Typecheck/build PASS; **88 lượt UI mock PASS**, **16 bài API thật SKIPPED** do chưa có tài khoản test chuyên dụng. Phản hồi login thực do người dùng cung cấp có code 1000 và refresh_token null; đã bổ sung tương thích và test hồi quy, không lưu thông tin xác thực vào repo. Phase 2 bổ sung 30 operations và 14 API scenarios; các module ngoài phạm vi giữ TODO / NOT_WRITTEN.
- Không gọi `/admin/**`, `/auth/admin/**` hoặc API khác được chỉ định Admin-only. Cả AI chat/history/sessions dưới `/admin/ai/chat**` đều bị loại. Không dùng Admin để tạo tài khoản/fixtures.
- Các khác biệt PDF đã được giải quyết bằng Swagger; không giữ decision gate C01-C33. Giả định kỹ thuật ngắn ở [PLAN](PLAN.md).

## 01. Xác thực (Auth) — 4 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /auth/refresh` | `refreshToken` | DONE | BLOCKED — đã viết, chờ tài khoản test chuyên dụng |
| `POST /auth/logout` | `logout` | DONE | BLOCKED — đã viết, chờ tài khoản test chuyên dụng |
| `POST /auth/login` | `login` | DONE | BLOCKED — đã viết, chờ tài khoản test chuyên dụng |
| `POST /auth/change-password` | `changePassword` | TODO | NOT_WRITTEN |

## 03. Hồ sơ người dùng (User Profile) — 4 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /users/me` | `getMyProfile` | DONE | BLOCKED — đã viết, chờ tài khoản test chuyên dụng |
| `PUT /users/me` | `updateMyProfile` | DONE | NOT_WRITTEN — chỉ test UI mock, không sửa dữ liệu chung |
| `DELETE /users/me` | `deleteMyProfile` | TODO | NOT_WRITTEN |
| `GET /users/{userId}` | `getUserProfile` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |

## 04. Mạng xã hội - Bài viết (Posts) — 8 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /posts/{id}` | `getPost` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `PUT /posts/{id}` | `updatePost` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `DELETE /posts/{id}` | `deletePost` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `PUT /posts/{id}/lecturer-notes` | `updateLecturerNote` | TODO | NOT_WRITTEN |
| `POST /posts` | `createPost` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `GET /video-posts` | `getVideoPosts` | TODO | NOT_WRITTEN |
| `GET /users/{userId}/posts` | `getUserPosts` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `GET /posts/me` | `getMyPosts` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |

## 05. Tương tác - Bình luận (Comments) — 4 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `PUT /comments/{commentId}` | `updateComment` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `DELETE /comments/{commentId}` | `deleteComment` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `GET /comments` | `getComments` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `POST /comments` | `createComment` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |

## 06. Tương tác - Cảm xúc (Reactions) — 1 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /react` | `toggleReact` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |

## 07. Quan hệ - Kết bạn (Friendships) — 7 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /friendships/request` | `sendFriendRequest` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `POST /friendships/decline` | `declineFriendRequest` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `POST /friendships/accept` | `acceptFriendRequest` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `GET /friendships` | `getMyFriends` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `GET /friendships/requests/sent` | `getSentFriendRequests` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `GET /friendships/requests/received` | `getReceivedFriendRequests` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `DELETE /friendships/{friendId}` | `unfriend` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |

## 08. Quan hệ - Theo dõi (Follows) — 5 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /follows/{targetUserId}` | `followUser` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `DELETE /follows/{targetUserId}` | `unfollowUser` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `GET /users/{userId}/relationship-stats` | `getRelationshipStats` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `GET /follows/following` | `getFollowing` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `GET /follows/followers` | `getFollowers` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |

## 09. Quan hệ - Chặn (Blocks) — 3 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /blocks/{targetUserId}` | `blockUser` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `DELETE /blocks/{targetUserId}` | `unblockUser` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `GET /blocks` | `getBlockedUsers` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |

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
| `POST /conversations/direct` | `createDirectConversation` | TODO | NOT_WRITTEN |
| `PATCH /conversations/{id}/unhide` | `unhideConversation` | TODO | NOT_WRITTEN |
| `PATCH /conversations/{id}/hide` | `hideConversation` | TODO | NOT_WRITTEN |
| `GET /conversations` | `getConversations` | TODO | NOT_WRITTEN |
| `GET /conversations/hidden` | `getHiddenConversations` | TODO | NOT_WRITTEN |
| `DELETE /conversations/{id}/members/{userId}` | `removeGroupMember` | TODO | NOT_WRITTEN |

## 11. Trò chuyện - Tin nhắn (Messages) — 2 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /conversations/{id}/messages` | `getMessages` | TODO | NOT_WRITTEN |
| `DELETE /messages/{id}` | `deleteMessage` | TODO | NOT_WRITTEN |

## 12. Thông báo (Notifications) — 5 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /settings/push` | `getPushSettings` | TODO | NOT_WRITTEN |
| `PUT /settings/push` | `updatePushSettings` | TODO | NOT_WRITTEN |
| `POST /notifications/{id}/read` | `markAsRead` | TODO | NOT_WRITTEN |
| `POST /notifications/read-all` | `markAllAsRead` | TODO | NOT_WRITTEN |
| `GET /notifications` | `getNotifications` | TODO | NOT_WRITTEN |

## 13. Dòng hoạt động (Activity Feed) — 2 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /activity-feeds` | `getActivityFeeds` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `GET /activity-feeds/new-count` | `getNewFeedCount` | TODO | NOT_WRITTEN |

## 15b. Danh mục Môn học (Subjects Catalog) — 1 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /subjects` | `getAllSubjects` | TODO | NOT_WRITTEN |

## 16a. Quản lý Lớp học phần (Course Classes) — 7 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /lecturer/course-classes` | `getCourseClasses` | TODO | NOT_WRITTEN |
| `POST /lecturer/course-classes` | `createCourseClass` | TODO | NOT_WRITTEN |
| `GET /lecturer/course-classes/{courseClassId}/students` | `getClassStudents` | TODO | NOT_WRITTEN |
| `POST /lecturer/course-classes/{courseClassId}/students` | `assignStudents` | TODO | NOT_WRITTEN |
| `GET /lecturer/course-classes/{courseClassId}` | `getCourseClassDetail` | TODO | NOT_WRITTEN |
| `GET /lecturer/course-classes/my-classes` | `getMyCourseClasses` | TODO | NOT_WRITTEN |
| `GET /lecturer/course-classes/lecturers` | `getLecturers` | TODO | NOT_WRITTEN |

## 17. Phiên Đề xuất Câu hỏi (Sessions) — 6 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /sessions/my-submissions/{sessionId}` | `getMySubmissionDetail` | TODO | NOT_WRITTEN |
| `PUT /sessions/my-submissions/{sessionId}` | `updateMySubmissionSession` | TODO | NOT_WRITTEN |
| `DELETE /sessions/my-submissions/{sessionId}` | `deleteMySubmissionSession` | TODO | NOT_WRITTEN |
| `POST /sessions/propose` | `proposeSession` | TODO | NOT_WRITTEN |
| `GET /sessions/my-submissions` | `getMySubmissions` | TODO | NOT_WRITTEN |
| `GET /sessions/my-enrolled-subjects` | `getMyEnrolledSubjects` | TODO | NOT_WRITTEN |

## 18. Giảng viên Duyệt Câu hỏi (Question Review) — 6 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `PUT /questions/{questionId}` | `editQuestion` | TODO | NOT_WRITTEN |
| `POST /sessions/{sessionId}/complete-review` | `completeSessionReview` | TODO | NOT_WRITTEN |
| `POST /sessions/reject` | `rejectQuestions` | TODO | NOT_WRITTEN |
| `POST /sessions/approve` | `approveQuestions` | TODO | NOT_WRITTEN |
| `GET /sessions/{sessionId}` | `getSessionDetailForReview` | TODO | NOT_WRITTEN |
| `GET /sessions/pending` | `getPendingSessions` | TODO | NOT_WRITTEN |

## 19. Luyện tập & Đánh giá Câu hỏi (Question Interaction) — 6 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /questions/{questionId}/rate` | `rateQuestion` | TODO | NOT_WRITTEN |
| `POST /questions/{questionId}/answer` | `answerQuestion` | TODO | NOT_WRITTEN |
| `GET /users/{userId}/sessions` | `getUserProposedSessions` | TODO | NOT_WRITTEN |
| `GET /sessions/{sessionId}/questions` | `getSessionQuestions` | TODO | NOT_WRITTEN |
| `GET /questions/{questionId}/statistics` | `getQuestionStatistics` | TODO | NOT_WRITTEN |
| `GET /questions/{questionId}/ratings` | `getQuestionRatings` | TODO | NOT_WRITTEN |

## 20. Đề thi & Xuất Đề (Exams) — 5 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /exams/generate` | `generateExam` | TODO | NOT_WRITTEN |
| `GET /lecturer/questions/export` | `exportQuestions` | TODO | NOT_WRITTEN |
| `GET /exams/{examId}` | `getExamDetail` | TODO | NOT_WRITTEN |
| `GET /exams/{examId}/export` | `exportExam` | TODO | NOT_WRITTEN |
| `GET /exams/my-exams` | `getMyExams` | TODO | NOT_WRITTEN |

## 21. Gamification & Minigames — 11 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /questions/{questionId}/ratings/{ratingUserId}/review-error` | `reviewErrorGame5` | TODO | NOT_WRITTEN |
| `POST /games/prediction/submit` | `submitGame6` | TODO | NOT_WRITTEN |
| `POST /games/prediction/participants` | `predictGame1` | TODO | NOT_WRITTEN |
| `POST /games/prediction/bank-size` | `predictGame4` | TODO | NOT_WRITTEN |
| `POST /games/prediction/approved-questions` | `predictGame2` | TODO | NOT_WRITTEN |
| `GET /games/check-in` | `getCheckInStatus` | TODO | NOT_WRITTEN |
| `POST /games/check-in` | `checkInDaily` | TODO | NOT_WRITTEN |
| `GET /games/prediction/game-1/classes` | `getMyCourseClassesForGame1Prediction` | TODO | NOT_WRITTEN |
| `GET /games/prediction/active-session` | `getActiveGame6Session` | TODO | NOT_WRITTEN |
| `GET /games/my-predictions` | `getMyPredictions` | TODO | NOT_WRITTEN |
| `GET /games/leaderboard` | `getLeaderboard` | TODO | NOT_WRITTEN |

## 22. Huy hiệu & Danh hiệu (Badges) — 4 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /badges` | `getAllBadges_1` | TODO | NOT_WRITTEN |
| `GET /badges/{badgeId}` | `getBadgeById` | TODO | NOT_WRITTEN |
| `GET /badges/users/{userId}` | `getUserBadges` | TODO | NOT_WRITTEN |
| `GET /badges/me` | `getMyBadges` | TODO | NOT_WRITTEN |

## 23. Cửa hàng & Vật phẩm Trang trí (Cosmetics) — 5 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `PUT /cosmetics/unequip` | `unequipCosmetic` | TODO | NOT_WRITTEN |
| `PUT /cosmetics/equip` | `equipCosmetic` | TODO | NOT_WRITTEN |
| `POST /cosmetics/{id}/buy` | `buyCosmetic` | TODO | NOT_WRITTEN |
| `GET /cosmetics/shop` | `getShop` | TODO | NOT_WRITTEN |
| `GET /cosmetics/my-inventory` | `getMyInventory` | TODO | NOT_WRITTEN |

## 24. Tích hợp Trí tuệ Nhân tạo (AI Integration) — 2 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /questions/{questionId}/ai-refine` | `refineQuestion` | TODO | NOT_WRITTEN |
| `POST /questions/{questionId}/ai-apply` | `applyAiRefinement` | TODO | NOT_WRITTEN |

## 25. Tìm kiếm Toàn văn (Search) — 3 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /search` | `search` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `GET /search/saved` | `getSavedAndTrendingSearches` | TODO | NOT_WRITTEN |
| `DELETE /search/saved/{id}` | `deleteSavedSearch` | TODO | NOT_WRITTEN |

## 26. Báo cáo & Khiếu nại (Reports) — 1 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /report` | `createReport` | TODO | NOT_WRITTEN |

## 27. Tải lên Media (Cloudflare R2) — 3 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /medias/verify` | `verifyMedias` | TODO | NOT_WRITTEN |
| `POST /medias/upload` | `uploadMedia` | DONE | BLOCKED — test đã viết, chờ cặp tài khoản test riêng |
| `POST /medias/presign` | `getPresignedUrls` | TODO | NOT_WRITTEN |

## 28. Quản lý Thiết bị (Devices) — 5 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /devices/{deviceId}/logout` | `revokeDevice` | TODO | NOT_WRITTEN |
| `POST /devices/fid` | `syncFid` | TODO | NOT_WRITTEN |
| `POST /devices/fid/unregister` | `unregisterFid` | TODO | NOT_WRITTEN |
| `GET /devices` | `getMyDevices` | TODO | NOT_WRITTEN |
| `DELETE /devices/{deviceId}` | `deleteDevice` | TODO | NOT_WRITTEN |

## Lưu ý khi tích hợp

- Hai operation public theo `security: []`: `login`, `refreshToken`. Các operation khác giữ xác thực Bearer, kể cả scheme viết `bearerAuth` (giả định alias, không sửa spec).
- `getSessionDetailForReview` và `getMessages` là GET có side effect được mô tả; tránh prefetch/refetch tự động.
- Mutation và xóa tài khoản/đổi password/revoke device/review/Coins chỉ dùng fixture test riêng; không tự retry toggle hoặc giao dịch khi kết quả chưa rõ.
- Kiểu dữ liệu, required, constraints, role và response lấy trực tiếp từ operation/schema trong Swagger khi viết code; không cần sao chép toàn bộ schemas vào checklist.
