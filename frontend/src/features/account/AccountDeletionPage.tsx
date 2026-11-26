import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { QueryError } from "../../components/SocialFeedback";
import { api, type ApiEnvelope, errorMessage, unwrap } from "../../lib/api";
import { formatTime } from "../../lib/cursor";

type Deletion = { scheduled_for?: string | null; can_cancel?: boolean } | null;
const key = ["account-deletion"] as const;

export function AccountDeletionPage() {
  const [confirming, setConfirming] = useState(false);
  const client = useQueryClient();
  const schedule = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) =>
      unwrap(
        await api.get<ApiEnvelope<Deletion>>("/users/me/deletion", { signal }),
      ) ?? null,
  });
  const change = useMutation({
    mutationFn: async (cancel: boolean) => {
      const response = await api.delete<ApiEnvelope<Deletion>>(
        cancel ? "/users/me/deletion" : "/users/me",
      );
      return unwrap(response);
    },
    onMutate: () => client.cancelQueries({ queryKey: key }),
    onSuccess: (data) => {
      client.setQueryData(key, data ?? null);
      setConfirming(false);
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
  return (
    <div className="social-page rewards-page">
      <Link to="/me" className="back-link">
        ← Hồ sơ cá nhân
      </Link>
      <h1>Xóa tài khoản</h1>
      {schedule.isPending ? (
        <Loading label="Đang kiểm tra lịch xóa…" />
      ) : schedule.isError ? (
        <QueryError
          error={schedule.error}
          retry={() => void schedule.refetch()}
        />
      ) : (
        <section className="surface rewards-panel">
          {schedule.data?.scheduled_for ? (
            <>
              <h2>Đã lên lịch xóa</h2>
              <p>
                Thời điểm dự kiến:{" "}
                <strong>{formatTime(schedule.data.scheduled_for)}</strong>
              </p>
              {schedule.data.can_cancel && (
                <button
                  className="button button-secondary"
                  disabled={change.isPending}
                  onClick={() => change.mutate(true)}
                >
                  Hủy yêu cầu xóa
                </button>
              )}
            </>
          ) : (
            <>
              <p>
                Tài khoản chưa có lịch xóa. Sau khi gửi yêu cầu, bạn vẫn có thể
                sử dụng tài khoản và hủy yêu cầu trước hạn.
              </p>
              <button
                className="button button-secondary"
                disabled={change.isPending}
                onClick={() => {
                  change.reset();
                  setConfirming(true);
                }}
              >
                Yêu cầu xóa tài khoản
              </button>
            </>
          )}
          {change.isError && !confirming && (
            <ErrorNotice message={errorMessage(change.error)} />
          )}
          {change.isSuccess && change.variables && (
            <p role="status">Đã hủy yêu cầu xóa tài khoản.</p>
          )}
        </section>
      )}
      {confirming && (
        <ConfirmDialog
          title="Lên lịch xóa tài khoản"
          description="Tài khoản sẽ bị xóa khi đến hạn. Bạn có thể quay lại trang này để hủy yêu cầu trước thời điểm đó."
          confirmLabel="Xác nhận yêu cầu xóa"
          pending={change.isPending}
          error={change.isError ? errorMessage(change.error) : undefined}
          onConfirm={() => change.mutate(false)}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
