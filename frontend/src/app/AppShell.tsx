import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronRight,
  FileCheck2,
  GraduationCap,
  House,
  LogOut,
  Menu,
  MessageCircle,
  UserRound,
  Users,
  Search,
  Pencil,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Brand } from "../components/Brand";
import { Avatar } from "../components/Avatar";
import { logout } from "../features/auth/api";
import { setSession } from "../features/auth/session";
import { useProfile } from "../features/profile/api";

const futureModules = [
  { label: "Ngân hàng câu hỏi", icon: BookOpen },
  { label: "Tin nhắn", icon: MessageCircle },
  { label: "Đề thi", icon: FileCheck2 },
];
const socialNavigation = [
  { label: "Bảng tin", icon: House, to: "/" },
  { label: "Bài viết của tôi", icon: Pencil, to: "/my-posts" },
  { label: "Bạn bè", icon: Users, to: "/friends" },
  { label: "Tìm kiếm", icon: Search, to: "/search" },
];

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        document.getElementById("menu-toggle")?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);
  const signOut = useMutation({
    mutationFn: async () => {
      await queryClient.cancelQueries();
      await logout();
    },
    onSettled: (_data, error) => {
      setSession(
        null,
        error
          ? "Đã thoát trên trình duyệt này. Chưa thể xác nhận thu hồi phiên trên máy chủ."
          : "Bạn đã đăng xuất an toàn.",
      );
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header className="app-header">
        <div className="header-start">
          <button
            id="menu-toggle"
            className="icon-button mobile-menu"
            aria-label={menuOpen ? "Đóng điều hướng" : "Mở điều hướng"}
            aria-expanded={menuOpen}
            aria-controls="main-sidebar"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
          <Brand />
        </div>
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
              navigate(`/search?query=${encodeURIComponent(value)}&type=USER`);
          }}
        >
          <Search size={17} />
          <input
            name="query"
            aria-label="Tìm kiếm nhanh"
            placeholder="Tìm bạn học, khám phá chia sẻ…"
            required
          />
          <button
            className="icon-button"
            type="submit"
            aria-label="Thực hiện tìm kiếm"
          >
            <Search size={17} />
          </button>
        </form>
        <NavLink to="/me" className="header-profile" aria-label="Trang cá nhân">
          <Avatar
            name={profile.data?.full_name}
            url={profile.data?.avatar_url}
          />
          <span>{profile.data?.full_name || "Trang cá nhân"}</span>
        </NavLink>
      </header>
      {menuOpen && (
        <button
          className="menu-backdrop"
          aria-label="Đóng menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}
        id="main-sidebar"
      >
        <div className="sidebar-top">
          <p className="eyebrow sidebar-label">KHÔNG GIAN CỦA BẠN</p>
          <nav aria-label="Điều hướng chính">
            {socialNavigation.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={to}
                end={to === "/"}
                to={to}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "nav-active" : ""}`
                }
              >
                <Icon size={21} />
                <span>{label}</span>
              </NavLink>
            ))}
            <NavLink
              to="/me"
              className={({ isActive }) =>
                `nav-item ${isActive || location.pathname === "/settings/profile" ? "nav-active" : ""}`
              }
            >
              <UserRound size={21} />
              <span>Hồ sơ cá nhân</span>
              <ChevronRight size={16} />
            </NavLink>
            <div className="nav-divider" />
            {futureModules.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="nav-item nav-unavailable"
                disabled
                title="Chưa khả dụng — sẽ được triển khai ở giai đoạn sau"
              >
                <Icon size={21} />
                <span>{label}</span>
                <span className="soon-label">Sắp có</span>
              </button>
            ))}
          </nav>
          <p className="nav-note">Các mục “Sắp có” chưa khả dụng.</p>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-promo">
            <span className="promo-icon">
              <GraduationCap size={24} />
            </span>
            <strong>
              Học cùng nhau.
              <br />
              Tiến xa cùng nhau.
            </strong>
            <p>Mỗi góc nhìn đều có giá trị.</p>
          </div>
          <button
            className="nav-item logout-button"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate()}
          >
            <LogOut size={20} />
            <span>{signOut.isPending ? "Đang đăng xuất…" : "Đăng xuất"}</span>
          </button>
          <p className="sidebar-version">
            SNSQB <span>·</span> Phiên bản 0.2
          </p>
        </div>
      </aside>
      <main className="app-main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
