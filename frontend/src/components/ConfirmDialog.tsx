import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { ErrorNotice } from "./Feedback";

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <div className="dialog-heading">
        <span className="welcome-icon">
          <AlertTriangle size={24} />
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Đóng xác nhận"
          disabled={pending}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <h2 id="confirm-title">{title}</h2>
      <p id="confirm-description">{description}</p>
      {error && <ErrorNotice message={error} />}
      <div className="form-actions">
        <button
          type="button"
          autoFocus
          className="button button-secondary"
          disabled={pending}
          onClick={onClose}
        >
          Hủy
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "Đang xử lý…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
