import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import { api, errorMessage, type ApiEnvelope, unwrap } from "../../lib/api";
import { ErrorNotice } from "../../components/Feedback";
async function changePassword(payload: {
  old_password: string;
  new_password: string;
}) {
  return unwrap(
    await api.post<ApiEnvelope<unknown>>("/auth/change-password", payload),
  );
}
export function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [validation, setValidation] = useState("");
  const change = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    setValidation("");
    if (!oldPassword || !newPassword) {
      setValidation("Nhập đầy đủ mật khẩu.");
      return;
    }
    if (newPassword !== confirm) {
      setValidation("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (newPassword === oldPassword) {
      setValidation("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }
    change.mutate({ old_password: oldPassword, new_password: newPassword });
  }
  return (
    <div className="social-page settings-page">
      <Link to="/me" className="back-link">
        ← Hồ sơ
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow text-brand">BẢO MẬT</p>
          <h1>Đổi mật khẩu</h1>
        </div>
      </div>
      <form className="surface settings-form" onSubmit={submit}>
        <label>
          Mật khẩu hiện tại
          <input
            type="password"
            autoComplete="current-password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </label>
        <label>
          Mật khẩu mới
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label>
          Xác nhận mật khẩu mới
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {validation && <ErrorNotice message={validation} />}{" "}
        {change.isError && <ErrorNotice message={errorMessage(change.error)} />}{" "}
        {change.isSuccess && (
          <p role="status" className="notice notice-success">
            Đã đổi mật khẩu thành công.
          </p>
        )}
        <button className="button button-primary" disabled={change.isPending}>
          Đổi mật khẩu
        </button>
      </form>
    </div>
  );
}
