import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Modal } from "../../components/Modal";
import { ErrorNotice } from "../../components/Feedback";
import { QueryError } from "../../components/SocialFeedback";
import { errorMessage } from "../../lib/api";
import { validId } from "../../lib/cursor";
import { useSubjects } from "../academic/api";
import { createClass, enrollStudents, refreshClasses } from "./api";

export function CreateClassDialog({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [subject, setSubject] = useState("");
  const subjects = useSubjects();
  const client = useQueryClient();
  const navigate = useNavigate();
  const save = useMutation({
    mutationFn: () =>
      createClass({ class_code: code.trim(), subject_id: Number(subject) }),
    onSuccess: async (result) => {
      await refreshClasses(client);
      onClose();
      if (validId(result?.course_class_id))
        navigate(`/lecturer/course-classes/${result.course_class_id}`);
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !save.isPending &&
      code.trim() &&
      code.trim().length <= 50 &&
      subjects.data?.some((item) => item.subject_id === Number(subject))
    )
      save.mutate();
  }
  return (
    <Modal title="Tạo lớp học phần" pending={save.isPending} onClose={onClose}>
      <p className="muted">
        Lớp thuộc học kỳ đang kích hoạt. Bạn là giảng viên phụ trách.
      </p>
      <form className="workspace-form" onSubmit={submit}>
        <fieldset disabled={save.isPending}>
          <label className="field">
            Mã lớp học phần
            <input
              autoFocus
              required
              maxLength={50}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <label className="field">
            Môn học
            <select
              aria-label="Môn học"
              required
              value={subject}
              disabled={subjects.isPending || subjects.isError}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">Chọn môn học</option>
              {subjects.data?.map((item) => (
                <option key={item.subject_id} value={item.subject_id}>
                  {item.code} · {item.name}
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
          {subjects.isSuccess && !subjects.data?.length && (
            <p className="notice">Chưa có môn học để tạo lớp.</p>
          )}
          {save.isError && <ErrorNotice message={errorMessage(save.error)} />}
          <div className="form-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              className="button button-primary"
              disabled={
                subjects.isPending || subjects.isError || !subjects.data?.length
              }
            >
              {save.isPending ? "Đang tạo…" : "Tạo lớp"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export function EnrollDialog({
  classId,
  onClose,
}: {
  classId: number;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const codes = [
    ...new Set(
      draft
        .split(/[\s,;]+/)
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  ];
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: () => enrollStudents(classId, codes),
    onSuccess: async () => {
      await refreshClasses(client);
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!save.isPending && codes.length) save.mutate();
  }
  return (
    <Modal
      title="Thêm sinh viên vào lớp"
      pending={save.isPending}
      onClose={onClose}
    >
      <p className="muted">
        Nhập mã số sinh viên, phân cách bằng xuống dòng, dấu phẩy hoặc khoảng
        trắng.
      </p>
      <form className="workspace-form" onSubmit={submit}>
        <fieldset disabled={save.isPending}>
          <label className="field">
            Danh sách mã số sinh viên
            <textarea
              autoFocus
              required
              rows={7}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                save.reset();
              }}
            />
          </label>
          <p className="field-hint">{codes.length} mã không trùng lặp.</p>
          {save.isError && <ErrorNotice message={errorMessage(save.error)} />}
          {save.isSuccess && (
            <div role="status" className="notice notice-success">
              <div>
                <strong>Kết quả ghi danh</strong>
                <p>
                  Đã thêm: {save.data?.total_enrolled ?? "—"} · Đã có trong lớp:{" "}
                  {save.data?.already_enrolled_count ?? "—"} · Không tìm thấy:{" "}
                  {save.data?.not_found_count ?? "—"}
                </p>
                {!!save.data?.not_found_codes?.length && (
                  <p>Kiểm tra lại: {save.data.not_found_codes.join(", ")}</p>
                )}
              </div>
            </div>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              Đóng
            </button>
            <button
              className="button button-primary"
              disabled={!codes.length || save.isSuccess}
            >
              {save.isPending ? "Đang ghi danh…" : "Ghi danh sinh viên"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
