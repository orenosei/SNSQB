import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, Link } from "react-router";
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

function ProtectedRoute() {
  const { tokens } = useSession();
  return tokens ? <Outlet /> : <Navigate to="/login" replace />;
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
