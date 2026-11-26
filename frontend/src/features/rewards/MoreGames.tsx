import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { LoadMore, QueryError } from "../../components/SocialFeedback";
import {
  api,
  ApiError,
  type ApiEnvelope,
  errorMessage,
  unwrap,
} from "../../lib/api";
import { formatTime, routeId, validId } from "../../lib/cursor";
import { useSubjects, useSubmissions } from "../academic/api";
import { QuestionContent } from "../academic/components";
import type { QuestionOption } from "../academic/types";
import { readRewards } from "./api";

type PredictionInput =
  | {
      session_id: number;
      predicted_llm_count: number;
      predicted_human_count: number;
    }
  | { subject_id: number; predicted_bank_size: number }
  | { minigame_session_id: number; selected_llm_question_ids: number[] };

function useGamePrediction(path: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: PredictionInput) =>
      unwrap(await api.post<ApiEnvelope<unknown>>(path, body)),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: ["rewards", "/games/my-predictions"],
      }),
  });
}

function CountPrediction({
  game,
}: {
  game: "approved-questions" | "bank-size";
}) {
  const approved = game === "approved-questions";
  const submissions = useSubmissions(undefined, undefined, approved);
  const subjects = useSubjects(!approved);
  const prediction = useGamePrediction(`/games/prediction/${game}`);
  const [target, setTarget] = useState("");
  const [count, setCount] = useState("");
  const [human, setHuman] = useState("");
  const id = routeId(target);
  const sessions =
    submissions.data?.pages
      .flatMap((page) => page.contents || [])
      .filter((item) => item.status !== "RESOLVED") || [];
  const options = approved
    ? sessions.map((session) => ({
        id: session.session_id,
        label: session.title || session.session_code,
      }))
    : subjects.data?.map((subject) => ({
        id: subject.subject_id,
        label: subject.name,
      }));
  const amount = Number(count);
  const humanAmount = Number(human);
  const valid = (number: number) =>
    Number.isInteger(number) && number >= 0 && number <= 2147483647;
  const canSubmit =
    id &&
    count !== "" &&
    valid(amount) &&
    (!approved || (human !== "" && valid(humanAmount)));
  return (
    <section className="surface rewards-panel">
      <h2>
        {approved
          ? "Dự đoán số câu được duyệt"
          : "Dự đoán quy mô ngân hàng câu hỏi"}
      </h2>
      {(approved ? submissions.isPending : subjects.isPending) && (
        <Loading label="Đang tải lựa chọn…" />
      )}
      {approved && submissions.isError && (
        <QueryError
          error={submissions.error}
          retry={() => void submissions.refetch()}
        />
      )}
      {!approved && subjects.isError && (
        <QueryError
          error={subjects.error}
          retry={() => void subjects.refetch()}
        />
      )}
      <form
        className="rewards-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit || prediction.isPending) return;
          prediction.mutate(
            approved
              ? {
                  session_id: id,
                  predicted_llm_count: amount,
                  predicted_human_count: humanAmount,
                }
              : { subject_id: id, predicted_bank_size: amount },
          );
        }}
      >
        <label>
          {approved ? "Bộ câu hỏi đã gửi" : "Môn học"}
          <select
            required
            value={target}
            onChange={(event) => {
              setTarget(event.target.value);
              prediction.reset();
            }}
          >
            <option value="">Chọn {approved ? "bộ câu hỏi" : "môn học"}</option>
            {options
              ?.filter((item) => validId(item.id))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label || `#${item.id}`}
                </option>
              ))}
          </select>
        </label>
        {approved && (
          <LoadMore
            hasNext={submissions.hasNextPage}
            pending={submissions.isFetchingNextPage}
            load={() => void submissions.fetchNextPage()}
          />
        )}
        <label>
          {approved
            ? "Số câu do AI tạo được duyệt"
            : "Số câu dự đoán cuối học kỳ"}
          <input
            type="number"
            min={0}
            max={2147483647}
            required
            value={count}
            onChange={(event) => setCount(event.target.value)}
          />
        </label>
        {approved && (
          <label>
            Số câu do con người tạo được duyệt{" "}
            <input
              type="number"
              min={0}
              max={2147483647}
              required
              value={human}
              onChange={(event) => setHuman(event.target.value)}
            />
          </label>
        )}
        <button
          className="button button-primary"
          disabled={!canSubmit || prediction.isPending || prediction.isSuccess}
        >
          Gửi dự đoán
        </button>
      </form>
      {prediction.isSuccess && <p role="status">Đã gửi dự đoán.</p>}
      {prediction.isError && (
        <ErrorNotice message={errorMessage(prediction.error)} />
      )}
    </section>
  );
}

