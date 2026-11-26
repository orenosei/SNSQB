import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ErrorNotice } from "../../components/Feedback";
import { errorMessage } from "../../lib/api";
import { useProfile } from "../profile/api";
import { pushConfigured } from "./firebaseConfig";

function storedFid(key: string) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

export function WebPushSettings() {
  const id = useProfile().data?.user_id;
  if (!pushConfigured)
    return (
      <p className="muted">
        Thông báo trên trình duyệt cần cấu hình Firebase Web cho bản triển khai
        này.
      </p>
    );
  if (!id) return null;
  return <DevicePushSettings key={id} storageKey={`snsqb.web-push.${id}`} />;
}

function DevicePushSettings({ storageKey }: { storageKey: string }) {
  const [fid, setFid] = useState(() => storedFid(storageKey));
  const supported =
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;
  const change = useMutation({
    mutationFn: async () => {
      const push = await import("./webPush");
      if (!fid) return push.enableWebPush();
      await push.disableWebPush(fid);
      return "";
    },
    onSuccess: (newFid) => {
      setFid(newFid);
      try {
        if (newFid) localStorage.setItem(storageKey, newFid);
        else localStorage.removeItem(storageKey);
      } catch {
        /* Local storage may be disabled. */
      }
    },
  });
  return (
    <section className="surface rewards-panel">
      <h2>Thông báo trên trình duyệt này</h2>
      {supported ? (
        <button
          className="button button-secondary"
          disabled={change.isPending}
          onClick={() => change.mutate()}
        >
          {change.isPending
            ? "Đang cập nhật…"
            : fid
              ? "Gỡ đăng ký thiết bị"
              : "Đăng ký thiết bị nhận thông báo"}
        </button>
      ) : (
        <p>Trình duyệt này chưa hỗ trợ thông báo đẩy.</p>
      )}
      {change.isSuccess && (
        <p role="status">
          {fid ? "Đã đăng ký thiết bị." : "Đã gỡ đăng ký thiết bị."}
        </p>
      )}
      {change.isError && <ErrorNotice message={errorMessage(change.error)} />}
    </section>
  );
}
