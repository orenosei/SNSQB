import { Suspense, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Bell,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  House,
  LogOut,
  Menu,
  MessageCircle,
  Monitor,
  Pencil,
  School,
  Search,
  Settings,
  UserRound,
  Users,
  Video,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Brand } from "../components/Brand";
import { Avatar } from "../components/Avatar";
import { Loading } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { logout } from "../features/auth/api";
import { setSession } from "../features/auth/session";
import { useProfile } from "../features/profile/api";
import { getNotifications } from "../features/notifications/api";
import { ChatConnectionProvider } from "../features/chat/ChatConnection";

const communityLinks = [
  { label: "Bảng tin", icon: House, to: "/" },
  { label: "Bài viết của tôi", icon: Pencil, to: "/my-posts" },
  { label: "Bạn bè", icon: Users, to: "/friends" },
  { label: "Tìm kiếm", icon: Search, to: "/search" },
  { label: "Tin nhắn", icon: MessageCircle, to: "/chat" },
];
const learningLinks = [
  { label: "Ngân hàng câu hỏi", icon: BookOpen, to: "/question-bank" },
  { label: "Bộ câu hỏi của tôi", icon: GraduationCap, to: "/submissions" },
  { label: "Video bài giảng", icon: Video, to: "/videos" },
];
const teachingLinks = [
  { label: "Duyệt câu hỏi", icon: ClipboardCheck, to: "/lecturer/reviews" },
  { label: "Đề thi", icon: FileCheck2, to: "/lecturer/exams" },
  { label: "Lớp học phần", icon: School, to: "/lecturer/course-classes" },
];
const accountLinks = [
  { label: "Hồ sơ cá nhân", icon: UserRound, to: "/me" },
  { label: "Thông báo", icon: Bell, to: "/notifications" },
  { label: "Thiết bị đăng nhập", icon: Monitor, to: "/settings/devices" },
  { label: "Cài đặt thông báo", icon: Settings, to: "/settings/notifications" },
];
type NavigationLink = (typeof communityLinks)[number];

