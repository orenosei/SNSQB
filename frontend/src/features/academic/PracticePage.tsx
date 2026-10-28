import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import axios from "axios";
import { imageUrl } from "../../components/Avatar";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { EmptyState, QueryError } from "../../components/SocialFeedback";
import { errorMessage } from "../../lib/api";
import { routeId, validId } from "../../lib/cursor";
import { AcademicPage, QuestionContent } from "./components";
import { answerQuestion, practiceKey, requireResult, usePractice } from "./api";
import type {
  AnswerQuestionResponse,
  PracticeQuestionDto,
  SessionQuestionsResponse,
} from "./types";
import { QuestionInsights } from "./QuestionInsights";

interface SavedAnswer {
  selected: string[];
  response: AnswerQuestionResponse;
  updatedAt?: string;
}
type SavedAnswers = Record<number, SavedAnswer>;
function AnswerFeedback({
  question,
  answer,
}: {
  question: PracticeQuestionDto;
  answer?: SavedAnswer;
}) {
  const result = answer?.response;
  return (
    <div
      className={`answer-feedback ${result?.is_correct === true ? "answer-correct" : result?.is_correct === false ? "answer-incorrect" : ""}`}
      role="status"
    >
      <strong>
        {result?.is_correct === true
          ? "Chính xác! Kết quả từ máy chủ."
          : result?.is_correct === false
            ? "Chưa chính xác. Cùng xem lại lời giải nhé."
            : "Bạn đã trả lời câu hỏi này."}
      </strong>
      {answer ? (
        <p>Lựa chọn trong lượt này: {answer.selected.join(", ")}</p>
      ) : (
        <p>Chưa có thông tin lựa chọn và kết quả đúng/sai của lượt trước.</p>
      )}
      {(result?.correct_answer || question.hidden_fields?.correct_answer) && (
        <p>
          Đáp án đúng:{" "}
          <strong>
            {result?.correct_answer || question.hidden_fields?.correct_answer}
          </strong>
        </p>
      )}
      {(result?.explanation || question.hidden_fields?.explanation) && (
        <p className="answer-explanation">
          {result?.explanation || question.hidden_fields?.explanation}
        </p>
      )}
    </div>
  );
}
export function PracticePage() {
  const { sessionId } = useParams();
  const id = routeId(sessionId);
  return (
    <AcademicPage>
      {id ? (
        <PracticeSession key={id} id={id} />
      ) : (
        <ErrorNotice message="Mã bộ câu hỏi không hợp lệ." />
      )}
    </AcademicPage>
  );
}
function PracticeSession({ id }: { id: number }) {
  const query = usePractice(id);
  const client = useQueryClient();
  const answerKey = ["academic", "answers", id] as const;
  const [answers, setAnswers] = useState<SavedAnswers>(
    () => client.getQueryData<SavedAnswers>(answerKey) || {},
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState(false);
  const [validation, setValidation] = useState("");
  const [insights, setInsights] = useState(false);
  const [reloadRequired, setReloadRequired] = useState(new Set<number>());
  const questions = query.data?.questions || [];
  const question =
    questions[Math.min(index, Math.max(0, questions.length - 1))];
  const mutation = useMutation({
    mutationFn: async ({
      questionId,
      options,
      updatedAt,
    }: {
      questionId: number;
      options: string[];
      updatedAt?: string;
    }) =>
      requireResult(
        await answerQuestion(questionId, {
          selected_options: options,
          ...(updatedAt ? { question_updated_at: updatedAt } : {}),
        }),
      ),
    onSuccess: (response, variables) => {
      const saved = {
        selected: variables.options,
        response,
        updatedAt: variables.updatedAt,
      };
      setAnswers((current) => {
        const updated = { ...current, [variables.questionId]: saved };
        client.setQueryData(answerKey, updated);
        return updated;
      });
      client.setQueryData<SessionQuestionsResponse>(
        practiceKey(id),
        (current) =>
          current
            ? {
                ...current,
                questions: current.questions?.map((item) =>
                  item.question_id === variables.questionId
                    ? {
                        ...item,
                        my_interaction: {
                          ...item.my_interaction,
                          answered: true,
                        },
                        hidden_fields: {
                          correct_answer: response.correct_answer,
                          explanation: response.explanation,
                        },
                      }
                    : item,
                ),
              }
            : current,
      );
      void client.invalidateQueries({
        queryKey: ["academic", "stats", variables.questionId],
      });
    },
    onError: (_error, variables) => {
      setReloadRequired(
        (current) => new Set([...current, variables.questionId]),
      );
    },
  });
  function move(position: number) {
    if (mutation.isPending) return;
    setIndex(position);
    setSelected([]);
    setValidation("");
    setInsights(false);
    mutation.reset();
  }
  async function reload() {
    const result = await query.refetch();
    if (!result.isError) {
      setSelected([]);
      setValidation("");
      mutation.reset();
      setReloadRequired(new Set());
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !validId(question?.question_id) ||
      mutation.isPending ||
      question.my_interaction?.answered ||
      reloadRequired.has(question.question_id)
    )
      return;
    if (!selected.length) {
      setValidation("Hãy chọn ít nhất một phương án trước khi gửi.");
      return;
    }
    setValidation("");
    mutation.mutate({
      questionId: question.question_id,
      options: [...selected],
      updatedAt: question.updated_at,
    });
  }
  if (query.isPending) return <Loading label="Đang mở bộ câu hỏi luyện tập…" />;
  if (query.error || !query.data)
    return (
      <QueryError error={query.error} retry={() => void query.refetch()} />
    );
  if (!questions.length)
    return (
      <EmptyState
        title="Bộ câu hỏi chưa có câu luyện tập"
        description="Hãy chọn một bộ khác hoặc quay lại sau khi các câu hỏi được duyệt."
      />
    );
  const completed = questions.filter(
    (item) => item.my_interaction?.answered,
  ).length;
  const saved = (item: PracticeQuestionDto) =>
    validId(item.question_id) &&
    answers[item.question_id]?.updatedAt === item.updated_at
      ? answers[item.question_id]
      : undefined;
  return (
    <>
      <Link className="back-link" to="/question-bank">
        <ArrowLeft size={17} />
        Khám phá bộ câu hỏi khác
      </Link>
      <div className="academic-heading">
        <div>
          <p className="eyebrow text-brand">
            {query.data.subject_name || "KHÔNG GIAN LUYỆN TẬP"}
          </p>
          <h1>{query.data.title || "Bộ câu hỏi luyện tập"}</h1>
          <p className="muted">{query.data.session_code}</p>
        </div>
        <button
          className="button button-secondary"
          onClick={() => {
            setResults(!results);
            setInsights(false);
          }}
          disabled={mutation.isPending}
        >
          {results ? "Trở lại câu hỏi" : "Xem kết quả"}
        </button>
      </div>
      <div className="surface practice-progress">
        <div>
          <strong>
            Đã trả lời {completed}/{questions.length} câu
          </strong>
          <span>Tiến độ từ trạng thái máy chủ</span>
        </div>
        <progress
          value={completed}
          max={questions.length}
          aria-label="Tiến độ trả lời"
        />
      </div>
      {results ? (
        <section aria-label="Kết quả luyện tập">
          <div className="results-heading">
            <CheckCircle2 size={27} />
            <div>
              <h2>Kết quả luyện tập</h2>
              <p>
                Kết quả từng câu do máy chủ trả về. Chưa có điểm tổng cho bộ câu
                hỏi.
              </p>
            </div>
          </div>
          <div className="question-stack">
            {questions.map((item, position) => (
              <article
                className="surface question-detail"
                key={item.question_id || position}
              >
                <h3>Câu {position + 1}</h3>
                <QuestionContent
                  content={item.content}
                  images={item.image_urls}
                  options={item.options}
                />
                {item.my_interaction?.answered ? (
                  <AnswerFeedback question={item} answer={saved(item)} />
                ) : (
                  <p className="notice">Bạn chưa trả lời câu này.</p>
                )}
                <button
                  className="text-button"
                  onClick={() => {
                    move(position);
                    setResults(false);
                  }}
                >
                  Xem lại câu {position + 1} →
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        question && (
          <div className="practice-layout">
            <section className="surface practice-question">
              <div className="section-title">
                <span className="academic-badge">
                  Câu {index + 1} / {questions.length}
                </span>
                <span className="muted text-sm">{question.question_code}</span>
              </div>
              <QuestionContent
                content={question.content}
                images={question.image_urls}
              />
              <form onSubmit={submit} aria-label="Trả lời câu hỏi">
                <fieldset
                  disabled={
                    mutation.isPending ||
                    !!question.my_interaction?.answered ||
                    (validId(question.question_id) &&
                      reloadRequired.has(question.question_id))
                  }
                >
                  <legend className="practice-instruction">
                    Chọn một hoặc nhiều phương án phù hợp
                  </legend>
                  {question.options?.map((option, position) => (
                    <label
                      className={`practice-choice ${option.key && selected.includes(option.key) ? "choice-selected" : ""}`}
                      key={`${option.key}-${position}`}
                    >
                      <input
                        type="checkbox"
                        disabled={!option.key}
                        checked={!!option.key && selected.includes(option.key)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, option.key!]
                              : current.filter((value) => value !== option.key),
                          )
                        }
                      />
                      <span className="option-key">
                        {option.key || position + 1}
                      </span>
                      <span>
                        {option.text}
                        {imageUrl(option.media_url) && (
                          <img
                            className="practice-option-image"
                            src={imageUrl(option.media_url)}
                            alt={`Hình phương án ${option.key || position + 1}`}
                          />
                        )}
                      </span>
                    </label>
                  ))}
                </fieldset>
                {validation && <ErrorNotice message={validation} />}
                {mutation.isError &&
                  mutation.variables?.questionId === question.question_id && (
                    <ErrorNotice
                      message={
                        axios.isAxiosError(mutation.error) &&
                        mutation.error.response?.status === 409
                          ? "Câu hỏi này đã được trả lời. Tải lại để xem trạng thái mới nhất; không gửi lại đáp án."
                          : axios.isAxiosError(mutation.error) &&
                              !mutation.error.response
                            ? "Chưa xác nhận được việc ghi nhận đáp án. Hãy tải lại câu hỏi để kiểm tra trước khi gửi tiếp."
                            : errorMessage(mutation.error)
                      }
                    />
                  )}
                {!question.my_interaction?.answered && (
                  <div className="practice-submit">
                    <p>Mỗi câu chỉ được gửi đáp án một lần.</p>
                    <button
                      type="submit"
                      className="button button-primary"
                      disabled={
                        mutation.isPending ||
                        !validId(question.question_id) ||
                        reloadRequired.has(question.question_id!)
                      }
                    >
                      {mutation.isPending ? "Đang chấm…" : "Gửi đáp án"}
                    </button>
                  </div>
                )}
                {validId(question.question_id) &&
                  reloadRequired.has(question.question_id) && (
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={query.isFetching}
                      onClick={() => void reload()}
                    >
                      <RefreshCw size={16} />
                      Tải lại câu hỏi
                    </button>
                  )}
              </form>
              {question.my_interaction?.answered && (
                <AnswerFeedback question={question} answer={saved(question)} />
              )}
              <div className="practice-navigation">
                <button
                  className="button button-secondary"
                  disabled={index === 0 || mutation.isPending}
                  onClick={() => move(index - 1)}
                >
                  <ArrowLeft size={16} />
                  Câu trước
                </button>
                <button
                  className="button button-secondary"
                  disabled={index >= questions.length - 1 || mutation.isPending}
                  onClick={() => move(index + 1)}
                >
                  Câu tiếp <ArrowRight size={16} />
                </button>
              </div>
              {validId(question.question_id) && (
                <button
                  className="text-button"
                  onClick={() => setInsights(!insights)}
                >
                  {insights
                    ? "Ẩn đánh giá cộng đồng"
                    : "Xem thống kê và đánh giá"}
                </button>
              )}
              {insights && validId(question.question_id) && (
                <QuestionInsights
                  questionId={question.question_id}
                  canRate={!question.my_interaction?.rated}
                />
              )}
            </section>
            <aside className="surface question-map">
              <h2>Lộ trình của bạn</h2>
              <div>
                {questions.map((item, position) => (
                  <button
                    key={item.question_id || position}
                    aria-label={`Đến câu ${position + 1}${item.my_interaction?.answered ? ", đã trả lời" : ""}`}
                    aria-current={index === position ? "step" : undefined}
                    className={
                      item.my_interaction?.answered ? "question-done" : ""
                    }
                    disabled={mutation.isPending}
                    onClick={() => move(position)}
                  >
                    {position + 1}
                    {item.my_interaction?.answered && (
                      <CheckCircle2 size={10} />
                    )}
                  </button>
                ))}
              </div>
              <p>
                Các câu đã trả lời được giữ theo tài khoản của bạn trên máy chủ.
              </p>
            </aside>
          </div>
        )
      )}
    </>
  );
}
