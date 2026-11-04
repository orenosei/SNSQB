import {
  Award,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  School,
  ShieldCheck,
  Sparkles,
  Users,
  UserRound,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { Avatar, imageUrl } from "../../components/Avatar";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { errorMessage } from "../../lib/api";
import { useProfile } from "./api";

const roleNames = {
  STUDENT: "Sinh viên",
  LECTURER: "Giảng viên",
  ADMIN: "Quản trị viên",
};
const valueOrEmpty = (value?: number) =>
  value === undefined || value === null
    ? "—"
    : new Intl.NumberFormat("vi-VN").format(value);
function dateLabel(value?: string) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "Chưa cập nhật"
    : new Intl.DateTimeFormat("vi-VN").format(date);
}

export function ProfilePage() {
  const { data: profile, isPending, error, refetch, isFetching } = useProfile();
  const location = useLocation();
  if (isPending) return <Loading />;
  if (error || !profile)
    return (
      <div className="page-error">
        <ErrorNotice message={errorMessage(error)} />
        <button
          className="button button-secondary"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          Thử lại
        </button>
      </div>
    );
  const cover = imageUrl(profile.cover_url);

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <p className="eyebrow text-brand">KHÔNG GIAN CÁ NHÂN</p>
          <h1>Hồ sơ của bạn</h1>
        </div>
        <span className="heading-tag">
          <span className="status-dot" /> Cùng nhau học tốt hơn
        </span>
      </div>
      {location.state?.saved && (
        <div className="notice notice-success" role="status">
          <Check size={19} /> Đã cập nhật hồ sơ của bạn.
        </div>
      )}
      <section className="profile-hero surface" aria-label="Hồ sơ cá nhân">
        <div
          className="profile-cover"
          style={
            cover
              ? {
                  backgroundImage: `linear-gradient(90deg, rgba(77,15,30,.3), transparent), url(${JSON.stringify(cover)})`,
                }
              : undefined
          }
        >
          <div className="cover-copy">
            <BookOpen size={26} />
            <span>
              Chia sẻ điều bạn biết.
              <br />
              <strong>Khám phá điều bạn chưa biết.</strong>
            </span>
          </div>
          <span className="cover-wordmark" aria-hidden="true">
            snsqb.
          </span>
        </div>
        <div className="profile-identity">
          <Avatar large name={profile.full_name} url={profile.avatar_url} />
          <div className="identity-info">
            <div className="profile-name">
              <h2>{profile.full_name || "Bạn chưa cập nhật họ tên"}</h2>
              {profile.verified && (
                <ShieldCheck
                  size={23}
                  className="verified-icon"
                  aria-label="Đã xác minh"
                />
              )}
            </div>
            <p>
              {profile.role ? roleNames[profile.role] : "Thành viên SNSQB"}
              {profile.class_name && (
                <>
                  <span className="identity-dot">·</span>
                  {profile.class_name}
                </>
              )}
            </p>
          </div>
          <Link
            className="button button-secondary edit-profile"
            to="/settings/profile"
          >
            <Pencil size={16} /> Chỉnh sửa hồ sơ
          </Link>
          <Link className="button button-secondary" to="/settings/password">
            Đổi mật khẩu
          </Link>
        </div>
        <div className="profile-tabs">
          <span aria-current="page">Giới thiệu</span>
          <Link to="/my-posts">Bài viết</Link>
          <Link to="/submissions">Bộ câu hỏi</Link>
          <span className="private-label">
            <ShieldCheck size={15} /> Thông tin tài khoản của bạn
          </span>
        </div>
      </section>
      <div className="profile-columns">
        <div className="profile-primary">
          <section className="surface about-card">
            <div className="section-title">
              <span className="section-icon">
                <UserRound size={20} />
              </span>
              <h2>Một chút về mình</h2>
            </div>
            <p className={profile.bio ? "profile-bio" : "muted profile-bio"}>
              {profile.bio ||
                "Một vài dòng giới thiệu sẽ giúp mọi người hiểu bạn hơn. Bắt đầu bằng điều bạn yêu thích nhé!"}
            </p>
            <div className="about-divider" />
            <dl className="profile-details">
              <div>
                <dt>
                  <Mail size={18} />
                  Email
                </dt>
                <dd>{profile.email || "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt>
                  <CalendarDays size={18} />
                  Ngày sinh
                </dt>
                <dd>{dateLabel(profile.date_of_birth)}</dd>
              </div>
              <div>
                <dt>
                  <Users size={18} />
                  Giới tính
                </dt>
                <dd>
                  {profile.gender === "MALE"
                    ? "Nam"
                    : profile.gender === "FEMALE"
                      ? "Nữ"
                      : "Chưa cập nhật"}
                </dd>
              </div>
              <div>
                <dt>
                  <MapPin size={18} />
                  Múi giờ
                </dt>
                <dd>{profile.timezone || "Chưa cập nhật"}</dd>
              </div>
            </dl>
          </section>
          <section className="surface academic-card">
            <div className="section-title">
              <span className="section-icon">
                <GraduationCap size={21} />
              </span>
              <h2>Thông tin học tập</h2>
            </div>
            <dl className="academic-details">
              <div>
                <dt>Trường / Khoa / Viện</dt>
                <dd>{profile.school_faculty || "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt>Chuyên ngành</dt>
                <dd>{profile.major || "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt>Lớp sinh hoạt</dt>
                <dd>{profile.class_name || "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt>Mã sinh viên / giảng viên</dt>
                <dd>{profile.student_lecturer_code || "Chưa cập nhật"}</dd>
              </div>
            </dl>
            <p className="academic-note">
              <School size={15} /> Thông tin học tập được quản lý bởi nhà
              trường.
            </p>
          </section>
        </div>
        <div className="profile-secondary">
          <section className="surface stats-card">
            <div className="section-title">
              <span className="section-icon">
                <Sparkles size={20} />
              </span>
              <h2>Dấu ấn của bạn</h2>
            </div>
            <div className="stat-grid">
              <div>
                <BookOpen size={20} />
                <strong>
                  {valueOrEmpty(profile.total_proposed_questions)}
                </strong>
                <span>Câu hỏi đề xuất</span>
              </div>
              <div>
                <Award size={20} />
                <strong>{valueOrEmpty(profile.badges_count)}</strong>
                <span>Huy hiệu</span>
              </div>
            </div>
            <div className="points-row">
              <span>Điểm tích lũy</span>
              <strong>{valueOrEmpty(profile.gamification_points)}</strong>
            </div>
          </section>
          <section className="surface connections-card">
            <div className="section-title">
              <span className="section-icon">
                <Users size={20} />
              </span>
              <h2>Kết nối</h2>
            </div>
            <div className="connection-stats">
              <div>
                <strong>{valueOrEmpty(profile.friends_count)}</strong>
                <span>Bạn bè</span>
              </div>
              <div>
                <strong>{valueOrEmpty(profile.followers_count)}</strong>
                <span>Theo dõi bạn</span>
              </div>
              <div>
                <strong>{valueOrEmpty(profile.following_count)}</strong>
                <span>Đang theo dõi</span>
              </div>
            </div>
            <Link to="/friends" className="text-button">
              Xem các kết nối của bạn <ChevronRight size={15} />
            </Link>
          </section>
          <div className="next-card">
            <span className="eyebrow">HÀNH TRÌNH PHÍA TRƯỚC</span>
            <h2>
              Tri thức lớn lên
              <br />
              từ những sẻ chia nhỏ.
            </h2>
            <p>
              Khám phá những chia sẻ mới và kết nối với bạn học trên bảng tin.
            </p>
            <Link className="coming-text" to="/">
              Khám phá bảng tin <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>
      <footer className="app-footer">
        SNSQB <span>·</span> Kết nối tri thức, cùng nhau tiến bộ.
      </footer>
    </div>
  );
}
