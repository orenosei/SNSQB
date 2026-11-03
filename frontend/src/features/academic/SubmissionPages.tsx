import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorNotice, Loading } from "../../components/Feedback";
import {
  EmptyState,
  LoadMore,
  QueryError,
} from "../../components/SocialFeedback";
import { errorMessage } from "../../lib/api";
import { formatTime, routeId, validId } from "../../lib/cursor";
import type {
  MySubmissionDetailResponse,
  SubmissionSessionSummaryDto,
  ProposeSessionRequest,
  UpdateSubmissionSessionRequest,
} from "./types";
import {
  useSubmissions,
  useSubjects,
  useSubmission,
  useEnrolledCourseClasses,
  proposeSession,
  updateSubmission,
  deleteSubmission,
  refreshAcademic,
} from "./api";
import { AcademicPage, QuestionContent, SubjectSelect } from "./components";
import { DiscussionToggle } from "../posts/DiscussionToggle";
import {
  emptyQuestion,
  imageLines,
  QuestionEditor,
  toDraft,
  validateQuestion,
  type QuestionDraft,
} from "./QuestionEditor";

const submissionStatuses = {
  PENDING: "Chờ duyệt",
  REVIEWING: "Đang duyệt",
  RESOLVED: "Đã xử lý",
};
function submissionContext(session: SubmissionSessionSummaryDto) {
  return [
    session.class_code ? `Lớp ${session.class_code}` : undefined,
    session.semester_name ? `Học kỳ ${session.semester_name}` : undefined,
    session.status ? submissionStatuses[session.status] : "Chưa có trạng thái",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function SubmissionsPage() {
  const [params, setParams] = useSearchParams();
  const subject = params.get("subject") || "";
  const status = params.get("status") || "";
  const subjects = useSubjects();
  const query = useSubmissions(
    routeId(subject),
    ["PENDING", "REVIEWING", "RESOLVED"].includes(status) ? status : undefined,
  );
  const items = query.data?.pages.flatMap((page) => page.contents || []) || [];
  return (
    <AcademicPage>
      <div className="academic-heading">
        <div>
          <p className="eyebrow text-brand">GÓC ĐÓNG GÓP</p>
          <h1>Bộ câu hỏi của tôi</h1>
          <p className="muted">
            Quản lý những điều bạn đã chia sẻ cùng cộng đồng.
          </p>
        </div>
        <Link className="button button-primary" to="/submissions/new">
          <Plus size={17} />
          Tạo bộ câu hỏi
        </Link>
      </div>
      <div className="surface academic-filters">
        <SubjectSelect
          subjects={subjects.data}
          value={subject}
          onChange={(value) =>
            setParams({
              ...(value ? { subject: value } : {}),
              ...(status ? { status } : {}),
            })
          }
        />
        <label className="academic-select">
          Trạng thái
          <select
            aria-label="Trạng thái"
            value={status}
            onChange={(event) =>
              setParams({
                ...(subject ? { subject } : {}),
                ...(event.target.value ? { status: event.target.value } : {}),
              })
            }
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="REVIEWING">Đang duyệt</option>
            <option value="RESOLVED">Đã xử lý</option>
          </select>
        </label>
      </div>
      {subjects.error && (
        <QueryError
          error={subjects.error}
          retry={() => void subjects.refetch()}
        />
      )}
      {query.isPending ? (
        <Loading label="Đang tải bộ câu hỏi…" />
      ) : (
        <>
          {!items.length && !query.isError && (
            <EmptyState
              title="Ý tưởng mới đang chờ bạn"
              description="Bạn chưa có bộ câu hỏi phù hợp với bộ lọc. Tạo một bộ để bắt đầu đóng góp nhé."
            />
          )}
          <div className="bank-grid">
            {items.map((session, index) => (
              <article
                className="surface collection-card"
                key={session.session_id || index}
              >
                <span className="collection-icon">
                  <Layers size={23} />
                </span>
                <span className="muted text-sm">{session.subject_name}</span>
                <h2>{session.title || session.session_code}</h2>
                <p>{session.content}</p>
                <p className="muted text-sm">{submissionContext(session)}</p>
                <div className="collection-footer">
                  <span>
                    {session.question_counts ?? "—"} câu ·{" "}
                    {formatTime(session.created_at)}
                  </span>
                  {validId(session.session_id) && (
                    <Link
                      className="text-button"
                      to={`/submissions/${session.session_id}`}
                    >
                      Xem bộ câu hỏi →
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          {query.isError && (
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
      <p className="academic-help">
        Chỉ bộ câu hỏi đang chờ duyệt mới được chỉnh sửa hoặc xóa. Trạng thái
        lọc do máy chủ quyết định.
      </p>
    </AcademicPage>
  );
}
export function SubmissionDetailPage() {
  const { sessionId } = useParams();
  const id = routeId(sessionId);
  const query = useSubmission(id);
  const [confirm, setConfirm] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: () => deleteSubmission(id!),
    onSuccess: async () => {
      setConfirm(false);
      navigate("/submissions", { replace: true });
      await refreshAcademic(client);
    },
  });
  if (!id)
    return (
      <AcademicPage>
        <ErrorNotice message="Mã bộ câu hỏi không hợp lệ." />
      </AcademicPage>
    );
  return (
    <AcademicPage>
      <Link to="/submissions" className="back-link">
        <ArrowLeft size={17} />
        Bộ câu hỏi của tôi
      </Link>
      {query.isPending ? (
        <Loading />
      ) : query.error || !query.data ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <div className="academic-heading">
            <div>
              <p className="eyebrow text-brand">{query.data.subject_name}</p>
              <h1>{query.data.title || "Bộ câu hỏi của tôi"}</h1>
              <p className="muted">{query.data.session_code}</p>
            </div>
            <Link className="button button-primary" to={`/practice/${id}`}>
              Mở luyện tập
            </Link>
          </div>
          <div className="surface submission-summary">
            <p>{query.data.content}</p>
            <p className="muted text-sm">{submissionContext(query.data)}</p>
            <p className="muted text-sm">
              {query.data.reviewed_by_lecturer
                ? `Giảng viên duyệt: ${query.data.reviewed_by_lecturer}`
                : "Chưa có thông tin người duyệt"}{" "}
              · {formatTime(query.data.created_at)}
            </p>
            {query.data.status === "PENDING" && (
              <div className="inline-actions">
                <span className="academic-badge status-pending">Chờ duyệt</span>
                <Link
                  className="button button-secondary"
                  to={`/submissions/${id}/edit`}
                >
                  <Pencil size={15} />
                  Chỉnh sửa bộ câu hỏi
                </Link>
                <button
                  className="button button-secondary"
                  onClick={() => {
                    mutation.reset();
                    setConfirm(true);
                  }}
                >
                  <Trash2 size={15} />
                  Xóa bộ câu hỏi
                </button>
              </div>
            )}
            {query.data.status !== "PENDING" && (
              <p className="academic-help">
                Bộ câu hỏi không ở trạng thái chờ duyệt hoặc chưa có thông tin
                trạng thái. Chỉnh sửa và xóa hiện không khả dụng.
              </p>
            )}
          </div>
          <div className="question-stack">
            {query.data.questions?.map((question, index) => (
              <article
                className="surface question-detail"
                key={question.question_id || index}
              >
                <div className="section-title">
                  <h2>Câu {index + 1}</h2>
                  <span className="muted text-sm">
                    {question.source === "LLM"
                      ? "Do AI/LLM tạo"
                      : question.source === "HOMO_SAPIENS"
                        ? "Tự biên soạn"
                        : "Chưa có nguồn"}
                    {question.confidence_score !== undefined
                      ? ` · Tự tin ${question.confidence_score}/4`
                      : ""}
                  </span>
                </div>
                <QuestionContent
                  content={question.content}
                  images={question.image_urls}
                  options={question.options}
                  reveal
                />
                {question.explanation && (
                  <div className="answer-feedback">
                    <strong>Lời giải do tác giả cung cấp</strong>
                    <p>{question.explanation}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
      {query.data && <DiscussionToggle id={id} type="SESSION"/>}
      {confirm && (
        <ConfirmDialog
          title="Xóa bộ câu hỏi?"
          description="Toàn bộ phiên đề xuất, câu hỏi và ảnh liên quan sẽ bị xóa. Chỉ bộ đang chờ duyệt mới được phép xóa."
          confirmLabel="Xóa bộ câu hỏi"
          pending={mutation.isPending}
          error={mutation.isError ? errorMessage(mutation.error) : undefined}
          onClose={() => setConfirm(false)}
          onConfirm={() => mutation.mutate()}
        />
      )}
    </AcademicPage>
  );
}
export function SubmissionEditorPage() {
  const { sessionId } = useParams();
  const id = routeId(sessionId);
  const query = useSubmission(id);
  if (sessionId && !id)
    return (
      <AcademicPage>
        <ErrorNotice message="Mã bộ câu hỏi không hợp lệ." />
      </AcademicPage>
    );
  if (id && query.isPending)
    return <Loading label="Đang kiểm tra bộ câu hỏi…" />;
  if (id && query.error)
    return (
      <AcademicPage>
        <QueryError
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      </AcademicPage>
    );
  if (id && query.data?.status !== "PENDING")
    return (
      <AcademicPage>
        <ErrorNotice message="Chỉ bộ câu hỏi đang chờ duyệt của chính bạn mới được chỉnh sửa." />
      </AcademicPage>
    );
  return (
    <AcademicPage>
      <SubmissionForm key={id || "new"} initial={query.data} id={id} />
    </AcademicPage>
  );
}
function SubmissionForm({
  initial,
  id,
}: {
  initial?: MySubmissionDetailResponse;
  id?: number;
}) {
  const classes = useEnrolledCourseClasses();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.content || "");
  // The detail DTO does not include source_url. Leave it unchanged on edit unless explicitly entered.
  const [source, setSource] = useState("");
  const [courseClass, setCourseClass] = useState(
    initial?.course_class_id ? String(initial.course_class_id) : "",
  );
  const classChanged = courseClass !== String(initial?.course_class_id || "");
  const needsClass = !id || classChanged;
  const selectedClass = classes.data?.find(
    (item) => item.course_class_id === Number(courseClass),
  );
  const eligibleClasses = classes.data?.filter(
    (item) => validId(item.course_class_id) && item.can_propose === true,
  );
  const choices = [...(classes.data || [])];
  if (
    initial?.course_class_id &&
    !choices.some((item) => item.course_class_id === initial.course_class_id)
  ) {
    choices.unshift({
      course_class_id: initial.course_class_id,
      class_code: initial.class_code,
      subject_name: initial.subject_name,
      semester_name: initial.semester_name,
    });
  }
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initial?.questions?.map(toDraft) || [emptyQuestion()],
  );
  const [validation, setValidation] = useState("");
  const [uploads, setUploads] = useState(0);
  const save = useMutation({
    mutationFn: async () => {
      const common = {
        title,
        content: description,
        ...(!id || source ? { source_url: source } : {}),
      };
      if (id) {
        const payload: UpdateSubmissionSessionRequest = {
          ...common,
          ...(classChanged ? { course_class_id: Number(courseClass) } : {}),
          questions: questions.map((question) => ({
            ...(validId(question.question_id)
              ? { question_id: question.question_id }
              : {}),
            content: question.content,
            media_urls: imageLines(question.images),
            options: question.options,
            explanation: question.explanation,
            source: question.source,
            ...(question.confidence !== ""
              ? { confidence: Number(question.confidence) }
              : {}),
          })),
        };
        await updateSubmission(id, payload);
        return id;
      }
      const payload: ProposeSessionRequest = {
        ...common,
        course_class_id: Number(courseClass),
        questions: questions.map((question) => ({
          content: question.content,
          media_urls: imageLines(question.images),
          options: question.options,
          explanation: question.explanation,
          llm_generated: question.source === "LLM",
          ...(question.confidence !== ""
            ? { confidence: Number(question.confidence) }
            : {}),
        })),
      };
      return (await proposeSession(payload))?.session_id;
    },
    onSuccess: async (saved) => {
      await refreshAcademic(client);
      navigate(validId(saved) ? `/submissions/${saved}` : "/submissions", {
        replace: true,
      });
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (
      save.isPending ||
      uploads > 0 ||
      (needsClass && (classes.isPending || classes.isError))
    )
      return;
    setValidation("");
    if (!title.trim()) {
      setValidation("Nhập tiêu đề bộ câu hỏi.");
      return;
    }
    if (
      needsClass &&
      (!validId(Number(courseClass)) || selectedClass?.can_propose !== true)
    ) {
      setValidation(
        "Chọn lớp học phần được phép đề xuất trong học kỳ hiện tại.",
      );
      return;
    }
    if (!questions.length) {
      setValidation("Bộ câu hỏi cần có ít nhất một câu.");
      return;
    }
    for (const [index, question] of questions.entries()) {
      const message = validateQuestion(question);
      if (message) {
        setValidation(`Câu ${index + 1}: ${message}`);
        return;
      }
    }
    save.mutate();
  }
  return (
    <>
      <Link
        className="back-link"
        to={id ? `/submissions/${id}` : "/submissions"}
      >
        ← Trở về bộ câu hỏi
      </Link>
      <div className="academic-heading">
        <div>
          <p className="eyebrow text-brand">ĐÓNG GÓP TRI THỨC</p>
          <h1>{id ? "Chỉnh sửa bộ câu hỏi" : "Tạo bộ câu hỏi"}</h1>
          <p className="muted">Biên soạn rõ ràng, chia sẻ có trách nhiệm.</p>
        </div>
      </div>
      {classes.error && (
        <QueryError
          error={classes.error}
          retry={() => void classes.refetch()}
          pending={classes.isFetching}
        />
      )}
      {classes.isSuccess && !eligibleClasses?.length && (
        <div className="notice" role="status">
          Không có lớp học phần được phép đề xuất trong học kỳ hiện tại.
          {id
            ? " Bạn vẫn có thể sửa nội dung và giữ nguyên lớp hiện tại."
            : " Chỉ có thể gửi đề xuất khi máy chủ xác nhận quyền của lớp."}
        </div>
      )}
      <form
        onSubmit={submit}
        className="academic-form"
        aria-label={id ? "Sửa bộ câu hỏi" : "Tạo bộ câu hỏi"}
      >
        <fieldset
          className="surface submission-form-header"
          disabled={save.isPending}
        >
          <div className="field">
            <label htmlFor="session-title">Tiêu đề bộ câu hỏi</label>
            <input
              id="session-title"
              value={title}
              required
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <label className="academic-select">
            <span>Lớp học phần</span>
            <select
              aria-label="Lớp học phần"
              required={!id || !!initial?.course_class_id}
              value={courseClass}
              disabled={classes.isPending || classes.isError}
              onChange={(event) => setCourseClass(event.target.value)}
            >
              <option value="">
                {id && !initial?.course_class_id
                  ? "Giữ nguyên lớp hiện tại"
                  : "Chọn lớp học phần"}
              </option>
              {choices
                .filter((item) => validId(item.course_class_id))
                .map((item) => (
                  <option
                    key={item.course_class_id}
                    value={item.course_class_id}
                    disabled={
                      item.can_propose !== true &&
                      item.course_class_id !== initial?.course_class_id
                    }
                  >
                    {item.class_code || `Lớp ${item.course_class_id}`} ·{" "}
                    {item.subject_code ||
                      item.subject_name ||
                      "Chưa có tên môn"}{" "}
                    · {item.semester_name || "Chưa rõ học kỳ"}
                    {item.can_propose !== true
                      ? " · Không thể gửi đề xuất mới"
                      : ""}
                  </option>
                ))}
            </select>
          </label>
          <div className="field">
            <label htmlFor="session-description">Mô tả bộ câu hỏi</label>
            <textarea
              id="session-description"
              value={description}
              rows={2}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="session-source">Nguồn tham khảo (tùy chọn)</label>
            <input
              type="url"
              id="session-source"
              value={source}
              placeholder={
                id ? "Chỉ nhập khi muốn thay đổi nguồn tham khảo" : "https://…"
              }
              onChange={(event) => setSource(event.target.value)}
            />
          </div>
        </fieldset>
        {questions.map((question, index) => (
          <div
            className="surface question-draft-card"
            key={question.question_id || `new-${index}`}
          >
            <QuestionEditor
              value={question}
              index={index}
              disabled={save.isPending || uploads > 0}
              onUploading={(pending) =>
                setUploads((count) => Math.max(0, count + (pending ? 1 : -1)))
              }
              onChange={(updated) =>
                setQuestions((items) =>
                  items.map((item, position) =>
                    position === index ? updated : item,
                  ),
                )
              }
            />
            <button
              type="button"
              className="text-button remove-question"
              disabled={
                save.isPending || uploads > 0 || validId(question.question_id)
              }
              title={
                validId(question.question_id)
                  ? "Câu đã gửi chưa hỗ trợ xóa riêng"
                  : "Gỡ câu khỏi bản soạn"
              }
              onClick={() =>
                setQuestions((items) =>
                  items.filter((_, position) => position !== index),
                )
              }
            >
              <Trash2 size={15} />
              {validId(question.question_id)
                ? "Câu đã gửi chưa hỗ trợ xóa riêng"
                : `Gỡ câu ${index + 1}`}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button button-secondary add-question"
          disabled={save.isPending || uploads > 0}
          onClick={() => setQuestions((items) => [...items, emptyQuestion()])}
        >
          <Plus size={17} />
          Thêm câu hỏi
        </button>
        {validation && <ErrorNotice message={validation} />}
        {save.isError && <ErrorNotice message={errorMessage(save.error)} />}
        <div className="form-actions">
          <Link
            to={id ? `/submissions/${id}` : "/submissions"}
            className="button button-secondary"
          >
            Trở về
          </Link>
          <button
            className="button button-primary"
            disabled={
              save.isPending ||
              uploads > 0 ||
              (needsClass &&
                (classes.isPending ||
                  classes.isError ||
                  !eligibleClasses?.length))
            }
          >
            {save.isPending
              ? "Đang gửi…"
              : id
                ? "Lưu bộ câu hỏi"
                : "Gửi đề xuất"}
          </button>
        </div>
      </form>
    </>
  );
}
