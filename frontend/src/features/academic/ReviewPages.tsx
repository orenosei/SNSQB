import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { Check, ClipboardCheck, Pencil, X } from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorNotice, Loading } from "../../components/Feedback";
import {
  EmptyState,
  LoadMore,
  QueryError,
} from "../../components/SocialFeedback";
import { errorMessage } from "../../lib/api";
import { routeId, validId } from "../../lib/cursor";
import {
  usePendingReviews,
  useMyClasses,
  getAcademic,
  openReview,
  approveQuestions,
  rejectQuestions,
  completeReview,
  editQuestion,
  refreshAcademic,
  requireResult,
} from "./api";
import { AcademicPage, QuestionContent, StatusBadge } from "./components";
import { DuplicateMatches, RefineQuestion } from "./QuestionActions";
import {
  emptyQuestion,
  QuestionEditor,
  validateQuestion,
  type QuestionDraft,
} from "./QuestionEditor";
import type {
  SessionDetailReviewResponse,
  SessionQuestionReviewDto,
} from "./types";

export function ReviewListPage() {
  const [courseClass, setCourseClass] = useState("");
  const classes = useMyClasses();
  const query = usePendingReviews(routeId(courseClass));
  const sessions = query.data?.pages.flatMap((page) => page.items || []) || [];
  return (
    <AcademicPage>
      <div className="academic-heading">
        <div>
          <h1>Duyệt câu hỏi</h1>
          <p className="muted">
            Góp ý để mỗi câu hỏi trở nên chính xác và hữu ích hơn.
          </p>
        </div>
        <span className="welcome-icon">
          <ClipboardCheck size={26} />
        </span>
      </div>
      <div className="surface academic-filters">
        <label>
          Lớp học phần
          <select
            value={courseClass}
            onChange={(event) => setCourseClass(event.target.value)}
          >
            <option value="">Tất cả lớp được phân công</option>
            {classes.data?.map((item) => (
              <option key={item.course_class_id} value={item.course_class_id}>
                {item.class_code} · {item.subject_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {classes.error && (
        <QueryError
          error={classes.error}
          retry={() => void classes.refetch()}
        />
      )}
      {query.isPending ? (
        <Loading label="Đang tải phiên chờ duyệt…" />
      ) : (
        <>
          {!sessions.length && !query.error && (
            <EmptyState
              title="Chưa có phiên chờ duyệt"
              description="Các phiên phù hợp sẽ xuất hiện tại đây khi sinh viên gửi đề xuất."
            />
          )}
          <div className="bank-grid">
            {sessions.map((session, index) => (
              <article
                className="surface collection-card"
                key={session.session_id || index}
              >
                <StatusBadge value={session.status} />
                <h2>{session.title || `Phiên #${session.session_id}`}</h2>
                <p>{session.content}</p>
                <div className="collection-footer">
                  <span>
                    {session.author?.full_name} · {session.topic}
                  </span>
                  {validId(session.session_id) && (
                    <Link
                      className="text-button"
                      to={`/lecturer/reviews/${session.session_id}`}
                    >
                      Xem phiên →
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          {query.error && (
            <QueryError
              error={query.error}
              retry={() => void query.refetch()}
            />
          )}
          <LoadMore
            hasNext={!!query.hasNextPage}
            pending={query.isFetchingNextPage}
            load={() => void query.fetchNextPage()}
          />
        </>
      )}
    </AcademicPage>
  );
}
export function ReviewDetailPage() {
  const { sessionId } = useParams();
  const id = routeId(sessionId);
  return id ? (
    <ReviewSession key={id} id={id} />
  ) : (
    <AcademicPage>
      <ErrorNotice message="Mã phiên duyệt không hợp lệ." />
    </AcademicPage>
  );
}
function ReviewSession({ id }: { id: number }) {
  const client = useQueryClient();
  const [questionTool, setQuestionTool] = useState<{
    id: number;
    type: "matches" | "ai";
  }>();
  const [review, setReview] = useState<SessionDetailReviewResponse>();
  const [selected, setSelected] = useState<number[]>([]);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<"approve" | "reject" | "complete">();
  const [completed, setCompleted] = useState(false);
  const [editing, setEditing] = useState<SessionQuestionReviewDto>();
  const open = useMutation({
    mutationFn: () => openReview(id!),
    onSuccess: (result) => {
      const data = requireResult(result);
      setReview(data);
      setCompleted(data.session_status === "RESOLVED");
    },
  });
  const action = useMutation({
    mutationFn: async (kind: "approve" | "reject" | "complete") => {
      if (kind === "approve") await approveQuestions(selected);
      else if (kind === "reject") await rejectQuestions(selected, reason);
      else await completeReview(id!);
      return kind;
    },
    onSuccess: async (kind) => {
      setReview((current) =>
        current
          ? {
              ...current,
              items: current.items?.map((question) =>
                (kind === "complete" && question.status === "PENDING") ||
                (kind !== "complete" &&
                  validId(question.question_id) &&
                  selected.includes(question.question_id))
                  ? {
                      ...question,
                      status: kind === "approve" ? "APPROVED" : "REJECTED",
                    }
                  : question,
              ),
            }
          : current,
      );
      setSelected([]);
      setConfirm(undefined);
      if (kind === "complete") setCompleted(true);
      await refreshAcademic(client);
    },
  });
  if (!id)
    return (
      <AcademicPage>
        <ErrorNotice message="Mã phiên duyệt không hợp lệ." />
      </AcademicPage>
    );
  const pending =
    review?.items?.filter((question) => question.status === "PENDING") || [];
  return (
    <AcademicPage>
      <Link className="back-link" to="/lecturer/reviews">
        ← Danh sách chờ duyệt
      </Link>
      <div className="academic-heading">
        <div>
          <h1>Duyệt phiên #{id}</h1>
        </div>
      </div>
      {!review ? (
        <div className="surface review-start">
          <ClipboardCheck size={42} />
          <h2>Sẵn sàng bắt đầu duyệt?</h2>
          <p>
            Mở phiên sẽ chuyển phiên sang trạng thái đang duyệt. Vui lòng chỉ mở
            khi bạn sẵn sàng xử lý.
          </p>
          <button
            className="button button-primary"
            disabled={open.isPending}
            onClick={() => open.mutate()}
          >
            {open.isPending ? "Đang mở phiên…" : "Mở phiên và bắt đầu duyệt"}
          </button>
          {open.isError && <ErrorNotice message={errorMessage(open.error)} />}
        </div>
      ) : (
        <>
          {!!review.duplicate_warnings?.length && (
            <div className="notice review-warnings" role="status">
              <div>
                <strong>Cảnh báo trùng lặp từ hệ thống</strong>
                {review.duplicate_warnings.map((warning, index) => (
                  <p key={index}>
                    Câu{" "}
                    {warning.question_index === undefined
                      ? "—"
                      : warning.question_index + 1}{" "}
                    · Tương đồng với #{warning.similar_question_id} ·{" "}
                    {warning.similarity_score === undefined
                      ? "Chưa có tỷ lệ"
                      : new Intl.NumberFormat("vi-VN", {
                          style: "percent",
                        }).format(warning.similarity_score)}{" "}
                    · {warning.tier}
                    <br />
                    {warning.matched_snippet || warning.matched_snipet}
                  </p>
                ))}
              </div>
            </div>
          )}
          {review.quality_warning && (
            <p className="notice">{review.quality_warning}</p>
          )}
          {action.isSuccess && action.data === "approve" && (
            <p className="notice notice-success" role="status">
              Đã ghi quyết định phê duyệt.
            </p>
          )}
          {completed && (
            <div className="notice notice-success" role="status">
              Đã chốt hoàn tất duyệt phiên. Các câu còn chờ đã được từ chối theo
              quy tắc của máy chủ.
            </div>
          )}
          <div className="question-stack">
            {review.items?.map((question, index) => (
              <article
                className="surface question-detail"
                key={question.question_id || index}
              >
                <div className="review-question-heading">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      aria-label={`Chọn câu ${index + 1} để duyệt`}
                      disabled={
                        completed ||
                        action.isPending ||
                        !validId(question.question_id) ||
                        !["PENDING", "APPROVED", "REJECTED"].includes(
                          question.status || "",
                        ) ||
                        !!editing
                      }
                      checked={
                        validId(question.question_id) &&
                        selected.includes(question.question_id)
                      }
                      onChange={(event) =>
                        setSelected((items) =>
                          event.target.checked
                            ? [...items, question.question_id!]
                            : items.filter(
                                (item) => item !== question.question_id,
                              ),
                        )
                      }
                    />
                    <strong>Câu {index + 1}</strong>
                  </label>
                  <StatusBadge value={question.status} />
                </div>
                <QuestionContent
                  content={question.content}
                  images={question.image_urls}
                  options={question.options}
                  reveal
                />
                <div className="answer-feedback">
                  <p>
                    {question.correct_answer
                      ? `Đáp án tác giả: ${question.correct_answer}`
                      : "Các phương án đúng được đánh dấu trong bản biên tập."}
                  </p>
                  <p>{question.explanation}</p>
                </div>
                {question.edit_log && (
                  <p className="academic-help">
                    Chỉnh sửa gần nhất:{" "}
                    {question.edit_log.actor_name ||
                      question.edit_log.actor_type}{" "}
                    · {question.edit_log.status}
                  </p>
                )}
                {id && validId(question.question_id) && (
                  <div className="invite-actions">
                    <button
                      className="button button-secondary"
                      onClick={() =>
                        setQuestionTool({
                          id: question.question_id!,
                          type: "matches",
                        })
                      }
                    >
                      Xem đối sánh
                    </button>
                    {!completed && (
                      <button
                        className="button button-secondary"
                        onClick={() =>
                          setQuestionTool({
                            id: question.question_id!,
                            type: "ai",
                          })
                        }
                      >
                        Tinh chỉnh bằng AI
                      </button>
                    )}
                  </div>
                )}
                {!completed && (
                  <button
                    className="button button-secondary"
                    disabled={action.isPending || !!editing}
                    onClick={() => setEditing(question)}
                  >
                    <Pencil size={15} />
                    Biên tập câu {index + 1}
                  </button>
                )}
              </article>
            ))}
          </div>
          {id && questionTool?.type === "matches" && (
            <DuplicateMatches
              canRetry={
                !completed &&
                review.items?.find(
                  (item) => item.question_id === questionTool.id,
                )?.can_retry_duplicate_check === true
              }
              sessionId={id}
              questionId={questionTool.id}
              onClose={() => setQuestionTool(undefined)}
            />
          )}
          {questionTool?.type === "ai" && (
            <RefineQuestion
              questionId={questionTool.id}
              onClose={() => setQuestionTool(undefined)}
              onApplied={(suggestion) => {
                setReview(
                  (current) =>
                    current && {
                      ...current,
                      items: current.items?.map((item) =>
                        item.question_id === questionTool.id
                          ? {
                              ...item,
                              content: suggestion.content,
                              options: suggestion.options,
                              explanation: suggestion.explanation,
                              correct_answer: suggestion.options
                                ?.filter((option) => option.is_correct)
                                .map((option) => option.key)
                                .join(", "),
                            }
                          : item,
                      ),
                    },
                );
              }}
            />
          )}
          {!review.items?.length && (
            <EmptyState
              title="Phiên chưa có câu hỏi để duyệt"
              description="Máy chủ chưa trả về danh sách câu hỏi. Hãy trở lại danh sách phiên."
            />
          )}
          {!completed && !!review.items?.length && (
            <div className="surface review-actions">
              <p>
                Đã chọn {selected.length} câu. Còn {pending.length} câu đang chờ
                xử lý.
              </p>
              <label>
                Lý do từ chối (tùy chọn)
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={action.isPending}
                  rows={2}
                />
              </label>
              <div className="inline-actions">
                <button
                  className="button button-primary"
                  disabled={!selected.length || action.isPending || !!editing}
                  onClick={() => {
                    action.reset();
                    setConfirm("approve");
                  }}
                >
                  <Check size={16} />
                  Duyệt câu đã chọn
                </button>
                <button
                  className="button button-secondary"
                  disabled={!selected.length || action.isPending || !!editing}
                  onClick={() => {
                    action.reset();
                    setConfirm("reject");
                  }}
                >
                  <X size={16} />
                  Từ chối câu đã chọn
                </button>
                <button
                  className="button button-secondary"
                  disabled={action.isPending || !!editing}
                  onClick={() => {
                    action.reset();
                    setConfirm("complete");
                  }}
                >
                  Chốt hoàn tất duyệt
                </button>
              </div>
            </div>
          )}
          {!completed && review.items?.length && pending.length === 0 ? (
            <p className="notice notice-success">
              Không còn câu hỏi chờ xử lý. Chọn chốt phiên để khóa các quyết
              định.
            </p>
          ) : null}
          {editing && (
            <LecturerQuestionEditor
              key={editing.question_id}
              question={editing}
              subjectId={review.subject_id}
              onCancel={() => setEditing(undefined)}
              onSaved={(updated) => {
                setReview((current) =>
                  current
                    ? {
                        ...current,
                        items: current.items?.map((question) =>
                          question.question_id === updated.question_id
                            ? updated
                            : question,
                        ),
                      }
                    : current,
                );
                setSelected((items) =>
                  items.filter((id) => id !== updated.question_id),
                );
                setEditing(undefined);
              }}
            />
          )}
        </>
      )}
      {confirm && (
        <ConfirmDialog
          title={
            confirm === "complete"
              ? "Chốt hoàn tất duyệt?"
              : confirm === "approve"
                ? "Phê duyệt các câu đã chọn?"
                : "Từ chối các câu đã chọn?"
          }
          description={
            confirm === "complete"
              ? "Tất cả câu hỏi còn PENDING sẽ tự động bị từ chối (REJECTED), phiên chuyển sang RESOLVED và thông báo cho tác giả. Hành động này không thể hoàn tác tại đây."
              : confirm === "approve"
                ? "Quyết định phê duyệt có hiệu lực với ngân hàng câu hỏi và điểm thưởng sau khi chốt phiên."
                : "Các câu đã chọn sẽ bị từ chối. Hãy kiểm tra lý do trước khi xác nhận."
          }
          confirmLabel={
            confirm === "complete" ? "Chốt và từ chối câu còn chờ" : "Xác nhận"
          }
          pending={action.isPending}
          error={action.isError ? errorMessage(action.error) : undefined}
          onClose={() => setConfirm(undefined)}
          onConfirm={() => action.mutate(confirm)}
        />
      )}
    </AcademicPage>
  );
}
function LecturerQuestionEditor({
  question,
  subjectId,
  onSaved,
  onCancel,
}: {
  question: SessionQuestionReviewDto;
  subjectId?: number;
  onSaved: (question: SessionQuestionReviewDto) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<QuestionDraft>(() => ({
    ...emptyQuestion(),
    content: question.content || "",
    explanation: question.explanation || "",
    options:
      question.options?.map((option) => ({
        ...option,
        is_correct: option.is_correct ?? option.key === question.correct_answer,
      })) || [],
  }));
  const [topic, setTopic] = useState(
    question.topic_id ? String(question.topic_id) : "",
  );
  const topics = useQuery({
    queryKey: ["academic", "topics", subjectId],
    enabled: validId(subjectId),
    queryFn: ({ signal }) =>
      getAcademic<{ id: number; name: string; active?: boolean }[]>(
        `/subjects/${subjectId}/topics`,
        undefined,
        signal,
      ),
  });
  const topicChanged =
    topic !== (question.topic_id ? String(question.topic_id) : "");
  const [autoApprove, setAutoApprove] = useState(false);
  const [validation, setValidation] = useState("");
  const [confirm, setConfirm] = useState(false);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      editQuestion(question.question_id!, {
        content: draft.content,
        options: draft.options,
        explanation: draft.explanation,
        auto_approve: autoApprove,
        ...(topicChanged
          ? topic
            ? { topic_id: Number(topic) }
            : { clear_topic: true }
          : {}),
      }),
    onSuccess: async (result) => {
      await refreshAcademic(client);
      onSaved({
        ...question,
        correct_answer: undefined,
        ...(topicChanged
          ? {
              topic_id: Number(topic) || null,
              topic_name: topics.data?.find((item) => item.id === Number(topic))
                ?.name,
            }
          : {}),
        content: draft.content,
        options: draft.options,
        explanation: draft.explanation,
        status: result?.status || (autoApprove ? "APPROVED" : question.status),
      });
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const message = validateQuestion(draft);
    setValidation(message);
    if (message) return;
    if (autoApprove) setConfirm(true);
    else mutation.mutate();
  }
  return (
    <form
      className="surface lecturer-question-editor"
      onSubmit={submit}
      aria-label="Biên tập câu hỏi"
    >
      <h2>Biên tập câu hỏi #{question.question_id}</h2>
      {subjectId && (
        <label>
          Chủ đề câu hỏi
          <select
            value={topic}
            disabled={topics.isPending || topics.isError || mutation.isPending}
            onChange={(event) => setTopic(event.target.value)}
          >
            <option value="">Chưa phân loại</option>
            {question.topic_id &&
              !topics.data?.some(
                (item) =>
                  item.id === question.topic_id && item.active !== false,
              ) && (
                <option value={question.topic_id}>
                  {question.topic_name || "Chủ đề hiện tại"}
                </option>
              )}
            {topics.data
              ?.filter((item) => item.active !== false)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
      )}
      {topics.isError && (
        <QueryError error={topics.error} retry={() => void topics.refetch()} />
      )}
      <QuestionEditor
        compact
        value={draft}
        onChange={setDraft}
        disabled={mutation.isPending}
      />
      <label className="check-label">
        <input
          type="checkbox"
          checked={autoApprove}
          disabled={mutation.isPending}
          onChange={(event) => setAutoApprove(event.target.checked)}
        />
        Tự động duyệt sau khi lưu
      </label>
      {validation && <ErrorNotice message={validation} />}
      {mutation.isError && !confirm && (
        <ErrorNotice message={errorMessage(mutation.error)} />
      )}
      <div className="form-actions">
        <button
          type="button"
          className="button button-secondary"
          disabled={mutation.isPending}
          onClick={onCancel}
        >
          Hủy biên tập
        </button>
        <button
          className="button button-primary"
          disabled={mutation.isPending || !validId(question.question_id)}
        >
          Lưu câu hỏi
        </button>
      </div>
      {confirm && (
        <ConfirmDialog
          title="Lưu và duyệt câu hỏi?"
          description="Quyết định phê duyệt được ghi ngay sau khi lưu. Câu hỏi vào ngân hàng sau khi chốt phiên."
          confirmLabel="Lưu và duyệt"
          pending={mutation.isPending}
          error={mutation.isError ? errorMessage(mutation.error) : undefined}
          onClose={() => setConfirm(false)}
          onConfirm={() => mutation.mutate()}
        />
      )}
    </form>
  );
}
