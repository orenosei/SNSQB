import { useState, type ReactNode } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { Avatar } from "../../components/Avatar";
import { Loading, ErrorNotice } from "../../components/Feedback";
import {
  EmptyState,
  LoadMore,
  QueryError,
} from "../../components/SocialFeedback";
import { api, type ApiEnvelope, errorMessage, unwrap } from "../../lib/api";
import { formatTime, routeId, validId } from "../../lib/cursor";
import { useSubjects } from "../academic/api";
import { MoreGames } from "./MoreGames";
import { readRewards, useRewardsPages } from "./api";
import type { CursorPaginationDto } from "../social/types";

type CheckIn = {
  current_streak?: number;
  has_checked_in_today?: boolean;
  today?: string;
};
type CheckInResult = {
  coin_earned?: number;
  current_streak?: number;
  check_in_date?: string;
};
type PredictionClass = {
  course_class_id: number;
  class_code?: string;
  subject_name?: string;
  lecturer_name?: string;
  semester?: string;
  already_predicted?: boolean;
  predicted_count?: number;
};
type Prediction = {
  prediction_id: number;
  game_type?: string;
  status?: string;
  created_at?: string;
  is_correct?: boolean;
};
type RankingEntry = {
  rank?: number;
  user_id: number;
  full_name?: string;
  avatar_url?: string;
  frame_url?: string;
  total_points?: number;
  is_current_user?: boolean;
};

const gameNames: Record<string, string> = {
  GAME_1_PARTICIPANTS: "Số người nộp câu hỏi",
  GAME_2_APPROVED_QUESTIONS: "Số câu hỏi được duyệt",
  GAME_3_AUTHOR_CONFIDENCE: "Tự đánh giá câu hỏi",
  GAME_4_SUBJECT_BANK_SIZE: "Quy mô ngân hàng câu hỏi",
  GAME_5_REPORT_ERROR: "Báo lỗi câu hỏi",
  GAME_6_LLM_IDENTIFICATION: "Nhận diện câu hỏi do AI tạo",
};