function NavigationGroup({
  label,
  links,
}: {
  label: string;
  links: NavigationLink[];
}) {
  const location = useLocation();
  return (
    <div className="workspace-nav-group">
      <p className="eyebrow sidebar-label">{label}</p>
      {links.map(({ label: name, icon: Icon, to }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/" || to === "/me"}
          className={({ isActive }) =>
            `nav-item ${isActive || (to === "/question-bank" && location.pathname.startsWith("/practice/")) || (to === "/me" && location.pathname === "/settings/profile") ? "nav-active" : ""}`
          }
        >
          <Icon size={19} />
          <span>{name}</span>
        </NavLink>
      ))}
    </div>
  );
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = useProfile();
  const notifications = useQuery({
    queryKey: ["notifications", "badge"],
    queryFn: () => getNotifications(),
    refetchInterval: 30000,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const path = location.pathname;
  const mode = path.startsWith("/lecturer/")
    ? "teaching"
    : path.startsWith("/settings/") ||
        path === "/me" ||
        path === "/notifications"
      ? "account"
      : /^\/(question-bank|submissions|practice|videos)(\/|$)/.test(path)
        ? "learning"
        : "community";
  const isLecturer = profile.data?.role === "LECTURER";
  const lastPath = useRef(path + location.search);
  useEffect(() => {
    const route = path + location.search;
    if (lastPath.current === route) return;
    lastPath.current = route;
    setMenuOpen(false);
    const frame = requestAnimationFrame(() =>
      document.getElementById("main-content")?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [path, location.search]);
  const signOut = useMutation({
    mutationFn: async () => {
      await client.cancelQueries();
      await logout();
    },
    onSettled: (_data, error) => {
      setSession(
        null,
        error
          ? "Đã thoát trên trình duyệt này. Chưa thể xác nhận thu hồi phiên trên máy chủ."
          : "Bạn đã đăng xuất an toàn.",
      );
      client.clear();
      navigate("/login", { replace: true });
    },
  });
  const logoutButton = (
    <button
      className="nav-item logout-button"
      disabled={signOut.isPending}
      onClick={() => signOut.mutate()}
    >
      <LogOut size={19} />
      <span>{signOut.isPending ? "Đang đăng xuất…" : "Đăng xuất"}</span>
    </button>
  );
  const navigationGroups = (
    <>
      <NavigationGroup label="CỘNG ĐỒNG" links={communityLinks} />
      <NavigationGroup label="HỌC TẬP" links={learningLinks} />
      {isLecturer && (
        <NavigationGroup label="GIẢNG DẠY" links={teachingLinks} />
      )}
      <NavigationGroup label="TÀI KHOẢN" links={accountLinks} />
    </>
  );
  return (
    <ChatConnectionProvider>
      <div className={`app-shell workspace-shell workspace-${mode}`}>
        <a className="skip-link" href="#main-content">
          Đến nội dung chính
        </a>
        <header className="app-header">
          <div className="header-start">
            <button
              id="menu-toggle"
              className="icon-button mobile-menu"
              aria-label="Mở điều hướng"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={23} />
            </button>
            <Brand />
          </div>
          <nav className="workspace-switcher" aria-label="Không gian làm việc">
            <NavLink
              to="/question-bank"
              className={mode === "learning" ? "workspace-active" : ""}
            >
              Học tập
            </NavLink>
            <NavLink
              to="/"
              className={mode === "community" ? "workspace-active" : ""}
            >
              Cộng đồng
            </NavLink>
            {isLecturer && (
              <NavLink
                to="/lecturer/reviews"
                className={mode === "teaching" ? "workspace-active" : ""}
              >
                Giảng dạy
              </NavLink>
            )}
          </nav>
          <form
            className="header-search"
            role="search"
            aria-label="Tìm kiếm nhanh"
            onSubmit={(event) => {
              event.preventDefault();
              const value = String(
                new FormData(event.currentTarget).get("query") || "",
              ).trim();
              if (value)
                navigate(`/search?query=${encodeURIComponent(value)}&type=ALL`);
            }}
          >
            <Search size={17} />
            <input
              name="query"
              aria-label="Tìm kiếm nhanh"
              placeholder="Tìm trong SNSQB…"
              required
            />
            <button className="icon-button" aria-label="Thực hiện tìm kiếm">
              <Search size={17} />
            </button>
          </form>
          <NavLink
            to="/notifications"
            className="icon-button notification-shortcut"
            aria-label={`Thông báo${notifications.data?.unread_count ? `, ${notifications.data.unread_count} chưa đọc` : ""}`}
          >
            <Bell size={21} />
            {!!notifications.data?.unread_count && (
              <span className="notification-badge">
                {notifications.data.unread_count > 99
                  ? "99+"
                  : notifications.data.unread_count}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/me"
            className="header-profile"
            aria-label="Trang cá nhân"
          >
            <Avatar
              name={profile.data?.full_name}
              url={profile.data?.avatar_url}
            />
            <span>{profile.data?.full_name || "Trang cá nhân"}</span>
          </NavLink>
        </header>
        <aside className="sidebar" aria-label="Điều hướng không gian">
          <div className="sidebar-top">{navigationGroups}</div>
          <div className="sidebar-bottom">
            <div className="workspace-signature">
              <span className="status-dot" />
              Mỗi ngày, thêm một điều hay.
            </div>
            {logoutButton}
          </div>
        </aside>
        {menuOpen && (
          <Modal
            title="Điều hướng SNSQB"
            className="navigation-modal"
            onClose={() => {
              setMenuOpen(false);
              document.getElementById("menu-toggle")?.focus();
            }}
          >
            <nav id="mobile-navigation" aria-label="Điều hướng chính">
              {navigationGroups}
              {logoutButton}
            </nav>
          </Modal>
        )}
        <main className="app-main" id="main-content" tabIndex={-1}>
          <Suspense fallback={<Loading label="Đang mở không gian học tập…" />}>
            <Outlet />
          </Suspense>
        </main>
        <nav className="mobile-dock" aria-label="Truy cập nhanh">
          <NavLink to="/question-bank" aria-label="Đến không gian học tập">
            <BookOpen size={21} />
            <span>Học tập</span>
          </NavLink>
          <NavLink to="/" end aria-label="Đến cộng đồng">
            <House size={21} />
            <span>Cộng đồng</span>
          </NavLink>
          <NavLink to="/chat" aria-label="Mở hộp thư">
            <MessageCircle size={21} />
            <span>Hộp thư</span>
          </NavLink>
          <button
            type="button"
            aria-label="Tất cả mục điều hướng"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={21} />
            <span>Thêm</span>
          </button>
        </nav>
      </div>
    </ChatConnectionProvider>
  );
}
