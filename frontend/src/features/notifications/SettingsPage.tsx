import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { api, errorMessage, type ApiEnvelope, unwrap } from "../../lib/api";
import { ErrorNotice, Loading } from "../../components/Feedback";

interface PushSettings {
  push_enabled?: boolean;
  sound_enabled?: boolean;
  vibration_enabled?: boolean;
  categories?: Record<string, { enabled?: boolean; description?: string }>;
  quiet_hours?: { enabled?: boolean; start_time?: string; end_time?: string };
}
async function fetchSettings() {
  return unwrap(await api.get<ApiEnvelope<PushSettings>>("/settings/push"));
}
async function updateSettings(value: PushSettings) {
  return unwrap(
    await api.put<ApiEnvelope<PushSettings>>("/settings/push", value),
  );
}
export function NotificationSettingsPage() {
  const query = useQuery({
    queryKey: ["push-settings"],
    queryFn: fetchSettings,
  });
  if (query.isPending) return <Loading label="Đang tải cài đặt…" />;
  if (query.isError) return <ErrorNotice message={errorMessage(query.error)} />;
  return <PushSettingsForm initial={query.data} />;
}
function PushSettingsForm({ initial }: { initial: PushSettings }) {
  const [settings, setSettings] = useState<PushSettings>(initial);
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["push-settings"] }),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate(settings);
  }
  return (
    <div className="social-page settings-page">
      <Link to="/notifications" className="back-link">
        ← Thông báo
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow text-brand">TÙY CHỌN CỦA BẠN</p>
          <h1>Cài đặt thông báo</h1>
        </div>
      </div>
      <form className="surface settings-form" onSubmit={submit}>
        {(
          [
            ["push_enabled", "Nhận thông báo đẩy"],
            ["sound_enabled", "Âm thanh"],
            ["vibration_enabled", "Rung"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="settings-toggle">
            <input
              type="checkbox"
              checked={!!settings[key]}
              onChange={(e) =>
                setSettings({ ...settings, [key]: e.target.checked })
              }
            />
            {label}
          </label>
        ))}
        {Object.entries(settings.categories || {}).map(([key, value]) => (
          <label key={key} className="settings-toggle">
            <input
              type="checkbox"
              checked={!!value.enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  categories: {
                    ...settings.categories,
                    [key]: { ...value, enabled: e.target.checked },
                  },
                })
              }
            />
            {value.description || key}
          </label>
        ))}
        <h2>Khung giờ yên tĩnh</h2>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={!!settings.quiet_hours?.enabled}
            onChange={(e) =>
              setSettings({
                ...settings,
                quiet_hours: {
                  ...settings.quiet_hours,
                  enabled: e.target.checked,
                },
              })
            }
          />
          Bật khung giờ yên tĩnh
        </label>
        {settings.quiet_hours?.enabled && (
          <div className="settings-times">
            <label>
              Bắt đầu{" "}
              <input
                type="time"
                value={settings.quiet_hours.start_time || "22:00"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    quiet_hours: {
                      ...settings.quiet_hours,
                      start_time: e.target.value,
                    },
                  })
                }
              />
            </label>
            <label>
              Kết thúc{" "}
              <input
                type="time"
                value={settings.quiet_hours.end_time || "07:00"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    quiet_hours: {
                      ...settings.quiet_hours,
                      end_time: e.target.value,
                    },
                  })
                }
              />
            </label>
          </div>
        )}
        {save.isError && <ErrorNotice message={errorMessage(save.error)} />}{" "}
        {save.isSuccess && (
          <p role="status" className="notice notice-success">
            Đã lưu cài đặt.
          </p>
        )}
        <button className="button button-primary" disabled={save.isPending}>
          Lưu cài đặt
        </button>
      </form>
    </div>
  );
}
