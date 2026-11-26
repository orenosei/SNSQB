import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { ArrowRight, Layers } from "lucide-react";
import { SearchForm } from "../../components/SearchForm";
import { Loading } from "../../components/Feedback";
import {
  EmptyState,
  QueryError,
  LoadMore,
} from "../../components/SocialFeedback";
import { nextCursor, routeId, validId } from "../../lib/cursor";
import type { CursorPaginationDto } from "../social/types";
import { getAcademic, useSubjects } from "./api";
import { AcademicPage } from "./components";

interface PracticeSet {
  session_id: number;
  session_code?: string;
  title?: string;
  content?: string;
  subject_name?: string;
  question_counts?: number;
}

export function PracticeCatalogPage() {
  const [params, setParams] = useSearchParams();
  const term = params.get("q") || "";
  const [draft, setDraft] = useState(term);
  useEffect(() => setDraft(term), [term]);
  const subject = routeId(params.get("subject") || undefined);
  const subjects = useSubjects();
  const topics = useQuery({
    queryKey: ["academic", "topics", subject],
    enabled: subject !== undefined,
    queryFn: ({ signal }) =>
      getAcademic<{ id: number; name?: string; active?: boolean }[]>(
        `/subjects/${subject}/topics`,
        undefined,
        signal,
      ),
  });
  const practice = useInfiniteQuery({
    queryKey: ["academic", "practice-catalog", subject, term],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      getAcademic<{
        contents?: PracticeSet[];
        pagination?: CursorPaginationDto;
      }>(
        "/sessions/practice-catalog",
        {
          subject_id: subject,
          q: term.trim() || undefined,
          after: pageParam,
          limit: 20,
        },
        signal,
      ),
    getNextPageParam: (page, _pages, cursor) => nextCursor(page, cursor),
  });
  const sets =
    practice.data?.pages.flatMap((page) => page.contents || []) || [];
  return (
    <AcademicPage>
      <Link to="/question-bank" className="back-link">
        ← Ngân hàng câu hỏi
      </Link>
      <h1>Kho luyện tập</h1>
      <SearchForm
        label="Tìm bộ luyện tập"
        value={draft}
        onChange={setDraft}
        placeholder="Tiêu đề hoặc mã bộ câu hỏi…"
        onSubmit={(event) => {
          event.preventDefault();
          setParams({
            ...(subject ? { subject: String(subject) } : {}),
            ...(draft.trim() ? { q: draft.trim() } : {}),
          });
        }}
      />
      <label className="rewards-filter">
        Môn học
        <select
          value={subject || ""}
          onChange={(event) => {
            setParams({
              ...(event.target.value ? { subject: event.target.value } : {}),
              ...(term ? { q: term } : {}),
            });
          }}
        >
          <option value="">Tất cả môn học</option>
          {subject &&
            !subjects.data?.some((item) => item.subject_id === subject) && (
              <option value={subject}>Môn học #{subject}</option>
            )}
          {subjects.data
            ?.filter((item) => validId(item.subject_id))
            .map((item) => (
              <option key={item.subject_id} value={item.subject_id}>
                {item.name}
              </option>
            ))}
        </select>
      </label>
      {subjects.isError && (
        <QueryError
          error={subjects.error}
          retry={() => void subjects.refetch()}
        />
      )}
      {subject && (
        <section className="surface rewards-panel">
          <h2>Chủ đề của môn học</h2>
          {topics.isPending ? (
            <Loading label="Đang tải chủ đề…" />
          ) : topics.isError ? (
            <QueryError
              error={topics.error}
              retry={() => void topics.refetch()}
            />
          ) : topics.data?.some(
              (topic) => topic.active !== false && topic.name,
            ) ? (
            <ul className="practice-topics">
              {topics.data
                .filter((topic) => topic.active !== false && topic.name)
                .map((topic) => (
                  <li key={topic.id} className="subject-pill">
                    {topic.name}
                  </li>
                ))}
            </ul>
          ) : (
            <p>Chưa có chủ đề đang hoạt động.</p>
          )}
        </section>
      )}
      {practice.isPending ? (
        <Loading label="Đang tải bộ luyện tập…" />
      ) : (
        <>
          {!sets.length && !practice.isError && (
            <EmptyState
              title="Chưa tìm thấy bộ luyện tập"
              description="Thử đổi môn học hoặc từ khóa."
            />
          )}
          <div className="bank-grid">
            {sets.map((item) => (
              <article
                className="surface collection-card"
                key={item.session_id}
              >
                <span className="collection-icon">
                  <Layers size={24} />
                </span>
                <div className="question-tags">
                  {item.subject_name && <span>{item.subject_name}</span>}
                  {item.session_code && <span>{item.session_code}</span>}
                </div>
                <h2>{item.title || "Bộ câu hỏi luyện tập"}</h2>
                {item.content && <p>{item.content}</p>}
                <div className="collection-footer">
                  <span>{item.question_counts ?? "—"} câu hỏi</span>
                  {validId(item.session_id) && (
                    <Link
                      className="text-button"
                      to={`/practice/${item.session_id}`}
                    >
                      Mở bộ & luyện tập <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          {practice.isError && (
            <QueryError
              error={practice.error}
              retry={() =>
                void (practice.isFetchNextPageError
                  ? practice.fetchNextPage()
                  : practice.refetch())
              }
            />
          )}
          <LoadMore
            hasNext={!!practice.hasNextPage}
            pending={practice.isFetchingNextPage}
            load={() => void practice.fetchNextPage()}
          />
        </>
      )}
    </AcademicPage>
  );
}
