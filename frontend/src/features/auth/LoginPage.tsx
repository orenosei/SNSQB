import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Layers,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
  Users,
} from "lucide-react";
import { Navigate, useNavigate, useLocation } from "react-router";
import { supportedDestination } from "../../lib/notificationTarget";
import { Brand } from "../../components/Brand";
import { ErrorNotice } from "../../components/Feedback";
import { errorMessage, requireTokens } from "../../lib/api";
import { login } from "./api";
import { getDeviceId, setSession, useSession } from "./session";

export function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = supportedDestination(typeof location.state?.from === "string" ? location.state.from : undefined) || "/me";
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const mutation = useMutation({
    mutationFn: async () =>
      requireTokens(
        await login({
          email: email.trim(),
          password,
          device_id: getDeviceId(),
          platform: "WEB",
        }),
      ),
    onSuccess: (tokens) => {
      queryClient.clear();
      setSession(tokens);
      navigate(destination, { replace: true });
    },
  });
  if (session.tokens) return <Navigate to={destination} replace />;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const next = {
      email: !email.trim()
        ? "Vui lòng nhập email."
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
          ? "Vui lòng nhập email hợp lệ."
          : undefined,
      password: !password ? "Vui lòng nhập mật khẩu." : undefined,
    };
    setErrors(next);
    mutation.reset();
    if (next.email || next.password) {
      (next.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="login-page">
      <section className="login-story" aria-label="Giới thiệu SNSQB">
        <Brand light />
        <div className="story-content">
          <div className="eyebrow story-eyebrow">
            <span className="status-dot" /> KHÔNG GIAN HỌC TẬP CỦA CHÚNG MÌNH
          </div>
          <h1>
            Tri thức tốt hơn
            <br />
            khi được <span>sẻ chia.</span>
          </h1>
          <p>
            Kết nối với bạn học, chia sẻ câu hỏi và cùng nhau tiến bộ mỗi ngày.
          </p>
          <div className="study-illustration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="floating-icon icon-users">
              <Users size={27} />
            </div>
            <div className="floating-icon icon-sparkles">
              <Sparkles size={26} />
            </div>
            <div className="study-card card-back">
              <Layers size={30} />
              <div className="decor-line" />
              <div className="decor-line short" />
            </div>
            <div className="study-card card-front">
              <span className="study-card-label">
                <BookOpen size={16} /> HỌC CÙNG NHAU
              </span>
              <strong>
                Mỗi câu hỏi,
                <br />
                một góc nhìn mới.
              </strong>
              <div className="study-answer">
                <span>
                  <Check size={15} />
                </span>{" "}
                Hiểu sâu hơn mỗi ngày
              </div>
              <div className="card-progress">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="study-caption">
              <GraduationCap size={19} /> Từ sinh viên, dành cho sinh viên
            </div>
          </div>
        </div>
        <div className="story-footer">
          <span>Một cộng đồng. Nhiều điều để học.</span>
          <span>EST. 2026</span>
        </div>
      </section>
      <main className="login-main" id="main-content">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="login-form-wrap">
          <span className="welcome-icon">
            <GraduationCap size={29} />
          </span>
          <p className="eyebrow text-brand">CHÀO MỪNG TRỞ LẠI</p>
          <h2>Hôm nay, mình học gì?</h2>
          <p className="muted login-description">
            Đăng nhập để bắt đầu hành trình của bạn.
          </p>
          {session.notice && (
            <div className="notice" role="status">
              {session.notice}
            </div>
          )}
          <form
            onSubmit={submit}
            noValidate
            aria-label="Đăng nhập"
            className="login-form"
          >
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                ref={emailRef}
                id="email"
                type="email"
                autoComplete="username"
                placeholder="tenban@sis.hust.edu.vn"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                disabled={mutation.isPending}
              />
              {errors.email && (
                <p id="email-error" className="field-error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>
            <div className="field">
              <label htmlFor="password">Mật khẩu</label>
              <div className="password-input">
                <input
                  ref={passwordRef}
                  id="password"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  disabled={mutation.isPending}
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={visible}
                >
                  {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="field-error" role="alert">
                  {errors.password}
                </p>
              )}
            </div>
            {mutation.isError && (
              <ErrorNotice message={errorMessage(mutation.error)} />
            )}
            <button
              className="button button-primary login-submit"
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? (
                <>
                  <LoaderCircle size={19} className="animate-spin" /> Đang đăng
                  nhập…
                </>
              ) : (
                <>
                  Đăng nhập <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>
          <div className="account-help">
            <LockKeyhole size={19} aria-hidden="true" />
            <p>
              Tài khoản được nhà trường hoặc quản trị viên cung cấp. Nếu cần hỗ
              trợ đăng nhập, hãy liên hệ đơn vị cấp tài khoản.
            </p>
          </div>
          <div className="login-bottom">
            <span className="small-divider" />
            <span>Cùng nhau học tốt hơn</span>
            <span className="small-divider" />
          </div>
        </div>
        <footer className="login-footer">
          SNSQB <span>·</span> Mạng xã hội ngân hàng câu hỏi sinh viên
        </footer>
      </main>
    </div>
  );
}
