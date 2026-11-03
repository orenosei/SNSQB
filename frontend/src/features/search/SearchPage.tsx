import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { SearchForm } from "../../components/SearchForm";
import { Avatar } from "../../components/Avatar";
import { Loading } from "../../components/Feedback";
import {
  EmptyState,
  LoadMore,
  QueryError,
} from "../../components/SocialFeedback";
import { formatTime, validId } from "../../lib/cursor";
import { UserCard } from "../people/UserCard";
import {
  deleteSavedSearch,
  getSavedSearches,
  useSearch,
  searchTypes,
} from "./api";
import { errorMessage } from "../../lib/api";
import { ErrorNotice } from "../../components/Feedback";
const AcademicSearchResult = lazy(() =>
  import("./AcademicSearchResult").then((module) => ({
    default: module.AcademicSearchResult,
  })),
);
const typeLabels = {
  ALL: "Tất cả",
  USER: "Người dùng",
  POST: "Bài viết",
  QUESTION: "Câu hỏi",
  SESSION: "Bộ câu hỏi",
  SUBJECT: "Môn học",
};

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const term = params.get("query") || "";
  const type =
    searchTypes.find((value) => value === params.get("type")) || "USER";
  const [draft, setDraft] = useState(term);
  useEffect(() => {
    setDraft(term);
  }, [term]);
  const query = useSearch(term, type);
  const saved = useQuery({
    queryKey: ["saved-searches"],
    queryFn: getSavedSearches,
  });
  const client = useQueryClient();
  const removeSaved = useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["saved-searches"] }),
  });
  const items = query.data?.pages.flatMap((page) => page.items || []) || [];
  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft.trim()) setParams({ query: draft.trim(), type });
  }
  return (
    <div className="social-page search-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow text-brand">KHÁM PHÁ CỘNG ĐỒNG</p>
          <h1>Tìm kiếm</h1>
          <p className="muted social-subtitle">
            Tìm bạn học, bài viết, câu hỏi và môn học trong cùng một không gian.
          </p>
        </div>
      </div>
      <SearchForm
        label="Từ khóa tìm kiếm"
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        placeholder="Nhập tên, chủ đề hoặc nội dung…"
        required
      />
      {!!saved.data?.saved_searches?.length && (
        <section className="surface search-saved">
          <h2>Tìm kiếm gần đây</h2>
          <div className="search-chip-list">
            {saved.data.saved_searches.map((item) => (
              <span key={item.saved_search_id} className="search-chip">
                <button
                  onClick={() =>
                    item.query_text &&
                    setParams({ query: item.query_text, type })
                  }
                >
                  {item.query_text}
                </button>
                <button
                  aria-label={`Xóa ${item.query_text} khỏi lịch sử`}
                  disabled={removeSaved.isPending}
                  onClick={() =>
                    item.saved_search_id &&
                    removeSaved.mutate(item.saved_search_id)
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>
      )}
      {!!saved.data?.trending_searches?.length && (
        <section className="surface search-saved">
          <h2>Đang được tìm kiếm</h2>
          <div className="search-chip-list">
            {saved.data.trending_searches.map((item) => (
              <button
                key={item}
                className="search-chip"
                onClick={() => setParams({ query: item, type })}
              >
                {item}
              </button>
            ))}
          </div>
        </section>
      )}
      {removeSaved.isError && (
        <ErrorNotice message={errorMessage(removeSaved.error)} />
      )}
      {saved.isError && (
        <QueryError error={saved.error} retry={() => void saved.refetch()} />
      )}
      <nav className="social-tabs" aria-label="Loại kết quả tìm kiếm">
        {searchTypes.map((value) => (
          <button
            key={value}
            className={type === value ? "tab-active" : ""}
            aria-pressed={type === value}
            onClick={() =>
              setParams({ ...(term ? { query: term } : {}), type: value })
            }
          >
            {typeLabels[value]}
          </button>
        ))}
      </nav>
      {!term.trim() ? (
        <EmptyState
          title="Một kết nối mới bắt đầu từ tìm kiếm"
          description="Nhập từ khóa để tìm người dùng hoặc bài viết trong cộng đồng SNSQB."
        />
      ) : query.isPending ? (
        <Loading label="Đang tìm kiếm…" />
      ) : (
        <>
          <p className="search-summary">
            Kết quả cho “{term}”
            {query.data?.pages[0]?.total_hits !== undefined
              ? ` · ${query.data.pages[0].total_hits} kết quả`
              : ""}
          </p>
          {!items.length && !query.isError && (
            <EmptyState
              title="Chưa tìm thấy kết quả"
              description="Thử một từ khóa khác hoặc chuyển loại kết quả tìm kiếm."
            />
          )}
          <div className={type === "USER" ? "people-grid" : "post-list"}>
            {items.map((item, index) =>
              item.type === "USER" && item.user ? (
                <UserCard
                  key={`USER-${item.user.user_id || index}`}
                  person={item.user}
                  subtitle={item.user.school_faculty || item.user.bio}
                />
              ) : item.type === "POST" && item.post ? (
                <article
                  className="surface search-post"
                  key={`POST-${item.post.post_id || index}`}
                >
                  <div className="author-link">
                    <Avatar
                      name={item.post.author_name}
                      url={item.post.author_avatar_url}
                    />
                    <div>
                      <strong>{item.post.author_name || "Thành viên"}</strong>
                      <time className="post-meta">
                        {formatTime(item.post.created_at)}
                      </time>
                    </div>
                  </div>
                  <p className="post-content">{item.post.content}</p>
                  <div className="search-post-footer">
                    <span>
                      {item.post.react_count ?? "—"} cảm xúc ·{" "}
                      {item.post.comment_count ?? "—"} bình luận
                    </span>
                    {validId(item.post.post_id) && (
                      <Link
                        className="text-button"
                        to={`/posts/${item.post.post_id}`}
                      >
                        Xem bài viết <ArrowRight size={16} />
                      </Link>
                    )}
                  </div>
                </article>
              ) : (
                <Suspense
                  key={`${item.type}-${item.question?.question_id || item.session?.session_id || item.subject?.subject_id || index}`}
                  fallback={<Loading label="Đang mở kết quả học tập…" />}
                >
                  <AcademicSearchResult item={item} />
                </Suspense>
              ),
            )}
          </div>
          {query.isError && (
            <QueryError
              error={query.error}
              retry={() =>
                void (query.isFetchNextPageError
                  ? query.fetchNextPage()
                  : query.refetch())
              }
            />
          )}
          <LoadMore
            hasNext={!!query.hasNextPage}
            pending={query.isFetchingNextPage}
            load={() => void query.fetchNextPage()}
          />
        </>
      )}
    </div>
  );
}
