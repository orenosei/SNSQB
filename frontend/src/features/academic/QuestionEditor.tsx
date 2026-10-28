import { useId, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { ErrorNotice } from "../../components/Feedback";
import { errorMessage } from "../../lib/api";
import { uploadMedia } from "../media/api";
import type { MySubmissionQuestionDto, QuestionOption } from "./types";

export interface QuestionDraft {
  question_id?: number;
  content: string;
  images: string;
  explanation: string;
  source: "LLM" | "HOMO_SAPIENS";
  confidence: string;
  options: QuestionOption[];
}
export const emptyQuestion = (): QuestionDraft => ({
  content: "",
  images: "",
  explanation: "",
  source: "HOMO_SAPIENS",
  confidence: "",
  options: [
    { key: "A", text: "", is_correct: false },
    { key: "B", text: "", is_correct: false },
  ],
});
export const toDraft = (question: MySubmissionQuestionDto): QuestionDraft => ({
  question_id: question.question_id,
  content: question.content || "",
  images: question.image_urls?.join("\n") || "",
  explanation: question.explanation || "",
  source: question.source || "HOMO_SAPIENS",
  confidence:
    question.confidence_score === undefined
      ? ""
      : String(question.confidence_score),
  options: question.options?.map((option) => ({ ...option })) || [],
});
export const imageLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
export function validateQuestion(question: QuestionDraft) {
  if (!question.content.trim()) return "Vui lòng nhập nội dung câu hỏi.";
  if (!question.options.length) return "Mỗi câu hỏi cần ít nhất một phương án.";
  if (
    question.options.some(
      (option) =>
        !option.key?.trim() || (!option.text?.trim() && !option.media_url),
    )
  )
    return "Mỗi phương án cần có khóa và nội dung chữ hoặc ảnh.";
  const keys = question.options.map((option) => option.key?.trim());
  if (new Set(keys).size !== keys.length)
    return "Khóa các phương án trong một câu hỏi phải khác nhau.";
  if (!question.options.some((option) => option.is_correct))
    return "Hãy đánh dấu ít nhất một đáp án đúng.";
  if (
    question.confidence !== "" &&
    (!Number.isFinite(Number(question.confidence)) ||
      Number(question.confidence) < 0 ||
      Number(question.confidence) > 4)
  )
    return "Mức tự tin phải nằm trong khoảng 0 đến 4.";
  for (const value of [
    ...imageLines(question.images),
    ...question.options.map((option) => option.media_url).filter(Boolean),
  ]) {
    try {
      if (!["http:", "https:"].includes(new URL(value!).protocol))
        return "Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://.";
    } catch {
      return "Đường dẫn ảnh không hợp lệ.";
    }
  }
  return "";
}

export function QuestionEditor({
  value,
  onChange,
  index = 0,
  disabled = false,
  compact = false,
  onUploading,
}: {
  onUploading?: (pending: boolean) => void;
  value: QuestionDraft;
  onChange: (value: QuestionDraft) => void;
  index?: number;
  disabled?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith("image/"))
        throw new Error("Chỉ chọn ảnh minh họa cho câu hỏi.");
      return uploadMedia(file, "QUESTION");
    },
    onMutate: () => onUploading?.(true),
    onSettled: () => onUploading?.(false),
    onSuccess: (media) =>
      onChange({
        ...value,
        images: [...imageLines(value.images), media.url!].join("\n"),
      }),
  });
  const pending = disabled || upload.isPending;
  function optionChange(position: number, patch: Partial<QuestionOption>) {
    onChange({
      ...value,
      options: value.options.map((option, item) =>
        item === position ? { ...option, ...patch } : option,
      ),
    });
  }
  return (
    <fieldset className="question-editor" disabled={pending}>
      <legend>Câu hỏi {index + 1}</legend>
      <div className="field">
        <label htmlFor={`${id}-content`}>Nội dung câu hỏi {index + 1}</label>
        <textarea
          id={`${id}-content`}
          rows={3}
          required
          value={value.content}
          onChange={(event) =>
            onChange({ ...value, content: event.target.value })
          }
          placeholder="Viết một câu hỏi rõ ràng, có ý nghĩa…"
        />
      </div>
      <div className="option-editor-list">
        {value.options.map((option, position) => (
          <div className="option-editor" key={position}>
            <div className="option-editor-main">
              <label>
                <span className="sr-only">
                  Khóa phương án {position + 1} câu {index + 1}
                </span>
                <input
                  className="option-key-input"
                  value={option.key || ""}
                  required
                  onChange={(event) =>
                    optionChange(position, { key: event.target.value })
                  }
                />
              </label>
              <label className="option-text-label">
                <span className="sr-only">
                  Nội dung phương án {position + 1} câu {index + 1}
                </span>
                <input
                  value={option.text || ""}
                  onChange={(event) =>
                    optionChange(position, { text: event.target.value })
                  }
                  placeholder="Nội dung phương án"
                />
              </label>
              <label className="check-label option-correct-toggle">
                <input
                  type="checkbox"
                  checked={!!option.is_correct}
                  onChange={(event) =>
                    optionChange(position, { is_correct: event.target.checked })
                  }
                />
                <span>Đúng</span>
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label={`Gỡ phương án ${position + 1} câu ${index + 1}`}
                onClick={() =>
                  onChange({
                    ...value,
                    options: value.options.filter(
                      (_, item) => item !== position,
                    ),
                  })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
            <label className="option-image-label">
              <span>Ảnh phương án {position + 1} (tùy chọn)</span>
              <input
                type="url"
                placeholder="https://…"
                value={option.media_url || ""}
                onChange={(event) =>
                  optionChange(position, { media_url: event.target.value })
                }
              />
            </label>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="text-button add-option"
        onClick={() => {
          let position = value.options.length;
          let key = "";
          do {
            key =
              position < 26
                ? String.fromCharCode(65 + position)
                : String(position + 1);
            position++;
          } while (value.options.some((option) => option.key === key));
          onChange({
            ...value,
            options: [...value.options, { key, text: "", is_correct: false }],
          });
        }}
      >
        <Plus size={15} />
        Thêm phương án
      </button>
      <div className="field">
        <label htmlFor={`${id}-explanation`}>Giải thích câu {index + 1}</label>
        <textarea
          id={`${id}-explanation`}
          rows={2}
          value={value.explanation}
          onChange={(event) =>
            onChange({ ...value, explanation: event.target.value })
          }
        />
      </div>
      {!compact && (
        <>
          <div className="academic-form-grid">
            <label>
              Nguồn câu {index + 1}
              <select
                aria-label={`Nguồn câu ${index + 1}`}
                value={value.source}
                onChange={(event) =>
                  onChange({
                    ...value,
                    source: event.target.value as QuestionDraft["source"],
                  })
                }
              >
                <option value="HOMO_SAPIENS">Tự biên soạn</option>
                <option value="LLM">Do AI/LLM tạo</option>
              </select>
            </label>
            <label>
              Mức tự tin câu {index + 1} (0–4)
              <input
                type="number"
                min={0}
                max={4}
                step="any"
                value={value.confidence}
                onChange={(event) =>
                  onChange({ ...value, confidence: event.target.value })
                }
              />
            </label>
          </div>
          <div className="field">
            <label htmlFor={`${id}-images`}>Ảnh minh họa câu {index + 1}</label>
            <textarea
              id={`${id}-images`}
              rows={2}
              value={value.images}
              onChange={(event) =>
                onChange({ ...value, images: event.target.value })
              }
              placeholder="Mỗi dòng một URL ảnh có sẵn"
            />
            <button
              type="button"
              className="button button-secondary upload-question"
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus size={16} />
              {upload.isPending ? "Đang tải ảnh…" : "Tải ảnh minh họa"}
            </button>
            <input
              ref={fileInput}
              className="sr-only"
              type="file"
              accept="image/*"
              aria-label={`Chọn ảnh câu ${index + 1}`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
                event.target.value = "";
              }}
            />
          </div>
          {upload.isError && (
            <ErrorNotice message={errorMessage(upload.error)} />
          )}
        </>
      )}
    </fieldset>
  );
}
