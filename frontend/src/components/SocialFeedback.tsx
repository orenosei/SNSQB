import { BookOpen, RefreshCw } from "lucide-react";
import { ErrorNotice } from "./Feedback";
import { errorMessage } from "../lib/api";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="surface empty-state">
      <span className="welcome-icon">
        <BookOpen size={25} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
export function QueryError({
  error,
  retry,
  pending = false,
}: {
  error: unknown;
  retry: () => void;
  pending?: boolean;
}) {
  return (
    <div className="query-error">
      <ErrorNotice message={errorMessage(error)} />
      <button
        className="button button-secondary"
        disabled={pending}
        onClick={retry}
      >
        <RefreshCw size={15} />
        Thử lại
      </button>
    </div>
  );
}
export function LoadMore({
  hasNext,
  pending,
  load,
}: {
  hasNext: boolean;
  pending: boolean;
  load: () => void;
}) {
  return hasNext ? (
    <button
      className="button button-secondary load-more"
      disabled={pending}
      onClick={load}
    >
      {pending ? "Đang tải…" : "Xem thêm"}
    </button>
  ) : null;
}
export function PostSkeletons() {
  return (
    <div className="post-list" role="status" aria-label="Đang tải bảng tin">
      {[1, 2, 3].map((id) => (
        <div key={id} className="surface post-skeleton" aria-hidden="true">
          <div />
          <span />
          <span />
          <p />
        </div>
      ))}
    </div>
  );
}
