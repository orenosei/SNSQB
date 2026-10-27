# API checklist

Cập nhật 2026-10-26. Nguồn chính, bất biến: [source/openapi.json](source/openapi.json). Đây là checklist tiến độ đang dùng; chi tiết contract ở [api-inventory.csv](analysis/api-inventory.csv), case thiết kế ở [test-case-matrix.csv](testing/test-case-matrix.csv).

**146 REST operations = 124 non-Admin được phép + 22 Admin bị cấm.** Phân loại dựa path và rà lại nhãn/prose Admin-only; không loại operation chỉ vì mô tả cho cả Lecturer/Admin. Tất cả endpoint bên dưới có prefix `/api/v1` trên REST base URL `https://snsqb.duckdns.org/api/v1`.

| Method | Được phép |
|---|---:|
| GET | 55 |
| POST | 45 |
| PUT | 11 |
| PATCH | 2 |
| DELETE | 11 |

## Trạng thái

- **Frontend:** TODO / DONE / N/A (kèm lý do nếu chỉ phục vụ test hoặc không cần UI riêng). DONE khi luồng đã kết nối API; mock không tính tích hợp.
- **API test:** NOT_WRITTEN / NOT_RUN / PASS / FAIL / BLOCKED. PASS/FAIL dựa lần chạy thật gần nhất; ghi số scenario/bằng chứng ở [TEST_REPORT](TEST_REPORT.md). Một PASS không ngụ ý đã kiểm hết mọi trường hợp.
- Hiện **Frontend 0/124**, chưa có test code hoặc credentials. Tất cả hàng là TODO / NOT_WRITTEN; việc chưa có credentials chỉ chặn chạy thật, không chặn viết code/test.
- Không gọi `/admin/**`, `/auth/admin/**` hoặc API khác được chỉ định Admin-only. Cả AI chat/history/sessions dưới `/admin/ai/chat**` đều bị loại. Không dùng Admin để tạo tài khoản/fixtures.
- Các khác biệt PDF đã được giải quyết bằng Swagger; không giữ decision gate C01-C33. Giả định kỹ thuật ngắn ở [PLAN](PLAN.md).

## 01. Xác thực (Auth) — 4 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /auth/refresh` | `refreshToken` | TODO | NOT_WRITTEN |
| `POST /auth/logout` | `logout` | TODO | NOT_WRITTEN |
| `POST /auth/login` | `login` | TODO | NOT_WRITTEN |
| `POST /auth/change-password` | `changePassword` | TODO | NOT_WRITTEN |

## 03. Hồ sơ người dùng (User Profile) — 4 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /users/me` | `getMyProfile` | TODO | NOT_WRITTEN |
| `PUT /users/me` | `updateMyProfile` | TODO | NOT_WRITTEN |
| `DELETE /users/me` | `deleteMyProfile` | TODO | NOT_WRITTEN |
| `GET /users/{userId}` | `getUserProfile` | TODO | NOT_WRITTEN |

## 04. Mạng xã hội - Bài viết (Posts) — 8 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `GET /posts/{id}` | `getPost` | TODO | NOT_WRITTEN |
| `PUT /posts/{id}` | `updatePost` | TODO | NOT_WRITTEN |
| `DELETE /posts/{id}` | `deletePost` | TODO | NOT_WRITTEN |
| `PUT /posts/{id}/lecturer-notes` | `updateLecturerNote` | TODO | NOT_WRITTEN |
| `POST /posts` | `createPost` | TODO | NOT_WRITTEN |
| `GET /video-posts` | `getVideoPosts` | TODO | NOT_WRITTEN |
| `GET /users/{userId}/posts` | `getUserPosts` | TODO | NOT_WRITTEN |
| `GET /posts/me` | `getMyPosts` | TODO | NOT_WRITTEN |

## 05. Tương tác - Bình luận (Comments) — 4 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `PUT /comments/{commentId}` | `updateComment` | TODO | NOT_WRITTEN |
| `DELETE /comments/{commentId}` | `deleteComment` | TODO | NOT_WRITTEN |
| `GET /comments` | `getComments` | TODO | NOT_WRITTEN |
| `POST /comments` | `createComment` | TODO | NOT_WRITTEN |

## 06. Tương tác - Cảm xúc (Reactions) — 1 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /react` | `toggleReact` | TODO | NOT_WRITTEN |

## 07. Quan hệ - Kết bạn (Friendships) — 7 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /friendships/request` | `sendFriendRequest` | TODO | NOT_WRITTEN |
| `POST /friendships/decline` | `declineFriendRequest` | TODO | NOT_WRITTEN |
| `POST /friendships/accept` | `acceptFriendRequest` | TODO | NOT_WRITTEN |
| `GET /friendships` | `getMyFriends` | TODO | NOT_WRITTEN |
| `GET /friendships/requests/sent` | `getSentFriendRequests` | TODO | NOT_WRITTEN |
| `GET /friendships/requests/received` | `getReceivedFriendRequests` | TODO | NOT_WRITTEN |
| `DELETE /friendships/{friendId}` | `unfriend` | TODO | NOT_WRITTEN |

## 08. Quan hệ - Theo dõi (Follows) — 5 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /follows/{targetUserId}` | `followUser` | TODO | NOT_WRITTEN |
| `DELETE /follows/{targetUserId}` | `unfollowUser` | TODO | NOT_WRITTEN |
| `GET /users/{userId}/relationship-stats` | `getRelationshipStats` | TODO | NOT_WRITTEN |
| `GET /follows/following` | `getFollowing` | TODO | NOT_WRITTEN |
| `GET /follows/followers` | `getFollowers` | TODO | NOT_WRITTEN |

## 09. Quan hệ - Chặn (Blocks) — 3 APIs

| Method + path | operationId | Frontend | API test |
|---|---|---|---|
| `POST /blocks/{targetUserId}` | `blockUser` | TODO | NOT_WRITTEN |
| `DELETE /blocks/{targetUserId}` | `unblockUser` | TODO | NOT_WRITTEN |
| `GET /blocks` | `getBlockedUsers` | TODO | NOT_WRITTEN |

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
| `GET /activity-feeds` | `getActivityFeeds` | TODO | NOT_WRITTEN |
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
| `GET /search` | `search` | TODO | NOT_WRITTEN |
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
| `POST /medias/upload` | `uploadMedia` | TODO | NOT_WRITTEN |
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
