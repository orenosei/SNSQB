import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowRight, BookOpen, Layers, Plus, X } from "lucide-react";
import { SearchForm } from "../../components/SearchForm";
import { Loading } from "../../components/Feedback";
import {
  EmptyState,
  LoadMore,
  QueryError,
} from "../../components/SocialFeedback";
import { validId } from "../../lib/cursor";
import type { QuestionSearchResultDto } from "../social/types";
import { useBankSearch, useSubjects } from "./api";
import { AcademicPage, QuestionContent, StatusBadge } from "./components";
import { QuestionInsights } from "./QuestionInsights";
import { DiscussionToggle } from "../posts/DiscussionToggle";

export function BankPage() {
  const [params, setParams] = useSearchParams();
  const type = params.get("type") === "QUESTION" ? "QUESTION" : "SESSION";
  const term = params.get("query") || "";
  const [draft, setDraft] = useState(term);
  const [selected, setSelected] = useState<QuestionSearchResultDto>();
  const [insights, setInsights] = useState(false);
  useEffect(() => {
    setDraft(term);
    setSelected(undefined);
    setInsights(false);
  }, [term]);
  const query = useBankSearch(term, type);
  const subjects = useSubjects();
  const items = query.data?.pages.flatMap((page) => page.items || []) || [];
  function submit(event: FormEvent) {
    event.preventDefault();
    setSelected(undefined);
    setInsights(false);
    setParams({ type, ...(draft.trim() ? { query: draft.trim() } : {}) });
  }
  return (
    <AcademicPage>
      <div className="academic-heading">
        <div>
          <p className="eyebrow text-brand">HỌC SÂU HƠN, HIỂU RỘNG HƠN</p>
          <h1>Ngân hàng câu hỏi</h1>
          <p className="muted">
            Từ một câu hỏi hay đến những kiến thức vững vàng.
          </p>
        </div>
        <Link className="button button-primary" to="/submissions/new">
          <Plus size={17} />
          Đóng góp câu hỏi
        </Link>
      </div>
      <div className="bank-banner">
        <span>
          <BookOpen size={30} />
        </span>
        <div>
          <h2>Mỗi câu hỏi, một bước tiến.</h2>
          <p>
            Khám phá các bộ câu hỏi từ cộng đồng và luyện tập theo nhịp của bạn.
          </p>
        </div>
        <Layers size={64} className="banner-decoration" />
      </div>
      <SearchForm label="Tìm câu hỏi hoặc bộ câu hỏi" value={draft} onChange={setDraft} onSubmit={submit} placeholder="Tìm theo từ khóa, nội dung hoặc mã câu hỏi…"/>
      <nav className="social-tabs" aria-label="Loại nội dung học tập">
        {(["SESSION", "QUESTION"] as const).map((value) => (
          <button
            key={value}
            className={value === type ? "tab-active" : ""}
            aria-pressed={value === type}
            onClick={() => {
              setSelected(undefined);
              setParams({ type: value, ...(term ? { query: term } : {}) });
            }}
          >
            {value === "SESSION" ? "Bộ câu hỏi" : "Câu hỏi"}
          </button>
        ))}
      </nav>
      {selected ? (
        <section
          className="surface question-detail"
          aria-label="Chi tiết câu hỏi"
        >
          <div className="section-title">
            <h2>
              Chi tiết câu hỏi{" "}
              {selected.question_code || `#${selected.question_id}`}
            </h2>
            <button
              className="icon-button"
              aria-label="Đóng chi tiết câu hỏi"
              onClick={() => {
                setSelected(undefined);
                setInsights(false);
              }}
            >
              <X size={20} />
            </button>
          </div>
          <div className="question-tags">
            <StatusBadge value={selected.status} />
            <span>{selected.subject_name}</span>
            {selected.topic_name && <span>{selected.topic_name}</span>}
            {selected.difficulty && <span>{selected.difficulty}</span>}
          </div>
          <QuestionContent
            content={selected.content}
            images={selected.image_urls}
            options={selected.options}
          />
          {selected.explanation && (
            <div className="answer-feedback">
              <strong>Giải thích được công bố</strong>
              <p>{selected.explanation}</p>
            </div>
          )}
          {validId(selected.question_id) && (
            <button
              className="button button-secondary"
              onClick={() => setInsights(!insights)}
            >
              {insights ? "Ẩn đánh giá" : "Xem thống kê và đánh giá"}
            </button>
          )}
          {insights && validId(selected.question_id) && (
            <QuestionInsights questionId={selected.question_id} />
          )}
          {validId(selected.question_id) && <DiscussionToggle key={selected.question_id} id={selected.question_id} type="QUESTION"/>}
        </section>
      ) : query.isPending ? (
        <Loading label="Đang tải ngân hàng câu hỏi…" />
      ) : (
        <>
          {!items.length && !query.isError && (
            <EmptyState
              title="Chưa có kết quả phù hợp"
              description="Thử một từ khóa khác hoặc đóng góp bộ câu hỏi của bạn."
            />
          )}
          <div className="bank-grid">
            {items.map((item, index) =>
              item.type === "SESSION" && item.session ? (
                <article
                  className="surface collection-card"
                  key={item.session.session_id || index}
                >
                  <span className="collection-icon">
                    <Layers size={24} />
                  </span>
                  <div className="question-tags">
                    <span>{item.session.subject_name || "Bộ câu hỏi"}</span>
                    <StatusBadge value={item.session.status} />
                  </div>
                  <h2>{item.session.title || "Bộ câu hỏi chưa có tiêu đề"}</h2>
                  <p>{item.session.content}</p>
                  <div className="collection-footer">
                    <span>{item.session.question_count ?? "—"} câu hỏi</span>
                    {validId(item.session.session_id) && (
                      <Link
                        className="text-button"
                        to={`/practice/${item.session.session_id}`}
                      >
                        Mở bộ & luyện tập <ArrowRight size={16} />
                      </Link>
                    )}
                  </div>
                </article>
              ) : item.type === "QUESTION" && item.question ? (
                <article
                  className="surface collection-card"
                  key={item.question.question_id || index}
                >
                  <div className="question-tags">
                    <StatusBadge value={item.question.status} />
                    <span>{item.question.subject_name}</span>
                  </div>
                  <h2>{item.question.content || "Câu hỏi"}</h2>
                  <p>
                    {item.question.question_code}
                    {item.question.topic_name
                      ? ` · ${item.question.topic_name}`
                      : ""}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setSelected(item.question);
                      setInsights(false);
                    }}
                  >
                    Xem chi tiết câu hỏi <ArrowRight size={16} />
                  </button>
                </article>
              ) : null,
            )}
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
      <section className="subject-catalog">
        <div className="section-title">
          <h2>Danh mục môn học</h2>
          <span className="muted">{subjects.data?.length ?? "—"} môn học</span>
        </div>
        {subjects.isPending ? (
          <Loading label="Đang tải môn học…" />
        ) : subjects.error ? (
          <QueryError
            error={subjects.error}
            retry={() => void subjects.refetch()}
          />
        ) : (
          <div className="subject-grid">
            {subjects.data?.map((subject) => (
              <Link
                to={`/submissions?subject=${subject.subject_id}`}
                className="surface subject-card"
                key={subject.subject_id}
              >
                <BookOpen size={20} />
                <div>
                  <strong>{subject.name}</strong>
                  <span>{subject.code} · Xem bộ của tôi theo môn</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AcademicPage>
  );
}
