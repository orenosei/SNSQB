import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowRight, Search } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { Loading } from "../../components/Feedback";
import {
  EmptyState,
  LoadMore,
  QueryError,
} from "../../components/SocialFeedback";
import { formatTime, validId } from "../../lib/cursor";
import { UserCard } from "../people/UserCard";
import { useSearch } from "./api";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const term = params.get("query") || "";
  const type = params.get("type") === "POST" ? "POST" : "USER";
  const [draft, setDraft] = useState(term);
  useEffect(() => {
    setDraft(term);
  }, [term]);
  const query = useSearch(term, type);
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
            Tìm bạn học và những chia sẻ hữu ích.
          </p>
        </div>
      </div>
      <form className="surface search-form" onSubmit={submit} role="search">
        <Search size={22} />
        <label className="sr-only" htmlFor="search-query">
          Từ khóa tìm kiếm
        </label>
        <input
          id="search-query"
          placeholder="Nhập tên, chủ đề hoặc nội dung bài viết…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          required
        />
        <button className="button button-primary" type="submit">
          Tìm kiếm
        </button>
      </form>
      <nav className="social-tabs" aria-label="Loại kết quả tìm kiếm">
        {(["USER", "POST"] as const).map((value) => (
          <button
            key={value}
            className={type === value ? "tab-active" : ""}
            aria-pressed={type === value}
            onClick={() =>
              setParams({ ...(term ? { query: term } : {}), type: value })
            }
          >
            {value === "USER" ? "Người dùng" : "Bài viết"}
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
                  key={item.user.user_id || index}
                  person={item.user}
                  subtitle={item.user.school_faculty || item.user.bio}
                />
              ) : item.type === "POST" && item.post ? (
                <article
                  className="surface search-post"
                  key={item.post.post_id || index}
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
    </div>
  );
}
