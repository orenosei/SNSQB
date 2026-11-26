import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/Modal";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { QueryError } from "../../components/SocialFeedback";
import { api, type ApiEnvelope, errorMessage, unwrap } from "../../lib/api";
import { validId } from "../../lib/cursor";
import { getAcademic } from "./api";
import { QuestionContent } from "./components";
import type { QuestionOption } from "./types";

type QuestionPreview = {
  question_id?: number;
  content?: string;
  image_urls?: string[];
  options?: QuestionOption[];
  explanation?: string;
  refusal_reason?: string;
};
type Proposal = {
  edit_log_id?: number;
  suggested_question?: QuestionPreview;
  hallucination_audit?: {
    is_hallucinated?: boolean;
    confidence_score?: number;
    violations?: { type?: string; detail?: string; severity?: string }[];
  };
};

export function QuestionReport({ questionId }: { questionId: number }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const report = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.put<ApiEnvelope<unknown>>(`/questions/${questionId}/report`, {
          description: description.trim(),
        }),
      ),
    onSuccess: () => setOpen(false),
  });
  return (
    <>
      <button
        type="button"
        className="button button-secondary"
        onClick={() => {
          report.reset();
          setOpen(true);
        }}
      >
        Báo lỗi câu hỏi
      </button>
      {report.isSuccess && <p role="status">Đã lưu báo lỗi.</p>}
      {open && (
        <Modal
          title="Báo lỗi câu hỏi"
          pending={report.isPending}
          onClose={() => setOpen(false)}
        >
          <form
            className="rewards-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (description.trim() && !report.isPending) report.mutate();
            }}
          >
            <label>
              Mô tả lỗi{" "}
              <textarea
                rows={4}
                maxLength={500}
                required
                disabled={report.isPending}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <button
              className="button button-primary"
              disabled={!description.trim() || report.isPending}
            >
              Gửi báo lỗi
            </button>
            {report.isError && (
              <ErrorNotice message={errorMessage(report.error)} />
            )}
          </form>
        </Modal>
      )}
    </>
  );
}

export function DuplicateMatches({
  sessionId,
  questionId,
  canRetry,
  onClose,
}: {
  sessionId: number;
  questionId: number;
  canRetry: boolean;
  onClose: () => void;
}) {
  const matches = useQuery({
    queryKey: ["academic", "duplicate-matches", sessionId, questionId],
    queryFn: ({ signal }) =>
      getAcademic<QuestionPreview[]>(
        `/lecturer/sessions/${sessionId}/questions/${questionId}/duplicate-matches`,
        undefined,
        signal,
      ),
  });
  const retry = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post<ApiEnvelope<unknown>>(
          `/lecturer/questions/${questionId}/retry-duplicate-check`,
        ),
      ),
    onSuccess: () => matches.refetch(),
  });
  return (
    <Modal title="Đối sánh câu hỏi" onClose={onClose} pending={retry.isPending}>
      {canRetry && (
        <button
          className="button button-secondary"
          disabled={retry.isPending}
          onClick={() => retry.mutate()}
        >
          Yêu cầu dò trùng lại
        </button>
      )}
      {retry.isSuccess && <p role="status">Đã gửi yêu cầu dò trùng.</p>}
      {retry.isError && <ErrorNotice message={errorMessage(retry.error)} />}
      {matches.isPending && <Loading label="Đang tải câu đối sánh…" />}
      {matches.isError && (
        <QueryError
          error={matches.error}
          retry={() => void matches.refetch()}
        />
      )}
      {matches.isSuccess && !matches.data?.length && (
        <p>Chưa có câu đối sánh.</p>
      )}
      {matches.data?.map((item, index) => (
        <article
          className="surface rewards-panel"
          key={item.question_id || index}
        >
          <QuestionContent
            content={item.content}
            images={item.image_urls}
            options={item.options}
            reveal
          />
          {item.explanation && <p>{item.explanation}</p>}
        </article>
      ))}
    </Modal>
  );
}

export function RefineQuestion({
  questionId,
  onClose,
  onApplied,
}: {
  questionId: number;
  onClose: () => void;
  onApplied: (question: QuestionPreview) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const client = useQueryClient();
  const propose = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post<ApiEnvelope<Proposal>>(
          `/questions/${questionId}/ai-refine`,
          { prompt: prompt.trim() },
          { timeout: 90000 },
        ),
      ),
  });
  const proposal = propose.data;
  const resolve = useMutation({
    mutationFn: async (approve: boolean) =>
      unwrap(
        await api.post<ApiEnvelope<unknown>>(
          `/questions/${questionId}/ai-apply`,
          {
            edit_log_id: proposal?.edit_log_id,
            approve,
            audit_acknowledged: acknowledged,
          },
        ),
      ),
    onSuccess: async (_data, applied) => {
      if (applied && proposal?.suggested_question)
        onApplied(proposal.suggested_question);
      await client.invalidateQueries({ queryKey: ["academic"] });
      onClose();
    },
  });
  const busy = propose.isPending || resolve.isPending;
  const audit = proposal?.hallucination_audit;
  const suggestion = proposal?.suggested_question;
  return (
    <Modal title="Tinh chỉnh câu hỏi bằng AI" onClose={onClose} pending={busy}>
      <form
        className="rewards-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && prompt.trim()) {
            setAcknowledged(false);
            propose.mutate();
          }
        }}
      >
        <label>
          Yêu cầu tinh chỉnh{" "}
          <textarea
            required
            rows={3}
            maxLength={1000}
            disabled={busy}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        <button
          className="button button-primary"
          disabled={busy || !prompt.trim()}
        >
          {propose.isPending ? "Đang tạo đề xuất…" : "Tạo đề xuất"}
        </button>
      </form>
      {(propose.isError || resolve.isError) && (
        <ErrorNotice message={errorMessage(resolve.error || propose.error)} />
      )}
      {suggestion?.refusal_reason && <p>{suggestion.refusal_reason}</p>}
      {suggestion?.content && (
        <section className="surface rewards-panel">
          <h3>Bản đề xuất</h3>
          <QuestionContent
            content={suggestion.content}
            options={suggestion.options}
            reveal
          />
          {suggestion.explanation && <p>{suggestion.explanation}</p>}
          {audit?.confidence_score != null && (
            <p>
              Độ tin cậy:{" "}
              {new Intl.NumberFormat("vi-VN", { style: "percent" }).format(
                audit.confidence_score,
              )}
            </p>
          )}
          {audit?.is_hallucinated && (
            <p role="alert">Kiểm định phát hiện nội dung có thể sai.</p>
          )}
          {audit?.violations?.map((item, index) => (
            <p key={index}>
              {item.severity} · {item.detail || item.type}
            </p>
          ))}
          <label className="check-label">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={busy}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            Tôi đã đọc đề xuất và kết quả kiểm định.
          </label>
        </section>
      )}
      {validId(proposal?.edit_log_id) && (
        <div className="invite-actions">
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={() => resolve.mutate(false)}
          >
            Từ chối đề xuất
          </button>
          <button
            className="button button-primary"
            disabled={
              busy ||
              !acknowledged ||
              !suggestion?.content ||
              !!suggestion.refusal_reason
            }
            onClick={() => resolve.mutate(true)}
          >
            Áp dụng đề xuất
          </button>
        </div>
      )}
    </Modal>
  );
}
