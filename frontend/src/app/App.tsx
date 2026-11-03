import { lazy, useEffect } from "react";
import { Navigate, Outlet, Route, Routes, Link, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "./AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { EditProfilePage } from "../features/profile/EditProfilePage";
import { useSession } from "../features/auth/session";
import { FeedPage } from "../features/feed/FeedPage";
import {
  PostDetailPage,
  PostEditorPage,
  MyPostsPage,
} from "../features/posts/Pages";
import { PeoplePage } from "../features/people/PeoplePage";
import { UserPage } from "../features/people/UserPage";
import { SearchPage } from "../features/search/SearchPage";
import { ChatPage } from "../features/chat/ChatPage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { NotificationSettingsPage } from "../features/notifications/SettingsPage";
import { ChangePasswordPage } from "../features/auth/ChangePasswordPage";
import { VideoPage } from "../features/feed/VideoPage";
import { LecturerOnly } from "../features/academic/components";

// Keep academic screens out of the initial social/auth bundle.
const BankPage = lazy(() =>
  import("../features/academic/BankPage").then((module) => ({
    default: module.BankPage,
  })),
);
const SubmissionsPage = lazy(() =>
  import("../features/academic/SubmissionPages").then((module) => ({
    default: module.SubmissionsPage,
  })),
);
const SubmissionDetailPage = lazy(() =>
  import("../features/academic/SubmissionPages").then((module) => ({
    default: module.SubmissionDetailPage,
  })),
);
const SubmissionEditorPage = lazy(() =>
  import("../features/academic/SubmissionPages").then((module) => ({
    default: module.SubmissionEditorPage,
  })),
);
const PracticePage = lazy(() =>
  import("../features/academic/PracticePage").then((module) => ({
    default: module.PracticePage,
  })),
);
const ReviewListPage = lazy(() =>
  import("../features/academic/ReviewPages").then((module) => ({
    default: module.ReviewListPage,
  })),
);
const ReviewDetailPage = lazy(() =>
  import("../features/academic/ReviewPages").then((module) => ({
    default: module.ReviewDetailPage,
  })),
);
const ExamsPage = lazy(() =>
  import("../features/academic/ExamPages").then((module) => ({
    default: module.ExamsPage,
  })),
);
const ExamCreatePage = lazy(() =>
  import("../features/academic/ExamPages").then((module) => ({
    default: module.ExamCreatePage,
  })),
);
const ExamDetailPage = lazy(() =>
  import("../features/academic/ExamPages").then((module) => ({
    default: module.ExamDetailPage,
  })),
);
const DevicesPage = lazy(() => import("../features/devices/DevicesPage").then(module => ({default: module.DevicesPage})));
const ClassesPage = lazy(() => import("../features/course-classes/ClassPages").then(module => ({default: module.ClassesPage})));
const ClassDetailPage = lazy(() => import("../features/course-classes/ClassPages").then(module => ({default: module.ClassDetailPage})));

function ProtectedRoute() {
  const { tokens } = useSession();
  const location = useLocation();
  return tokens ? <Outlet /> : <Navigate to="/login" state={{from: location.pathname + location.search}} replace />;
}

export function App() {
  const { tokens } = useSession();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!tokens) queryClient.clear();
  }, [tokens, queryClient]);
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<FeedPage />} />
          <Route path="/posts/new" element={<PostEditorPage />} />
          <Route path="/posts/:postId" element={<PostDetailPage />} />
          <Route path="/posts/:postId/edit" element={<PostEditorPage />} />
          <Route path="/my-posts" element={<MyPostsPage />} />
          <Route path="/friends" element={<PeoplePage />} />
          <Route path="/users/:userId" element={<UserPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
          <Route path="/settings/password" element={<ChangePasswordPage />} />
          <Route path="/settings/devices" element={<DevicesPage />} />
          <Route path="/lecturer/course-classes" element={<LecturerOnly><ClassesPage/></LecturerOnly>} />
          <Route path="/lecturer/course-classes/:courseClassId" element={<LecturerOnly><ClassDetailPage/></LecturerOnly>} />
          <Route path="/videos" element={<VideoPage />} />
          <Route path="/question-bank" element={<BankPage />} />
          <Route path="/submissions" element={<SubmissionsPage />} />
          <Route path="/submissions/new" element={<SubmissionEditorPage />} />
          <Route
            path="/submissions/:sessionId"
            element={<SubmissionDetailPage />}
          />
          <Route
            path="/submissions/:sessionId/edit"
            element={<SubmissionEditorPage />}
          />
          <Route path="/practice/:sessionId" element={<PracticePage />} />
          <Route
            path="/lecturer/reviews"
            element={
              <LecturerOnly>
                <ReviewListPage />
              </LecturerOnly>
            }
          />
          <Route
            path="/lecturer/reviews/:sessionId"
            element={
              <LecturerOnly>
                <ReviewDetailPage />
              </LecturerOnly>
            }
          />
          <Route
            path="/lecturer/exams"
            element={
              <LecturerOnly>
                <ExamsPage />
              </LecturerOnly>
            }
          />
          <Route
            path="/lecturer/exams/new"
            element={
              <LecturerOnly>
                <ExamCreatePage />
              </LecturerOnly>
            }
          />
          <Route
            path="/lecturer/exams/:examId"
            element={
              <LecturerOnly>
                <ExamDetailPage />
              </LecturerOnly>
            }
          />
          <Route path="/me" element={<ProfilePage />} />
          <Route path="/settings/profile" element={<EditProfilePage />} />
          <Route
            path="*"
            element={
              <div className="not-found">
                <p className="eyebrow text-brand">404</p>
                <h1>Chưa tìm thấy trang này</h1>
                <p>
                  Đường dẫn không tồn tại hoặc tính năng chưa được triển khai.
                </p>
                <Link to="/me" className="button button-primary">
                  Về hồ sơ của bạn
                </Link>
              </div>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
