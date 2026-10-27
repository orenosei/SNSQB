import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, LoaderCircle, Pencil } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { errorMessage } from "../../lib/api";
import { profileKey, updateProfile, useProfile } from "./api";
import type { Profile, UpdateProfileRequest } from "./types";

export function EditProfilePage() {
  const profile = useProfile();
  if (profile.isPending) return <Loading />;
  if (profile.error || !profile.data)
    return (
      <div className="page-error">
        <ErrorNotice message={errorMessage(profile.error)} />
        <button
          className="button button-secondary"
          onClick={() => void profile.refetch()}
        >
          Thử lại
        </button>
      </div>
    );
  return <ProfileForm profile={profile.data} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const [form, setForm] = useState({
    full_name: profile.full_name || "",
    bio: profile.bio || "",
    gender: profile.gender || "",
    date_of_birth: profile.date_of_birth || "",
    timezone: profile.timezone || "",
    avatar_url: profile.avatar_url || "",
    cover_url: profile.cover_url || "",
  });
  const [validation, setValidation] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(profileKey, updated);
      navigate("/me", { replace: true, state: { saved: true } });
    },
  });
  function change(key: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setValidation("");
    if (form.timezone) {
      try {
        new Intl.DateTimeFormat("vi-VN", { timeZone: form.timezone });
      } catch {
        setValidation("Múi giờ không hợp lệ. Ví dụ: Asia/Ho_Chi_Minh.");
        document.getElementById("timezone")?.focus();
        return;
      }
    }
    const payload: UpdateProfileRequest = {};
    for (const key of [
      "full_name",
      "bio",
      "avatar_url",
      "cover_url",
      "timezone",
    ] as const) {
      if (form[key] !== (profile[key] || "")) payload[key] = form[key];
    }
    if (form.gender && form.gender !== profile.gender)
      payload.gender = form.gender as "MALE" | "FEMALE";
    if (form.date_of_birth && form.date_of_birth !== profile.date_of_birth)
      payload.date_of_birth = form.date_of_birth;
    if (!Object.keys(payload).length) {
      setValidation("Bạn chưa thay đổi thông tin nào.");
      return;
    }
    mutation.mutate(payload);
  }

  return (
    <div className="page-container edit-container">
      <Link className="back-link" to="/me">
        <ArrowLeft size={17} /> Trở về hồ sơ
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow text-brand">THỂ HIỆN BẢN THÂN</p>
          <h1>Chỉnh sửa hồ sơ</h1>
          <p className="muted mt-2">
            Một vài thông tin để mọi người hiểu bạn hơn.
          </p>
        </div>
        <span className="welcome-icon">
          <Pencil size={25} />
        </span>
      </div>
      <form
        className="surface edit-form"
        onSubmit={submit}
        aria-label="Chỉnh sửa hồ sơ"
      >
        <fieldset disabled={mutation.isPending}>
          <legend>Thông tin cá nhân</legend>
          <div className="field">
            <label htmlFor="full_name">Họ và tên</label>
            <input
              id="full_name"
              autoComplete="name"
              value={form.full_name}
              maxLength={100}
              onChange={(event) => change("full_name", event.target.value)}
            />
            <span className="field-hint">Tối đa 100 ký tự.</span>
          </div>
          <div className="field">
            <label htmlFor="bio">Giới thiệu bản thân</label>
            <textarea
              id="bio"
              value={form.bio}
              maxLength={500}
              rows={4}
              placeholder="Chia sẻ một chút về bạn…"
              onChange={(event) => change("bio", event.target.value)}
            />
            <span className="field-hint text-right">
              {form.bio.length}/500 ký tự
            </span>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="gender">Giới tính</label>
              <select
                id="gender"
                value={form.gender}
                onChange={(event) => change("gender", event.target.value)}
              >
                <option value="" disabled={!!profile.gender}>
                  Chưa cập nhật
                </option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="date_of_birth">Ngày sinh</label>
              <input
                id="date_of_birth"
                type="date"
                autoComplete="bday"
                required={!!profile.date_of_birth}
                value={form.date_of_birth}
                onChange={(event) =>
                  change("date_of_birth", event.target.value)
                }
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="timezone">Múi giờ</label>
            <input
              id="timezone"
              value={form.timezone}
              placeholder="Asia/Ho_Chi_Minh"
              required={!!profile.timezone}
              onChange={(event) => change("timezone", event.target.value)}
            />
            <span className="field-hint">
              Ví dụ: Asia/Ho_Chi_Minh, Asia/Tokyo, Europe/Paris.
            </span>
          </div>
          <div className="form-section-heading">
            <h2>Ảnh hồ sơ</h2>
            <p className="muted text-sm">
              Sử dụng đường dẫn ảnh có sẵn. Tải ảnh lên sẽ được bổ sung sau.
            </p>
          </div>
          {(["avatar_url", "cover_url"] as const).map((key) => (
            <div className="field" key={key}>
              <label htmlFor={key}>
                {key === "avatar_url"
                  ? "Đường dẫn ảnh đại diện"
                  : "Đường dẫn ảnh bìa"}
              </label>
              <input
                id={key}
                type="url"
                pattern="https?://.*"
                placeholder="https://…"
                value={form[key]}
                onChange={(event) => change(key, event.target.value)}
              />
            </div>
          ))}
        </fieldset>
        {validation && <ErrorNotice message={validation} />}
        {mutation.isError && (
          <ErrorNotice message={errorMessage(mutation.error)} />
        )}
        <div className="form-actions">
          <Link
            to="/me"
            className="button button-secondary"
            aria-disabled={mutation.isPending}
            onClick={(event) => {
              if (mutation.isPending) event.preventDefault();
            }}
          >
            Hủy thay đổi
          </Link>
          <button
            type="submit"
            className="button button-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <LoaderCircle size={18} className="animate-spin" /> Đang lưu…
              </>
            ) : (
              <>
                <Check size={18} /> Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
