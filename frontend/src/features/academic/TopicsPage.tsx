import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { QueryError } from "../../components/SocialFeedback";
import { api, type ApiEnvelope, errorMessage, unwrap } from "../../lib/api";
import { routeId } from "../../lib/cursor";
import { AcademicPage, SubjectSelect } from "./components";
import { getAcademic, useSubjects } from "./api";

type Topic = { id: number; name: string; active: boolean; version: number };
type Changes = Pick<Topic, "name" | "active">;

function TopicForm({
  topic,
  pending,
  onSave,
}: {
  topic?: Topic;
  pending: boolean;
  onSave: (changes: Changes) => void;
}) {
  const [name, setName] = useState(topic?.name || "");
  const [active, setActive] = useState(topic?.active ?? true);
  return (
    <form
      className="surface rewards-panel rewards-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim() && !pending) onSave({ name: name.trim(), active });
      }}
    >
      <label>
        {topic ? "Tên chủ đề" : "Tên chủ đề mới"}
        <input
          required
          maxLength={100}
          value={name}
          disabled={pending}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={active}
          disabled={pending}
          onChange={(event) => setActive(event.target.checked)}
        />
        Đang hoạt động
      </label>
      <button
        className="button button-primary"
        disabled={
          pending ||
          !name.trim() ||
          (name.trim() === topic?.name && active === topic?.active)
        }
      >
        {topic ? "Lưu chủ đề" : "Tạo chủ đề"}
      </button>
    </form>
  );
}

function ManageTopics({ subjectId }: { subjectId: number }) {
  const client = useQueryClient();
  const path = `/lecturer/subjects/${subjectId}/topics`;
  const key = ["academic", "lecturer-topics", subjectId];
  const [created, setCreated] = useState(0);
  const topics = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getAcademic<Topic[]>(path, undefined, signal),
  });
  const save = useMutation({
    mutationFn: async ({
      changes,
      topic,
    }: {
      changes: Changes;
      topic?: Topic;
    }) =>
      unwrap(
        topic
          ? await api.put<ApiEnvelope<Topic>>(`${path}/${topic.id}`, {
              ...changes,
              version: topic.version,
            })
          : await api.post<ApiEnvelope<Topic>>(path, changes),
      ),
    onSuccess: async (_data, { topic }) => {
      if (!topic) setCreated((count) => count + 1);
      await Promise.all([
        client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({
          queryKey: ["academic", "topics", subjectId],
        }),
        client.invalidateQueries({
          queryKey: ["academic", "exam-stock", subjectId],
        }),
      ]);
    },
    onError: () => void topics.refetch(),
  });
  if (topics.isPending) return <Loading label="Đang tải chủ đề…" />;
  if (topics.isError)
    return (
      <QueryError error={topics.error} retry={() => void topics.refetch()} />
    );
  return (
    <>
      <TopicForm
        key={created}
        pending={save.isPending}
        onSave={(changes) => save.mutate({ changes })}
      />
      {save.isError && <ErrorNotice message={errorMessage(save.error)} />}
      {save.isSuccess && <p role="status">Đã lưu chủ đề.</p>}
      <div className="rewards-grid">
        {topics.data?.map((topic) => (
          <TopicForm
            key={`${topic.id}:${topic.version}`}
            topic={topic}
            pending={save.isPending}
            onSave={(changes) => save.mutate({ changes, topic })}
          />
        ))}
      </div>
    </>
  );
}
export function TopicsPage() {
  const [subject, setSubject] = useState("");
  const subjects = useSubjects();
  const subjectId = routeId(subject);
  return (
    <AcademicPage>
      <h1>Quản lý chủ đề</h1>
      <SubjectSelect
        subjects={subjects.data}
        value={subject}
        onChange={setSubject}
      />
      {subjects.isError && (
        <QueryError
          error={subjects.error}
          retry={() => void subjects.refetch()}
        />
      )}
      {subjectId && <ManageTopics key={subjectId} subjectId={subjectId} />}
    </AcademicPage>
  );
}
