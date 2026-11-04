import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { api, errorMessage, type ApiEnvelope, unwrap } from "../../lib/api";
import { ErrorNotice } from "../../components/Feedback";
import { Modal } from "../../components/Modal";

type Target = "POST" | "USER" | "COMMENT";
type Reason = "HARASSMENT" | "HATE_STATEMENT" | "SPAM" | "OTHER";
async function createReport(payload: {
  target_type: Target;
  target_id: number;
  violation_type: Reason;
  description?: string;
}) {
  return unwrap(
    await api.post<ApiEnvelope<{ report_id?: number }>>("/report", payload),
  );
}
export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: Target;
  targetId: number;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("SPAM");
  const [description, setDescription] = useState("");
  const report = useMutation({
    mutationFn: createReport,
    onSuccess: () => setOpen(false),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (report.isPending) return;
    if (description.length > 500) return;
    report.mutate({
      target_type: targetType,
      target_id: targetId,
      violation_type: reason,
      ...(description.trim() ? { description: description.trim() } : {}),
    });
  }
  return (
    <>
      <button
        className="text-button report-trigger"
        onClick={() => { report.reset(); setOpen(true); }}
      >
        <Flag size={15} /> Báo cáo
      </button>
      {report.isSuccess && (
        <span role="status" className="muted">
          Đã gửi báo cáo
        </span>
      )}
      {open && (
        <Modal title="Báo cáo vi phạm" className="report-dialog" pending={report.isPending} onClose={() => setOpen(false)}>
            <p className="muted">
              Cho chúng tôi biết lý do bạn báo cáo nội dung này.
            </p>
            <form onSubmit={submit}>
              <fieldset disabled={report.isPending}>
              <label>
                Lý do
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as Reason)}
                >
                  <option value="SPAM">Nội dung rác</option>
                  <option value="HARASSMENT">Quấy rối</option>
                  <option value="HATE_STATEMENT">Phát ngôn thù ghét</option>
                  <option value="OTHER">Khác</option>
                </select>
              </label>
              <label>
                Mô tả thêm
                <textarea
                  value={description}
                  maxLength={500}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              {report.isError && (
                <ErrorNotice message={errorMessage(report.error)} />
              )}
              <div className="report-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={report.isPending}
                  onClick={() => setOpen(false)}
                >
                  Hủy
                </button>
                <button
                  className="button button-primary"
                  disabled={report.isPending}
                >
                  Gửi báo cáo
                </button>
              </div>
              </fieldset>
            </form>
        </Modal>
      )}
    </>
  );
}
