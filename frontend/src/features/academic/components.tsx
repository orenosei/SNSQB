import type { ReactNode } from "react";
import { BookOpen, CheckCircle2, GraduationCap } from "lucide-react";
import { NavLink } from "react-router";
import { useProfile } from "../profile/api";
import { imageUrl } from "../../components/Avatar";
import { Loading } from "../../components/Feedback";
import { QueryError } from "../../components/SocialFeedback";
import type { QuestionOption, SubjectResponse } from "./types";

export function AcademicPage({ children }: { children: ReactNode }) {
  const me = useProfile();
  return (
    <div className="academic-page">
      <nav className="academic-nav" aria-label="Không gian học tập">
        <NavLink to="/question-bank">
          <BookOpen size={17} />
          Khám phá
        </NavLink>
        <NavLink to="/submissions">Bộ câu hỏi của tôi</NavLink>
        {me.data?.role === "LECTURER" && (
          <>
            <NavLink to="/lecturer/reviews">Duyệt câu hỏi</NavLink>
            <NavLink to="/lecturer/exams">Đề thi</NavLink>
          </>
        )}
      </nav>
      {children}
    </div>
  );
}
export function LecturerOnly({ children }: { children: ReactNode }) {
  const me = useProfile();
  if (me.isPending) return <Loading label="Đang kiểm tra quyền truy cập…" />;
  if (me.isError)
    return <QueryError error={me.error} retry={() => void me.refetch()} />;
  return me.data?.role === "LECTURER" ? (
    <>{children}</>
  ) : (
    <div className="page-error">
      <div className="notice" role="alert">
        <GraduationCap size={20} />
        Chức năng này dành cho giảng viên.
      </div>
    </div>
  );
}
export const sessionStatus = {
  PENDING: "Chờ duyệt",
  REVIEWING: "Đang duyệt",
  RESOLVED: "Đã xử lý",
};
export const questionStatus = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};
export function StatusBadge({ value }: { value?: string }) {
  const labels: Record<string, string> = {
    ...sessionStatus,
    ...questionStatus,
  };
  return (
    <span
      className={`academic-badge status-${value?.toLowerCase() || "unknown"}`}
    >
      {value ? labels[value] || value : "Chưa có trạng thái"}
    </span>
  );
}
export function SubjectSelect({
  subjects,
  value,
  onChange,
  required = false,
  label = "Môn học",
  disabled = false,
}: {
  subjects?: SubjectResponse[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <label className="academic-select">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
      >
        <option value="">{required ? "Chọn môn học" : "Tất cả môn học"}</option>
        {subjects?.map((subject) => (
          <option key={subject.subject_id} value={subject.subject_id}>
            {subject.code} · {subject.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function QuestionContent({
  content,
  images,
  options,
  reveal = false,
}: {
  content?: string;
  images?: string[];
  options?: QuestionOption[];
  reveal?: boolean;
}) {
  return (
    <div className="question-content">
      <p className="question-statement">
        {content || "Chưa có nội dung câu hỏi."}
      </p>
      {!!images?.length && (
        <div className="question-images">
          {images.map((value, index) =>
            imageUrl(value) ? (
              <a
                href={imageUrl(value)}
                key={index}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={imageUrl(value)}
                  alt={`Hình minh họa câu hỏi ${index + 1}`}
                  loading="lazy"
                />
              </a>
            ) : null,
          )}
        </div>
      )}
      {options?.map((option, index) => (
        <div
          className={`question-option ${reveal && option.is_correct ? "option-correct" : ""}`}
          key={`${option.key}-${index}`}
        >
          <span className="option-key">{option.key || index + 1}</span>
          <div>
            <p>{option.text}</p>
            {imageUrl(option.media_url) && (
              <img
                src={imageUrl(option.media_url)}
                alt={`Hình phương án ${option.key || index + 1}`}
                loading="lazy"
              />
            )}
          </div>
          {reveal && option.is_correct && (
            <CheckCircle2
              size={18}
              aria-label="Đáp án đúng do tác giả cung cấp"
            />
          )}
        </div>
      ))}
    </div>
  );
}
