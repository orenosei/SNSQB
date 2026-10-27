import { AlertCircle, LoaderCircle } from "lucide-react";

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
