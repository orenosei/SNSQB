import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  Users,
} from "lucide-react";
import { Navigate, useNavigate, useLocation } from "react-router";
import { supportedDestination } from "../../lib/notificationTarget";
import { useSurfaceEntrance } from "../../app/useSurfaceEntrance";
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
  const storyRef = useRef<HTMLDivElement>(null);
  useSurfaceEntrance(storyRef, location.pathname);
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
        <div className="story-content" ref={storyRef}>
          <h1>Cùng hỏi.<br />Cùng hiểu.</h1>
          <p>Không gian học tập của sinh viên và giảng viên.</p>
          <ul className="study-index">
            <li><BookOpen size={20} aria-hidden="true" /> Ngân hàng câu hỏi</li>
            <li><GraduationCap size={20} aria-hidden="true" /> Luyện tập theo môn</li>
            <li><Users size={20} aria-hidden="true" /> Trao đổi với cộng đồng</li>
          </ul>
        </div>
      </section>
      <main className="login-main" id="main-content">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="login-form-wrap">
          <h2>Hôm nay, mình học gì?</h2>
          <p className="muted login-description">
            Sử dụng tài khoản do trường hoặc quản trị viên cấp.
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
) : "Đăng nhập"}
            </button>
          </form>
          <div className="account-help">
            <LockKeyhole size={19} aria-hidden="true" />
            <p>Cần hỗ trợ? Hãy liên hệ đơn vị cấp tài khoản.</p>
          </div>
        </div>
        <footer className="login-footer">
          Mạng xã hội ngân hàng câu hỏi sinh viên
        </footer>
      </main>
    </div>
  );
}
