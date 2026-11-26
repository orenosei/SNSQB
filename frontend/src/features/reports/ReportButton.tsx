import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import {
  api,
  ApiError,
  errorMessage,
  type ApiEnvelope,
  unwrap,
} from "../../lib/api";
import { ErrorNotice } from "../../components/Feedback";
import { Modal } from "../../components/Modal";

type Target = "POST" | "USER" | "COMMENT";
type Reason = "HARASSMENT" | "HATE_STATEMENT" | "SPAM" | "OTHER";
async function createReport(
  payload: {
    target_type: Target;
    target_id: number;
    violation_type: Reason;
    description?: string;
  },
  evidenceKey?: string,
) {
  return unwrap(
    await api.post<ApiEnvelope<{ report_id?: number }>>("/report", {
      ...payload,
      ...(evidenceKey ? { evidence_keys: [evidenceKey] } : {}),
    }),
  );
}

async function uploadEvidence(file: File) {
  const body = new FormData();
  body.append("file", file);
  const evidence = unwrap(
    await api.post<ApiEnvelope<{ key?: string }>>("/report/evidence", body, {
      headers: { "Content-Type": undefined },
    }),
  );
  if (!evidence?.key)
    throw new ApiError("Máy chủ chưa trả về mã ảnh bằng chứng.");
  return evidence.key;
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
  const [evidence, setEvidence] = useState<File>();
  const [evidenceError, setEvidenceError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const staged = useRef<{ file: File; key: string; expiresAt: number }>(null);
  const report = useMutation({
    mutationFn: async (payload: Parameters<typeof createReport>[0]) => {
      if (!evidence) return createReport(payload);
      if (
        staged.current?.file !== evidence ||
        staged.current.expiresAt <= Date.now()
      ) {
        staged.current = {
          file: evidence,
          key: await uploadEvidence(evidence),
          expiresAt: Date.now() + 22 * 60 * 60 * 1000,
        };
      }
      return createReport(payload, staged.current.key);
    },
    onSuccess: () => {
      setOpen(false);
      setEvidence(undefined);
      staged.current = null;
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (report.isPending) return;
    if (description.length > 500 || evidenceError) return;
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
        onClick={() => {
          report.reset();
          setEvidence(undefined);
          setEvidenceError("");
          staged.current = null;
          setOpen(true);
        }}
      >
        <Flag size={15} /> Báo cáo
      </button>
      {report.isSuccess && (
        <span role="status" className="muted">
          Đã gửi báo cáo
        </span>
      )}
      {open && (
        <Modal
          title="Báo cáo vi phạm"
          className="report-dialog"
          pending={report.isPending}
          onClose={() => setOpen(false)}
        >
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
              <label>
                Ảnh bằng chứng (tùy chọn, tối đa 5 MiB)
                <input
                  ref={input}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    const invalid =
                      file &&
                      (![
                        "image/png",
                        "image/jpeg",
                        "image/gif",
                        "image/webp",
                      ].includes(file.type) ||
                        file.size < 1 ||
                        file.size > 5 * 1024 * 1024);
                    setEvidence(invalid ? undefined : file);
                    setEvidenceError(
                      invalid
                        ? "Chọn ảnh PNG, JPEG, GIF hoặc WebP tối đa 5 MiB."
                        : "",
                    );
                    if (invalid) event.target.value = "";
                    staged.current = null;
                  }}
                />
              </label>
              {evidence && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setEvidence(undefined);
                    if (input.current) input.current.value = "";
                  }}
                >
                  Bỏ ảnh {evidence.name}
                </button>
              )}
              {evidenceError && <ErrorNotice message={evidenceError} />}
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
