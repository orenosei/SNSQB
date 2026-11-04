import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/Modal";
import { ErrorNotice } from "../../components/Feedback";
import { errorMessage } from "../../lib/api";
import { refreshPosts, updateLecturerNote } from "./api";

export function LecturerNoteEditor({
  postId,
  initial,
  onClose,
}: {
  postId: number;
  initial?: string;
  onClose: () => void;
}) {
  const [note, setNote] = useState(initial || "");
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: () => updateLecturerNote(postId, note.trim()),
    onSuccess: async () => {
      await refreshPosts(client);
      onClose();
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!save.isPending && note.trim()) save.mutate();
  }
  return (
    <Modal
      title="Nhận xét chuyên môn"
      pending={save.isPending}
      onClose={onClose}
    >
      <p className="muted">
        Góp ý của giảng viên giúp cộng đồng hiểu rõ nội dung hơn.
      </p>
      <form className="workspace-form" onSubmit={submit}>
        <fieldset disabled={save.isPending}>
          <label className="field">
            Nội dung nhận xét
            <textarea
              autoFocus
              required
              rows={5}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          {save.isError && <ErrorNotice message={errorMessage(save.error)} />}
          <div className="form-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              Hủy
            </button>
            <button className="button button-primary" disabled={!note.trim()}>
              {save.isPending ? "Đang lưu…" : "Lưu nhận xét"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