type GameSession = {
  session_id?: number;
  end_time?: string;
  questions?: {
    question_id: number;
    content?: string;
    image_urls?: string[];
    options?: QuestionOption[];
  }[];
};

function IdentifyAI() {
  const [checked, setChecked] = useState<number[]>([]);
  const session = useQuery({
    queryKey: ["rewards", "game-6"],
    queryFn: ({ signal }) =>
      readRewards<GameSession>("/games/prediction/active-session", signal),
    retry: false,
  });
  const prediction = useGamePrediction("/games/prediction/submit");
  const data = session.data;
  return (
    <section className="surface rewards-panel">
      <h2>Nhận diện câu hỏi do AI tạo</h2>
      {session.isPending && <Loading label="Đang tải phiên chơi…" />}
      {session.isError &&
        (session.error instanceof ApiError && session.error.code === "9994" ? (
          <p>Hiện chưa có phiên chơi mở.</p>
        ) : (
          <QueryError
            error={session.error}
            retry={() => void session.refetch()}
          />
        ))}
      {data && validId(data.session_id) && (
        <>
          <p>
            Chọn tất cả câu hỏi bạn cho là do AI tạo.{" "}
            {data.end_time && `Hạn gửi ${formatTime(data.end_time)}.`}
          </p>
          <fieldset
            disabled={prediction.isPending || prediction.isSuccess}
            className="rewards-form"
          >
            {data.questions?.map((question) => (
              <article
                className="surface rewards-panel"
                key={question.question_id}
              >
                <QuestionContent
                  content={question.content}
                  images={question.image_urls}
                  options={question.options}
                />
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={checked.includes(question.question_id)}
                    onChange={(event) =>
                      setChecked((ids) =>
                        event.target.checked
                          ? [...ids, question.question_id]
                          : ids.filter((id) => id !== question.question_id),
                      )
                    }
                  />
                  Tôi cho rằng câu này do AI tạo
                </label>
              </article>
            ))}
            <button
              className="button button-primary"
              disabled={!data.questions?.length}
              onClick={() =>
                prediction.mutate({
                  minigame_session_id: data.session_id!,
                  selected_llm_question_ids: checked,
                })
              }
            >
              Nộp dự đoán
            </button>
          </fieldset>
        </>
      )}
      {prediction.isSuccess && <p role="status">Đã nộp dự đoán.</p>}
      {prediction.isError && (
        <ErrorNotice message={errorMessage(prediction.error)} />
      )}
    </section>
  );
}

export function MoreGames() {
  const [game, setGame] = useState<"approved-questions" | "bank-size" | "ai">(
    "approved-questions",
  );
  return (
    <>
      <label className="rewards-filter">
        Chọn minigame
        <select
          value={game}
          onChange={(event) => setGame(event.target.value as typeof game)}
        >
          <option value="approved-questions">Số câu được duyệt</option>
          <option value="bank-size">Quy mô ngân hàng</option>
          <option value="ai">Nhận diện câu hỏi AI</option>
        </select>
      </label>
      {game === "ai" ? (
        <IdentifyAI />
      ) : (
        <CountPrediction key={game} game={game} />
      )}
    </>
  );
}
