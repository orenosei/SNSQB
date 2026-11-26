import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { LoadMore, QueryError } from "../../components/SocialFeedback";
import { api, type ApiEnvelope, errorMessage, unwrap } from "../../lib/api";
import { formatTime, validId } from "../../lib/cursor";
import { useProfile } from "../profile/api";
import { QuestionReport } from "./QuestionActions";
import { rateQuestion, useQuestionStats, useRatings } from "./api";

export function QuestionInsights({
  questionId,
  canRate = true,
}: {
  questionId: number;
  canRate?: boolean;
}) {
  const stats = useQuestionStats(questionId);
  const ratings = useRatings(questionId);
  const [rating, setRating] = useState("4");
  const [comment, setComment] = useState("");
  const [isError, setIsError] = useState(false);
  const client = useQueryClient();
  const reviewer = useProfile().data?.role === "LECTURER";
  const [reviewed, setReviewed] = useState<number[]>([]);
  const reviewError = useMutation({
    mutationFn: async ({
      userId,
      confirmed,
    }: {
      userId: number;
      confirmed: boolean;
    }) =>
      unwrap(
        await api.post<ApiEnvelope<unknown>>(
          `/questions/${questionId}/ratings/${userId}/review-error`,
          { is_comfirmed: confirmed },
        ),
      ),
    onSuccess: async (_data, { userId }) => {
      setReviewed((ids) => [...ids, userId]);
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["academic", "ratings", questionId],
        }),
        client.invalidateQueries({ queryKey: ["profile", "me"] }),
      ]);
    },
  });
  const mutation = useMutation({
    mutationFn: () =>
      rateQuestion(questionId, {
        rating: Number(rating),
        is_error: isError,
        ...(comment.trim() ? { comment } : {}),
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["academic", "stats", questionId],
        }),
        client.invalidateQueries({
          queryKey: ["academic", "ratings", questionId],
        }),
        client.invalidateQueries({ queryKey: ["academic", "practice"] }),
      ]);
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !mutation.isPending &&
      Number.isInteger(Number(rating)) &&
      Number(rating) >= 0 &&
      Number(rating) <= 4
    )
      mutation.mutate();
  }
  return (
    <section className="question-insights">
      <h3>Góc nhìn từ cộng đồng</h3>
      {canRate && <QuestionReport questionId={questionId} />}
      {stats.isPending ? (
        <Loading label="Đang tải thống kê…" />
      ) : stats.error ? (
        <QueryError error={stats.error} retry={() => void stats.refetch()} />
      ) : (
        <div className="academic-metrics">
          <div>
            <strong>{stats.data?.total_answer ?? "—"}</strong>
            <span>Lượt trả lời</span>
          </div>
          <div>
            <strong>
              {stats.data?.correct_rate === undefined
                ? "—"
                : new Intl.NumberFormat("vi-VN", {
                    style: "percent",
                    maximumFractionDigits: 1,
                  }).format(stats.data.correct_rate)}
            </strong>
            <span>Tỷ lệ đúng từ server</span>
          </div>
          <div>
            <strong>{stats.data?.rating_summary?.avg_rating ?? "—"}</strong>
            <span>Đánh giá trung bình</span>
          </div>
        </div>
      )}
      {canRate && !mutation.isSuccess && (
        <form
          className="rating-form"
          onSubmit={submit}
          aria-label="Đánh giá câu hỏi"
        >
          <label>
            Mức đánh giá
            <select
              aria-label="Mức đánh giá câu hỏi"
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              disabled={mutation.isPending}
            >
              {[0, 1, 2, 3, 4].map((value) => (
                <option value={value} key={value}>
                  {value} / 4
                </option>
              ))}
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={isError}
              onChange={(event) => setIsError(event.target.checked)}
              disabled={mutation.isPending}
            />
            Báo câu hỏi có lỗi (server sẽ chấm đánh giá 0)
          </label>
          <label>
            Nhận xét
            <textarea
              rows={2}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={mutation.isPending}
            />
          </label>
          <button
            className="button button-secondary"
            disabled={mutation.isPending}
          >
            <Star size={16} />
            {mutation.isPending ? "Đang gửi…" : "Gửi đánh giá"}
          </button>
        </form>
      )}
      {mutation.isSuccess && (
        <div className="notice notice-success" role="status">
          Đã gửi đánh giá. Trung bình mới:{" "}
          {mutation.data?.new_avg_rating ?? "—"} ·{" "}
          {mutation.data?.new_rating_count ?? "—"} lượt đánh giá.
        </div>
      )}
      {mutation.isError && (
        <ErrorNotice message={errorMessage(mutation.error)} />
      )}
      <div className="rating-list">
        {ratings.data?.pages
          .flatMap((page) => page.items || [])
          .map((item, index) => (
            <div key={`${item.user_id}-${index}`}>
              <strong>
                Thành viên #{item.user_id} · {item.rating ?? "—"}/4{" "}
                {item.is_error ? "· Báo lỗi" : ""}
              </strong>
              <p>{item.comment}</p>
              <time>{formatTime(item.created_at)}</time>
              {reviewer &&
                item.is_error &&
                validId(item.user_id) &&
                !reviewed.includes(item.user_id) && (
                  <div className="invite-actions">
                    <button
                      className="button button-secondary"
                      disabled={reviewError.isPending}
                      onClick={() =>
                        reviewError.mutate({
                          userId: item.user_id!,
                          confirmed: true,
                        })
                      }
                    >
                      Xác nhận có lỗi
                    </button>
                    <button
                      className="button button-secondary"
                      disabled={reviewError.isPending}
                      onClick={() =>
                        reviewError.mutate({
                          userId: item.user_id!,
                          confirmed: false,
                        })
                      }
                    >
                      Bác báo lỗi
                    </button>
                  </div>
                )}
            </div>
          ))}
        {reviewError.isError && (
          <ErrorNotice message={errorMessage(reviewError.error)} />
        )}
        {reviewError.isSuccess && (
          <p role="status">Đã ghi nhận kết quả xem xét báo lỗi.</p>
        )}
        {ratings.isError && (
          <QueryError
            error={ratings.error}
            retry={() => void ratings.refetch()}
          />
        )}
        <LoadMore
          hasNext={!!ratings.hasNextPage}
          pending={ratings.isFetchingNextPage}
          load={() => void ratings.fetchNextPage()}
        />
      </div>
    </section>
  );
}
