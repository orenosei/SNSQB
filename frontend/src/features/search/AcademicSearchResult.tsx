import { useState } from "react";
import { Link } from "react-router";
import { validId } from "../../lib/cursor";
import type { SearchResultItemDto } from "../social/types";
import { QuestionContent, StatusBadge } from "../academic/components";
import { QuestionInsights } from "../academic/QuestionInsights";
import { DiscussionToggle } from "../posts/DiscussionToggle";

export function AcademicSearchResult({ item }: { item: SearchResultItemDto }) {
  const [expanded, setExpanded] = useState(false);
  const [insights, setInsights] = useState(false);
  if (item.type === "QUESTION" && item.question) {
    const question = item.question;
    return (
      <article className="surface search-post">
        <div className="question-tags">
          <span>{question.subject_name || "Câu hỏi"}</span>
          <StatusBadge value={question.status} />
        </div>
        <h2>{question.question_code || "Câu hỏi cộng đồng"}</h2>
        {expanded ? (
          <>
            <QuestionContent
              content={question.content}
              images={question.image_urls}
              options={question.options}
            />
            {question.explanation && (
              <div className="answer-feedback">
                <strong>Giải thích được công bố</strong>
                <p>{question.explanation}</p>
              </div>
            )}
            {validId(question.question_id) && (
              <>
                <button
                  className="text-button"
                  aria-expanded={insights}
                  onClick={() => setInsights(!insights)}
                >
                  Thống kê và đánh giá
                </button>
                {insights && (
                  <QuestionInsights questionId={question.question_id} />
                )}
                <DiscussionToggle id={question.question_id} type="QUESTION" />
              </>
            )}
          </>
        ) : (
          <p className="post-content">{question.content}</p>
        )}
        <button
          className="text-button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Thu gọn câu hỏi" : "Xem chi tiết câu hỏi"}
        </button>
      </article>
    );
  }
  if (item.type === "SESSION" && item.session) {
    const session = item.session;
    return (
      <article className="surface search-post">
        <div className="question-tags">
          <span>{session.subject_name || "Bộ câu hỏi"}</span>
          <StatusBadge value={session.status} />
        </div>
        <h2>{session.title || "Bộ câu hỏi"}</h2>
        <p className="post-content">{session.content}</p>
        <div className="collection-footer">
          <span>{session.question_count ?? "—"} câu hỏi</span>
          {validId(session.session_id) && (
            <Link
              className="text-button"
              to={`/practice/${session.session_id}`}
            >
              Mở bộ & luyện tập →
            </Link>
          )}
        </div>
      </article>
    );
  }
  if (item.type === "SUBJECT" && item.subject)
    return (
      <article className="surface search-post">
        <p className="eyebrow text-brand">
          MÔN HỌC · {item.subject.subject_code}
        </p>
        <h2>{item.subject.subject_name || "Môn học"}</h2>
        {item.subject.subject_name && (
          <Link
            className="text-button"
            to={`/question-bank?type=SESSION&query=${encodeURIComponent(item.subject.subject_name)}`}
          >
            Tìm bộ câu hỏi theo tên môn →
          </Link>
        )}
      </article>
    );
  return null;
}
