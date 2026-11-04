import { AlertCircle, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export function StatusNotice({ children }: { children: ReactNode }) {
  return (
    <div className="notice notice-success" role="status">
      {children}
    </div>
  );
}

export function ListSkeleton({
  label = "Đang tải danh sách…",
}: {
  label?: string;
}) {
  return (
    <div role="status" aria-label={label} className="list-skeleton">
      {[0, 1, 2].map((row) => (
        <div className="surface skeleton-row" aria-hidden="true" key={row}>
          <span />
          <div>
            <i />
            <i />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={19} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function Loading({ label = "Đang tải hồ sơ…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="animate-spin" aria-hidden="true" size={27} />
      <span>{label}</span>
    </div>
  );
}
