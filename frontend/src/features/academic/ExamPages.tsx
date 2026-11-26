import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { Download, FileCheck2, Plus, Trash2 } from "lucide-react";
import { imageUrl } from "../../components/Avatar";
import { ErrorNotice, Loading } from "../../components/Feedback";
import {
  EmptyState,
  LoadMore,
  QueryError,
} from "../../components/SocialFeedback";
import { errorMessage } from "../../lib/api";
import { formatTime, routeId, validId } from "../../lib/cursor";
import { AcademicPage, QuestionContent, SubjectSelect } from "./components";
import {
  useSubjects,
  getAcademic,
  useMyClasses,
  useExams,
  useExam,
  generateExam,
  exportExam,
  exportQuestionBank,
  refreshAcademic,
} from "./api";
import type { GenerateExamRequest } from "./types";

function ExportPanel({
  subjectId,
  examId,
}: {
  subjectId?: number;
  examId?: number;
}) {
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [answers, setAnswers] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      examId
        ? exportExam(examId, format, answers)
        : exportQuestionBank(subjectId!, format, answers),
  });
  const url = imageUrl(mutation.data?.download_url);
  return (
    <section className="surface export-panel">
      <h2>{examId ? "Xuất đề thi" : "Xuất ngân hàng theo môn"}</h2>
      <p className="academic-help">
        {examId
          ? "Tạo liên kết tải tài liệu đề thi PDF hoặc Excel."
          : "Chọn môn học ở bộ lọc phía trên để xuất các câu hỏi của môn."}
      </p>
      <div className="export-controls">
        <label>
          Định dạng
          <select
            aria-label="Định dạng"
            value={format}
            disabled={mutation.isPending}
            onChange={(event) => {
              setFormat(event.target.value as typeof format);
              mutation.reset();
            }}
          >
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel (.xlsx)</option>
          </select>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={answers}
            disabled={mutation.isPending}
            onChange={(event) => {
              setAnswers(event.target.checked);
              mutation.reset();
            }}
          />
          Kèm đáp án{examId ? "" : " và lời giải"}
        </label>
        <button
          className="button button-secondary"
          disabled={
            mutation.isPending || !(validId(examId) || validId(subjectId))
          }
          onClick={() => mutation.mutate()}
        >
          <Download size={16} />
          {mutation.isPending ? "Đang xuất…" : "Tạo tệp tải về"}
        </button>
      </div>
      {mutation.isError && (
        <ErrorNotice message={errorMessage(mutation.error)} />
      )}
      {mutation.isSuccess &&
        (url ? (
          <div className="notice notice-success" role="status">
            <div>
              <a
                className="text-button"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Tải tệp {format.toUpperCase()} <Download size={15} />
              </a>
              <p>
                {mutation.data?.questions_count ?? "—"} câu ·{" "}
                {mutation.data?.file_size_mb ?? "—"} MB
                {mutation.data?.expires_at
                  ? ` · Hết hạn: ${formatTime(mutation.data.expires_at)}`
                  : ""}
              </p>
            </div>
          </div>
        ) : (
          <ErrorNotice message="Máy chủ chưa trả về liên kết tải tệp hợp lệ." />
        ))}
    </section>
  );
}
export function ExamsPage() {
  const [subject, setSubject] = useState("");
  const subjects = useSubjects();
  const query = useExams(routeId(subject));
  const exams = query.data?.pages.flatMap((page) => page.items || []) || [];
  return (
    <AcademicPage>
      <div className="academic-heading">
        <div>
          <h1>Đề thi của tôi</h1>
          <p className="muted">Biên soạn đề từ những câu hỏi đã được duyệt.</p>
        </div>
        <Link className="button button-primary" to="/lecturer/exams/new">
          <Plus size={17} />
          Tạo đề thi
        </Link>
      </div>
      <div className="surface academic-filters">
        <SubjectSelect
          subjects={subjects.data}
          value={subject}
          onChange={setSubject}
        />
      </div>
      {subjects.error && (
        <QueryError
          error={subjects.error}
          retry={() => void subjects.refetch()}
        />
      )}
      {query.isPending ? (
        <Loading label="Đang tải đề thi…" />
      ) : (
        <>
          {!exams.length && !query.error && (
            <EmptyState
              title="Chưa có đề thi phù hợp"
              description="Tạo đề từ ngân hàng câu hỏi đã duyệt và gán vào các lớp học phần bạn phụ trách."
            />
          )}
          <div className="bank-grid">
            {exams.map((exam, index) => (
              <article
                className="surface collection-card"
                key={exam.exam_id || index}
              >
                <span className="collection-icon">
                  <FileCheck2 size={23} />
                </span>
                <span className="muted text-sm">{exam.subject_name}</span>
                <h2>{exam.title || "Đề thi"}</h2>
                <p>
                  {exam.question_count ?? "—"} câu hỏi ·{" "}
                  {formatTime(exam.created_at)}
                </p>
                {validId(exam.exam_id) && (
                  <Link
                    className="text-button"
                    to={`/lecturer/exams/${exam.exam_id}`}
                  >
                    Xem chi tiết đề →
                  </Link>
                )}
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
      <ExportPanel key={subject} subjectId={routeId(subject)} />
    </AcademicPage>
  );
}
export function ExamDetailPage() {
  const { examId } = useParams();
  const id = routeId(examId);
  const query = useExam(id);
  const [showAnswers, setShowAnswers] = useState(false);
  if (!id)
    return (
      <AcademicPage>
        <ErrorNotice message="Mã đề thi không hợp lệ." />
      </AcademicPage>
    );
  return (
    <AcademicPage>
      <Link to="/lecturer/exams" className="back-link">
        ← Đề thi của tôi
      </Link>
      {query.isPending ? (
        <Loading label="Đang tải đề thi…" />
      ) : query.error || !query.data ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <div className="academic-heading">
            <div>
              <p className="eyebrow text-brand">{query.data.subject_name}</p>
              <h1>{query.data.title || "Chi tiết đề thi"}</h1>
              <p className="muted">
                {query.data.question_count ?? "—"} câu hỏi ·{" "}
                {formatTime(query.data.created_at)}
              </p>
            </div>
          </div>
          <div className="academic-metrics exam-statistics">
            {(
              [
                "easy_count",
                "medium_count",
                "hard_count",
                "unclassified_count",
              ] as const
            ).map((key, index) => (
              <div key={key}>
                <strong>{query.data?.statistic?.[key] ?? "—"}</strong>
                <span>
                  {["Dễ", "Trung bình", "Khó", "Chưa phân loại"][index]}
                </span>
              </div>
            ))}
          </div>
          <label className="check-label exam-answer-toggle">
            <input
              type="checkbox"
              checked={showAnswers}
              onChange={(event) => setShowAnswers(event.target.checked)}
            />
            Hiển thị đáp án được máy chủ cung cấp
          </label>
          <div className="question-stack">
            {query.data.questions?.map((question, index) => (
              <article
                className="surface question-detail"
                key={`${question.question_id}-${index}`}
              >
                <div className="section-title">
                  <h2>Câu {question.order ?? index + 1}</h2>
                  <span className="muted text-sm">
                    {question.topic} · {question.difficulty}
                  </span>
                </div>
                <QuestionContent
                  content={question.content}
                  images={question.image_urls}
                  options={question.options}
                  reveal={showAnswers}
                />
              </article>
            ))}
          </div>
          <ExportPanel examId={id} />
          <p className="academic-help">
            Đây là bản đề dành cho giảng viên. Nộp bài và chấm điểm toàn đề chưa
            khả dụng; bạn có thể luyện tập theo bộ câu hỏi ở ngân hàng.
          </p>
        </>
      )}
    </AcademicPage>
  );
}
export function ExamCreatePage() {
  const subjects = useSubjects();
  const classes = useMyClasses();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [count, setCount] = useState("10");
  const [classIds, setClassIds] = useState<number[]>([]);
  const [shuffle, setShuffle] = useState(true);
  const [answerKey, setAnswerKey] = useState(false);
  const [customDifficulty, setCustomDifficulty] = useState(false);
  const [ratios, setRatios] = useState({
    easy: "0.3",
    medium: "0.5",
    hard: "0.2",
    unclassified: "0",
  });
  const [topics, setTopics] = useState<{ topic: string; weight: string }[]>([]);
  const [validation, setValidation] = useState("");
  const mutation = useMutation({
    mutationFn: (body: GenerateExamRequest) => generateExam(body),
    onSuccess: async (exam) => {
      await refreshAcademic(client);
      navigate(
        validId(exam?.exam_id)
          ? `/lecturer/exams/${exam.exam_id}`
          : "/lecturer/exams",
        { replace: true },
      );
    },
  });
  const subjectId = routeId(subject);
  const stock = useQuery({
    queryKey: ["academic", "exam-stock", subjectId],
    enabled: subjectId !== undefined,
    queryFn: ({ signal }) =>
      getAcademic<{
        total_questions?: number;
        topics?: {
          topic_id?: number;
          topic_name?: string;
          total_questions?: number;
        }[];
      }>(
        `/lecturer/exams/question-bank/${subjectId}/summary`,
        undefined,
        signal,
      ),
  });
  const topicOptions = (stock.data?.topics || []).flatMap((topic) =>
    validId(topic.topic_id)
      ? [
          {
            value: String(topic.topic_id),
            label: topic.topic_name || `#${topic.topic_id}`,
          },
        ]
      : [],
  );
  const available =
    classes.data?.filter((item) => item.subject_id === Number(subject)) || [];
  function submit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    setValidation("");
    if (!validId(Number(subject)) || !classIds.length) {
      setValidation("Chọn môn học và ít nhất một lớp học phần.");
      return;
    }
    if (
      count !== "" &&
      (!Number.isSafeInteger(Number(count)) || Number(count) <= 0)
    ) {
      setValidation("Số câu hỏi cần là số nguyên dương.");
      return;
    }
    const distribution = Object.fromEntries(
      Object.entries(ratios).map(([key, value]) => [key, Number(value)]),
    );
    if (
      customDifficulty &&
      (Object.values(distribution).some(
        (value) => !Number.isFinite(value) || value < 0 || value > 1,
      ) ||
        Math.abs(
          Object.values(distribution).reduce((sum, value) => sum + value, 0) -
            1,
        ) > 0.000001)
    ) {
      setValidation(
        "Tỷ lệ độ khó phải nằm trong khoảng 0–1 và có tổng bằng 1.",
      );
      return;
    }
    const weights: Record<string, number> = {};
    for (const item of topics) {
      if (
        !(
          item.topic === "untagged" ||
          topicOptions.some((topic) => topic.value === item.topic)
        ) ||
        item.weight.trim() === "" ||
        !Number.isFinite(Number(item.weight)) ||
        Number(item.weight) < 0 ||
        Number(item.weight) > 1
      ) {
        setValidation("Chọn chủ đề và nhập trọng số trong khoảng 0–1.");
        return;
      }
      if (Object.hasOwn(weights, item.topic.trim())) {
        setValidation("Mỗi chủ đề chỉ được chọn một lần.");
        return;
      }
      weights[item.topic.trim()] = Number(item.weight);
    }
    if (
      topics.length &&
      Math.abs(
        Object.values(weights).reduce((sum, value) => sum + value, 0) - 1,
      ) > 0.000001
    ) {
      setValidation("Tổng trọng số chủ đề phải bằng 1.");
      return;
    }
    mutation.mutate({
      subject_id: Number(subject),
      class_ids: classIds,
      ...(title.trim() ? { title } : {}),
      ...(count !== "" ? { question_count: Number(count) } : {}),
      ...(customDifficulty ? { difficulty_distribution: distribution } : {}),
      ...(topics.length ? { topic_weights: weights } : {}),
      shuffle_options: shuffle,
      include_answer_key: answerKey,
    });
  }
  return (
    <AcademicPage>
      <Link className="back-link" to="/lecturer/exams">
        ← Đề thi của tôi
      </Link>
      <div className="academic-heading">
        <div>
          <h1>Tạo đề thi tự động</h1>
          <p className="muted">
            Máy chủ chọn câu hỏi đã duyệt theo yêu cầu của bạn.
          </p>
        </div>
      </div>
      {subjects.error && (
        <QueryError
          error={subjects.error}
          retry={() => void subjects.refetch()}
        />
      )}
      {classes.error && (
        <QueryError
          error={classes.error}
          retry={() => void classes.refetch()}
        />
      )}
      <form
        className="surface exam-create-form"
        onSubmit={submit}
        aria-label="Tạo đề thi"
      >
        <fieldset
          disabled={
            mutation.isPending || subjects.isPending || classes.isPending
          }
        >
          <SubjectSelect
            required
            subjects={subjects.data}
            value={subject}
            onChange={(value) => {
              setSubject(value);
              setClassIds([]);
              setTopics([]);
            }}
          />
          {subjectId && stock.isPending && (
            <Loading label="Đang tải thống kê ngân hàng…" />
          )}
          {stock.isError && (
            <QueryError
              error={stock.error}
              retry={() => void stock.refetch()}
            />
          )}
          {stock.data && (
            <section className="surface rewards-panel">
              <h3>Ngân hàng câu hỏi</h3>
              <p>{stock.data.total_questions ?? 0} câu có thể dùng để tạo đề</p>
              {!!stock.data.topics?.length && (
                <ul>
                  {stock.data.topics.map((topic, index) => (
                    <li key={topic.topic_id ?? index}>
                      {topic.topic_name || "Chưa phân loại"} ·{" "}
                      {topic.total_questions ?? 0} câu
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          <div className="field">
            <label htmlFor="exam-title">Tiêu đề đề thi (tùy chọn)</label>
            <input
              id="exam-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Để trống để máy chủ tự đặt tên"
            />
          </div>
          <div className="field">
            <label htmlFor="exam-count">Số câu hỏi (tùy chọn)</label>
            <input
              id="exam-count"
              type="number"
              min={1}
              step={1}
              value={count}
              onChange={(event) => setCount(event.target.value)}
            />
          </div>
          <div className="class-selection">
            <h2>Lớp học phần áp dụng</h2>
            {!subject ? (
              <p>Chọn môn học để xem các lớp bạn phụ trách.</p>
            ) : !available.length ? (
              <p>Chưa có lớp phù hợp. Cần lớp học phần hiện hành để tạo đề.</p>
            ) : (
              available.map((course) => (
                <label className="check-label" key={course.course_class_id}>
                  <input
                    type="checkbox"
                    disabled={!validId(course.course_class_id)}
                    checked={
                      validId(course.course_class_id) &&
                      classIds.includes(course.course_class_id)
                    }
                    onChange={(event) =>
                      setClassIds((items) =>
                        event.target.checked
                          ? [...items, course.course_class_id!]
                          : items.filter((id) => id !== course.course_class_id),
                      )
                    }
                  />
                  {course.class_code} · {course.subject_name}
                </label>
              ))
            )}
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(event) => setShuffle(event.target.checked)}
            />
            Đảo thứ tự phương án
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={answerKey}
              onChange={(event) => setAnswerKey(event.target.checked)}
            />
            Kèm bảng đáp án khi tạo đề
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={customDifficulty}
              onChange={(event) => setCustomDifficulty(event.target.checked)}
            />
            Tùy chỉnh phân bổ độ khó
          </label>
          {customDifficulty && (
            <div className="difficulty-grid">
              {(["easy", "medium", "hard", "unclassified"] as const).map(
                (key, index) => (
                  <label key={key}>
                    {
                      [
                        "Tỷ lệ dễ",
                        "Tỷ lệ trung bình",
                        "Tỷ lệ khó",
                        "Tỷ lệ chưa phân loại",
                      ][index]
                    }
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step="any"
                      value={ratios[key]}
                      onChange={(event) =>
                        setRatios((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ),
              )}
            </div>
          )}
          <div className="topic-weights">
            <h2>Trọng số chủ đề (tùy chọn)</h2>
            <p className="academic-help">
              Chọn chủ đề trong ngân hàng môn học. Tổng trọng số phải bằng 1.
            </p>
            {topics.map((item, index) => (
              <div key={index} className="topic-weight-row">
                <label>
                  Chủ đề {index + 1}
                  <select
                    value={item.topic}
                    onChange={(event) =>
                      setTopics((items) =>
                        items.map((topic, position) =>
                          position === index
                            ? { ...topic, topic: event.target.value }
                            : topic,
                        ),
                      )
                    }
                  >
                    <option value="">Chọn chủ đề</option>
                    {topicOptions.map((topic) => (
                      <option key={topic.value} value={topic.value}>
                        {topic.label}
                      </option>
                    ))}
                    <option value="untagged">Chưa phân loại</option>
                  </select>
                </label>
                <label>
                  Trọng số {index + 1}
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={item.weight}
                    onChange={(event) =>
                      setTopics((items) =>
                        items.map((topic, position) =>
                          position === index
                            ? { ...topic, weight: event.target.value }
                            : topic,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Gỡ chủ đề ${index + 1}`}
                  onClick={() =>
                    setTopics((items) =>
                      items.filter((_, position) => position !== index),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-button"
              disabled={!stock.isSuccess}
              onClick={() =>
                setTopics((items) => [...items, { topic: "", weight: "" }])
              }
            >
              <Plus size={15} />
              Thêm trọng số chủ đề
            </button>
          </div>
        </fieldset>
        {validation && <ErrorNotice message={validation} />}
        {mutation.isError && (
          <ErrorNotice message={errorMessage(mutation.error)} />
        )}
        <div className="form-actions">
          <button
            className="button button-primary"
            disabled={
              mutation.isPending ||
              subjects.isPending ||
              classes.isPending ||
              !!subjects.error ||
              !!classes.error
            }
          >
            {mutation.isPending ? "Đang tạo đề…" : "Tạo đề thi"}
          </button>
        </div>
      </form>
    </AcademicPage>
  );
}
