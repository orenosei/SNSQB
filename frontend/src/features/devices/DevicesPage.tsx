import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Monitor, Smartphone, RefreshCw, ShieldCheck } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ListSkeleton, StatusNotice } from "../../components/Feedback";
import { EmptyState, QueryError } from "../../components/SocialFeedback";
import { formatTime } from "../../lib/cursor";
import { errorMessage } from "../../lib/api";
import { getDeviceId, setSession } from "../auth/session";
import { changeDevice, useDevices, type Device } from "./api";

export function DevicesPage() {
  const query = useDevices();
  const client = useQueryClient();
  const [browserId] = useState(getDeviceId);
  const [target, setTarget] = useState<{
    device: Device;
    action: "revoke" | "delete";
  }>();
  const [notice, setNotice] = useState("");
  const current = (device: Device) =>
    device.is_current_device === true || device.device_id === browserId;
  const save = useMutation({
    mutationFn: ({ device, action }: NonNullable<typeof target>) =>
      changeDevice(device.device_id!, action),
    onSuccess: async (_result, variables) => {
      setTarget(undefined);
      if (current(variables.device)) {
        await client.cancelQueries();
        setSession(null, "Đã kết thúc phiên trên trình duyệt này.");
        client.clear();
      } else {
        setNotice(
          variables.action === "revoke"
            ? "Máy chủ đã xác nhận thu hồi phiên của thiết bị."
            : "Đã xóa bản ghi thiết bị.",
        );
        await client.invalidateQueries({ queryKey: ["devices"] });
      }
    },
  });
  return (
    <div className="workspace-page">
      <PageHeader
        eyebrow="AN TOÀN TÀI KHOẢN"
        title="Thiết bị đăng nhập"
        description="Xem các thiết bị đã đăng nhập và quản lý quyền truy cập."
        actions={
          <button
            className="button button-secondary"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw size={17} />
            Làm mới
          </button>
        }
      />
      <div className="security-note">
        <ShieldCheck size={24} />
        <p>
          Thu hồi phiên sẽ thu hồi quyền truy cập theo thiết bị. Xóa thiết bị là
          xóa bản ghi thiết bị khỏi tài khoản.
        </p>
      </div>
      {notice && (
        <StatusNotice>{notice}</StatusNotice>
      )}
      {query.isPending ? (
        <ListSkeleton label="Đang tải thiết bị…" />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : !query.data?.devices?.length ? (
        <EmptyState
          title="Chưa có thiết bị hiển thị"
          description="Danh sách thiết bị do máy chủ cung cấp sẽ xuất hiện tại đây."
        />
      ) : (
        <div className="device-grid">
          {query.data.devices.map((device, i) => (
            <article
              key={device.user_device_id || device.device_id || i}
              className="surface device-card"
            >
              <div className="section-title">
                {device.platform === "ANDROID" || device.platform === "IOS" ? (
                  <Smartphone size={25} />
                ) : (
                  <Monitor size={25} />
                )}
                {current(device) && (
                  <span className="academic-badge">Thiết bị hiện tại</span>
                )}
              </div>
              <h2>{device.device_name || device.platform || "Thiết bị"}</h2>
              <p className="muted">
                {device.os_version || "Chưa có thông tin hệ điều hành"}
              </p>
              <p className="device-activity">
                Hoạt động gần nhất: {formatTime(device.last_active_at)}
              </p>
              <p className="muted">
                {device.is_active === true
                  ? "Đang hoạt động"
                  : device.is_active === false
                    ? "Không hoạt động"
                    : "Chưa có trạng thái"}
              </p>
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  disabled={!device.device_id || save.isPending}
                  onClick={() => {
                    save.reset();
                    setTarget({ device, action: "revoke" });
                  }}
                >
                  Thu hồi phiên
                </button>
                <button
                  className="text-button danger-text"
                  disabled={!device.device_id || save.isPending}
                  onClick={() => {
                    save.reset();
                    setTarget({ device, action: "delete" });
                  }}
                >
                  Xóa bản ghi
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {target && (
        <ConfirmDialog
          title={
            target.action === "revoke"
              ? "Thu hồi phiên thiết bị?"
              : "Xóa bản ghi thiết bị?"
          }
          description={`${target.action === "revoke" ? "Máy chủ sẽ thu hồi quyền truy cập của thiết bị được chọn." : "Bản ghi thiết bị sẽ bị xóa vĩnh viễn. Thao tác này khác với thu hồi phiên."}${current(target.device) ? " Bạn cũng sẽ đăng xuất trên trình duyệt này." : ""}`}
          confirmLabel={
            target.action === "revoke" ? "Thu hồi phiên" : "Xóa bản ghi"
          }
          pending={save.isPending}
          error={save.isError ? errorMessage(save.error) : undefined}
          onClose={() => setTarget(undefined)}
          onConfirm={() => save.mutate(target)}
        />
      )}
    </div>
  );
}