export function RewardsTabs({
  tabs,
  active,
  href,
}: {
  tabs: readonly (readonly [string, string])[];
  active: string;
  href: string;
}) {
  return (
    <nav className="social-tabs" aria-label="Các mục trên trang">
      {tabs.map(([id, label]) => (
        <Link
          key={id}
          to={`${href}?tab=${id}`}
          className={id === active ? "tab-active" : ""}
          aria-current={id === active ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function RewardResults({
  query,
  empty,
  children,
}: {
  query: Pick<
    UseInfiniteQueryResult,
    | "isPending"
    | "isError"
    | "error"
    | "refetch"
    | "isFetchNextPageError"
    | "fetchNextPage"
    | "hasNextPage"
    | "isFetchingNextPage"
  >;
  empty: string;
  children: ReactNode;
}) {
  if (query.isPending) return <Loading label="Đang tải dữ liệu…" />;
  return (
    <>
      {children ||
        (!query.isError && (
          <EmptyState
            title={empty}
            description="Kết quả sẽ xuất hiện tại đây khi có dữ liệu."
          />
        ))}
      {query.isError && (
        <QueryError
          error={query.error}
          retry={() =>
            void (query.isFetchNextPageError
              ? query.fetchNextPage()
              : query.refetch())
          }
        />
      )}
      <LoadMore
        hasNext={!!query.hasNextPage}
        pending={query.isFetchingNextPage}
        load={() => void query.fetchNextPage()}
      />
    </>
  );
}

function CheckInPanel() {
  const client = useQueryClient();
  const path = "/games/check-in";
  const queryKey = ["rewards", path];
  const status = useQuery({
    queryKey,
    queryFn: ({ signal }) => readRewards<CheckIn>(path, signal),
  });
  const checkIn = useMutation({
    mutationFn: async () =>
      unwrap(await api.post<ApiEnvelope<CheckInResult>>(path)),
    onSuccess: async (data) => {
      client.setQueryData<CheckIn>(queryKey, (status) => ({
        ...status,
        today: data?.check_in_date ?? status?.today,
        current_streak: data?.current_streak ?? status?.current_streak,
        has_checked_in_today: true,
      }));
      await Promise.all([
        client.invalidateQueries({ queryKey }),
        client.invalidateQueries({ queryKey: ["rewards", "/cosmetics/shop"] }),
      ]);
    },
    onError: () => void client.invalidateQueries({ queryKey }),
  });
  if (status.isPending)
    return <Loading label="Đang tải trạng thái điểm danh…" />;
  if (status.isError)
    return (
      <QueryError error={status.error} retry={() => void status.refetch()} />
    );
  return (
    <section className="surface rewards-panel">
      <h2>Điểm danh hằng ngày</h2>
      <p>Chuỗi hiện tại: {status.data?.current_streak ?? 0} ngày</p>
      <button
        className="button button-primary"
        disabled={status.data?.has_checked_in_today || checkIn.isPending}
        onClick={() => checkIn.mutate()}
      >
        {status.data?.has_checked_in_today
          ? "Đã điểm danh hôm nay"
          : checkIn.isPending
            ? "Đang điểm danh…"
            : "Điểm danh"}
      </button>
      {status.data?.has_checked_in_today &&
        checkIn.isSuccess &&
        checkIn.data?.coin_earned != null && (
          <p role="status">Đã nhận {checkIn.data.coin_earned} xu.</p>
        )}
      {checkIn.isError && <ErrorNotice message={errorMessage(checkIn.error)} />}
    </section>
  );
}

function Leaderboard() {
  const [subject, setSubject] = useState("");
  const subjects = useSubjects();
  const subjectId = routeId(subject);
  const query = useRewardsPages<{
    entries?: RankingEntry[];
    my_rank?: { rank?: number; total_points?: number };
    pagination?: CursorPaginationDto;
  }>(
    "/games/leaderboard",
    subjectId
      ? { period: "SUBJECT", subject_id: subjectId }
      : { period: "SEMESTER" },
  );
  const entries = query.data?.pages.flatMap((page) => page.entries || []) || [];
  const rank = query.data?.pages[0]?.my_rank;
  return (
    <>
      <label className="rewards-filter">
        Phạm vi xếp hạng
        <select
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        >
          <option value="">Toàn học kỳ</option>
          {subjects.data
            ?.filter((item) => validId(item.subject_id))
            .map((item) => (
              <option key={item.subject_id} value={item.subject_id}>
                {item.name}
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
      {rank?.rank != null && (
        <p className="surface rewards-panel">
          Bạn xếp hạng <strong>{rank.rank}</strong> · {rank.total_points ?? 0}{" "}
          điểm
        </p>
      )}
      <RewardResults query={query} empty="Chưa có dữ liệu xếp hạng">
        {!!entries.length && (
          <ul className="surface rewards-list" aria-label="Bảng xếp hạng">
            {entries.map((entry) => (
              <li key={entry.user_id} className="rewards-row">
                <strong>#{entry.rank ?? "—"}</strong>
                <Avatar
                  name={entry.full_name}
                  url={entry.avatar_url}
                  frame={entry.frame_url}
                />
                <Link to={`/users/${entry.user_id}`}>
                  {entry.full_name || "Người dùng"}
                  {entry.is_current_user ? " (Bạn)" : ""}
                </Link>
                <span className="rewards-end">
                  {entry.total_points ?? 0} điểm
                </span>
              </li>
            ))}
          </ul>
        )}
      </RewardResults>
    </>
  );
}

function Predictions() {
  const client = useQueryClient();
  const [selected, setSelected] = useState("");
  const [count, setCount] = useState("");
  const path = "/games/prediction/game-1/classes";
  const queryKey = ["rewards", path];
  const classes = useQuery({
    queryKey,
    queryFn: ({ signal }) => readRewards<PredictionClass[]>(path, signal),
  });
  const history = useRewardsPages<{
    contents?: Prediction[];
    pagination?: CursorPaginationDto;
  }>("/games/my-predictions");
  const entries =
    history.data?.pages.flatMap((page) => page.contents || []) || [];
  const selectedClass = classes.data?.find(
    (item) => item.course_class_id === routeId(selected),
  );
  const prediction = useMutation({
    mutationFn: async (payload: {
      course_class_id: number;
      predicted_count: number;
    }) =>
      unwrap(
        await api.post<ApiEnvelope<Prediction>>(
          "/games/prediction/participants",
          payload,
        ),
      ),
    onSuccess: async () => {
      setCount("");
      await Promise.all([
        client.invalidateQueries({ queryKey }),
        client.invalidateQueries({
          queryKey: ["rewards", "/games/my-predictions"],
        }),
      ]);
    },
    onError: () => void client.invalidateQueries({ queryKey }),
  });
  const predictedCount = Number(count);
  const canSubmit =
    selectedClass &&
    !selectedClass.already_predicted &&
    validId(predictedCount) &&
    predictedCount <= 2147483647;
  return (
    <>
      <section className="surface rewards-panel">
        <h2>Dự đoán số người nộp câu hỏi</h2>
        <p>
          Chọn lớp học phần và dự đoán số sinh viên sẽ nộp câu hỏi vào ngày mai.
          Hạn gửi là 22:00.
        </p>
        {classes.isPending ? (
          <Loading label="Đang tải lớp học phần…" />
        ) : classes.isError ? (
          <QueryError
            error={classes.error}
            retry={() => void classes.refetch()}
          />
        ) : !classes.data?.length ? (
          <p>Chưa có lớp học phần để dự đoán.</p>
        ) : (
          <form
            className="rewards-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit && !prediction.isPending)
                prediction.mutate({
                  course_class_id: selectedClass.course_class_id,
                  predicted_count: predictedCount,
                });
            }}
          >
            <label>
              Lớp học phần
              <select
                value={selected}
                disabled={prediction.isPending}
                onChange={(event) => {
                  setSelected(event.target.value);
                  setCount("");
                  prediction.reset();
                }}
              >
                <option value="">Chọn lớp</option>
                {classes.data.map((item) => (
                  <option
                    key={item.course_class_id}
                    value={item.course_class_id}
                  >
                    {[item.class_code, item.subject_name, item.semester]
                      .filter(Boolean)
                      .join(" · ") || `Lớp ${item.course_class_id}`}
                  </option>
                ))}
              </select>
            </label>
            {selectedClass?.already_predicted ? (
              <p>
                Đã dự đoán
                {selectedClass.predicted_count != null
                  ? ` ${selectedClass.predicted_count} người`
                  : ""}
                .
              </p>
            ) : (
              <label>
                Số người dự đoán
                <input
                  type="number"
                  min="1"
                  max="2147483647"
                  required
                  value={count}
                  disabled={prediction.isPending}
                  onChange={(event) => setCount(event.target.value)}
                />
              </label>
            )}
            <button
              className="button button-primary"
              disabled={!canSubmit || prediction.isPending}
            >
              {prediction.isPending ? "Đang gửi…" : "Gửi dự đoán"}
            </button>
          </form>
        )}
        {prediction.isSuccess && <p role="status">Đã gửi dự đoán.</p>}
        {prediction.isError && (
          <ErrorNotice message={errorMessage(prediction.error)} />
        )}
      </section>
      <h2>Lịch sử dự đoán</h2>
      <RewardResults query={history} empty="Bạn chưa có dự đoán">
        {!!entries.length && (
          <ul className="surface rewards-list">
            {entries.map((item) => (
              <li key={item.prediction_id} className="rewards-row">
                <div>
                  <strong>
                    {gameNames[item.game_type || ""] || "Dự đoán"}
                  </strong>
                  <div className="muted">{formatTime(item.created_at)}</div>
                </div>
                <span className="rewards-end">
                  {item.status === "RESOLVED"
                    ? item.is_correct === true
                      ? "Dự đoán đúng"
                      : item.is_correct === false
                        ? "Dự đoán sai"
                        : "Đã có kết quả"
                    : "Đang chờ kết quả"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </RewardResults>
    </>
  );
}

const tabs = [
  ["check-in", "Điểm danh"],
  ["leaderboard", "Xếp hạng"],
  ["predictions", "Dự đoán"],
  ["games", "Minigame"],
] as const;

export function RewardsPage() {
  const [params] = useSearchParams();
  const active =
    tabs.find(([id]) => id === params.get("tab"))?.[0] || "check-in";
  return (
    <div className="social-page rewards-page">
      <h1>Hoạt động & thành tích</h1>
      <RewardsTabs tabs={tabs} active={active} href="/rewards" />
      {active === "check-in" ? (
        <CheckInPanel />
      ) : active === "leaderboard" ? (
        <Leaderboard />
      ) : (
        active === "predictions" ? <Predictions /> : <MoreGames />
      )}
    </div>
  );
}
