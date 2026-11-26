import { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Modal } from "../../components/Modal";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { LoadMore, QueryError } from "../../components/SocialFeedback";
import { api, type ApiEnvelope, errorMessage, unwrap } from "../../lib/api";
import { nextCursor, validId, type CursorPage } from "../../lib/cursor";
import type { Conversation } from "./api";

type Role = "CHIEF" | "VILLAGE_ELDER" | "VILLAGER";
type Member = { user_id: number; full_name?: string; role: Role };
type Candidate = { user_id: number; full_name?: string };
type GroupAction =
  | { type: "name"; name: string }
  | { type: "add"; ids: number[] }
  | { type: "role"; id: number; role: Role }
  | { type: "remove"; id: number }
  | { type: "leave"; successor?: number };

const roleLabels: Record<Role, string> = {
  CHIEF: "Tù trưởng",
  VILLAGE_ELDER: "Già làng",
  VILLAGER: "Dân làng",
};

function CandidatePicker({
  conversationId,
  selected,
  onChange,
}: {
  conversationId?: number;
  selected: Candidate[];
  onChange: (items: Candidate[]) => void;
}) {
  const [search, setSearch] = useState("");
  const results = useInfiniteQuery({
    queryKey: ["chat-candidates", conversationId, search],
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam, signal }) =>
      unwrap(
        await api.get<ApiEnvelope<CursorPage<Candidate>>>(
          "/conversations/group/candidates",
          {
            signal,
            params: {
              conversation_id: conversationId,
              search: search.trim(),
              after: pageParam,
              limit: 20,
            },
          },
        ),
      ),
    getNextPageParam: (page, _pages, cursor) => nextCursor(page, cursor),
  });
  const candidates =
    results.data?.pages.flatMap((page) => page.items || []) || [];
  return (
    <div className="rewards-form">
      <label>
        Tìm người để mời
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {!!selected.length && (
        <ul>
          {selected.map((item) => (
            <li key={item.user_id}>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  onChange(
                    selected.filter(
                      (person) => person.user_id !== item.user_id,
                    ),
                  )
                }
              >
                Bỏ chọn {item.full_name || `#${item.user_id}`}
              </button>
            </li>
          ))}
        </ul>
      )}
      {results.isPending && <Loading label="Đang tìm người dùng…" />}
      {results.isError && (
        <QueryError
          error={results.error}
          retry={() =>
            void (results.isFetchNextPageError
              ? results.fetchNextPage()
              : results.refetch())
          }
        />
      )}
      {results.isSuccess && !candidates.length && (
        <p>Chưa tìm thấy người phù hợp.</p>
      )}
      {candidates
        .filter((item) => validId(item.user_id))
        .map((item) => (
          <button
            type="button"
            className="button button-secondary"
            key={item.user_id}
            disabled={
              selected.length >= 99 ||
              selected.some((person) => person.user_id === item.user_id)
            }
            onClick={() => onChange([...selected, item])}
          >
            Chọn {item.full_name || `#${item.user_id}`}
          </button>
        ))}
      <LoadMore
        hasNext={results.hasNextPage}
        pending={results.isFetchingNextPage}
        load={() => void results.fetchNextPage()}
      />
    </div>
  );
}

export function CreateChatGroup({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (id: number) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Candidate[]>([]);
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.post<ApiEnvelope<{ conversation_id?: number }>>(
          "/conversations/group",
          {
            name: name.trim(),
            member_ids: selected.map((item) => item.user_id),
          },
        ),
      ),
    onSuccess: async (group) => {
      await client.invalidateQueries({ queryKey: ["conversations"] });
      if (validId(group?.conversation_id)) onOpen(group.conversation_id);
      else onClose();
    },
  });
  return (
    <Modal
      title="Tạo nhóm trò chuyện"
      pending={create.isPending}
      onClose={onClose}
    >
      <form
        className="rewards-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && selected.length >= 2 && !create.isPending)
            create.mutate();
        }}
      >
        <fieldset disabled={create.isPending} className="rewards-form">
          <label>
            Tên nhóm{" "}
            <input
              value={name}
              required
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <p>Chọn ít nhất hai người để tạo nhóm.</p>
          <CandidatePicker selected={selected} onChange={setSelected} />
          <button
            className="button button-primary"
            disabled={!name.trim() || selected.length < 2}
          >
            Tạo nhóm
          </button>
        </fieldset>
        {create.isError && <ErrorNotice message={errorMessage(create.error)} />}
      </form>
    </Modal>
  );
}

export function ManageChatGroup({
  group,
  userId,
  onClose,
  onLeave,
}: {
  group: Conversation & { conversation_id: number };
  userId?: number;
  onClose: () => void;
  onLeave: () => void;
}) {
  const id = group.conversation_id;
  const path = `/conversations/${id}`;
  const key = ["chat-members", id];
  const client = useQueryClient();
  const [name, setName] = useState(group.display_name || "");
  const [selected, setSelected] = useState<Candidate[]>([]);
  const [adding, setAdding] = useState(false);
  const [successor, setSuccessor] = useState("");
  const [confirming, setConfirming] = useState<GroupAction>();
  const roster = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) =>
      unwrap(
        await api.get<ApiEnvelope<Member[]>>(`${path}/members`, { signal }),
      ),
  });
  const members = roster.data || [];
  const myRole = members.find((item) => item.user_id === userId)?.role;
  const mayManage = myRole === "CHIEF" || myRole === "VILLAGE_ELDER";
  const change = useMutation({
    mutationFn: async (action: GroupAction) => {
      switch (action.type) {
        case "name":
          unwrap(
            await api.put<ApiEnvelope<unknown>>(path, { name: action.name }),
          );
          break;
        case "remove":
          unwrap(
            await api.delete<ApiEnvelope<unknown>>(
              `${path}/members/${action.id}`,
            ),
          );
          break;
        case "role":
          unwrap(
            await api.put<ApiEnvelope<unknown>>(
              `${path}/members/${action.id}/role`,
              { role: action.role },
            ),
          );
          break;
        case "leave":
          unwrap(
            await api.post<ApiEnvelope<unknown>>(
              `${path}/leave`,
              action.successor ? { new_chief_id: action.successor } : {},
            ),
          );
          break;
        case "add":
          return unwrap(
            await api.post<
              ApiEnvelope<{
                added_members?: Member[];
                failed_members?: { user_id?: number; reason?: string }[];
                invited_member_count?: number;
              }>
            >(`${path}/members`, { user_ids: action.ids }),
          );
      }
    },
    onSuccess: async (_data, action) => {
      setConfirming(undefined);
      if (action.type === "add") {
        setSelected([]);
        setAdding(false);
      }
      if (action.type === "leave") {
        client.removeQueries({ queryKey: ["chat-messages", id] });
        client.removeQueries({ queryKey: key });
        onLeave();
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: ["conversations"] }),
        client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({ queryKey: ["chat-candidates", id] }),
      ]);
    },
  });
  return (
    <Modal title="Quản lý nhóm" onClose={onClose} pending={change.isPending}>
      {roster.isPending && <Loading label="Đang tải thành viên…" />}
      {roster.isError && (
        <QueryError error={roster.error} retry={() => void roster.refetch()} />
      )}
      <fieldset
        disabled={change.isPending || !!confirming}
        className="rewards-form"
      >
        {mayManage && (
          <form
            className="rewards-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim())
                change.mutate({ type: "name", name: name.trim() });
            }}
          >
            <label>
              Tên nhóm{" "}
              <input
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <button
              className="button button-secondary"
              disabled={!name.trim() || name.trim() === group.display_name}
            >
              Lưu tên
            </button>
          </form>
        )}
        <ul className="rewards-list">
          {members.map((member) => (
            <li className="invite-row" key={member.user_id}>
              <div>
                <strong>{member.full_name || `#${member.user_id}`}</strong>
                <p>{roleLabels[member.role]}</p>
                {member.user_id !== userId && myRole === "CHIEF" && (
                  <label>
                    Vai trò của {member.full_name || member.user_id}
                    <select
                      value={member.role}
                      onChange={(event) =>
                        setConfirming({
                          type: "role",
                          id: member.user_id,
                          role: event.target.value as Role,
                        })
                      }
                    >
                      {Object.entries(roleLabels).map(([role, label]) => (
                        <option key={role} value={role}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {member.user_id !== userId &&
                  (myRole === "CHIEF" ||
                    (myRole === "VILLAGE_ELDER" &&
                      member.role === "VILLAGER")) && (
                    <button
                      className="text-button"
                      onClick={() =>
                        setConfirming({ type: "remove", id: member.user_id })
                      }
                    >
                      Xóa khỏi nhóm
                    </button>
                  )}
              </div>
            </li>
          ))}
        </ul>
        {mayManage && (
          <button
            className="button button-secondary"
            onClick={() => setAdding(!adding)}
          >
            {adding ? "Đóng danh sách mời" : "Mời thành viên"}
          </button>
        )}
        {mayManage && adding && (
          <>
            <CandidatePicker
              conversationId={id}
              selected={selected}
              onChange={setSelected}
            />
            <button
              className="button button-primary"
              disabled={!selected.length}
              onClick={() =>
                change.mutate({
                  type: "add",
                  ids: selected.map((item) => item.user_id),
                })
              }
            >
              Thêm hoặc gửi lời mời
            </button>
          </>
        )}
        {myRole === "CHIEF" && members.length > 1 && (
          <label>
            Người thay thế khi bạn rời nhóm
            <select
              value={successor}
              onChange={(event) => setSuccessor(event.target.value)}
            >
              <option value="">Chọn tù trưởng mới</option>
              {members
                .filter((item) => item.user_id !== userId)
                .map((item) => (
                  <option key={item.user_id} value={item.user_id}>
                    {item.full_name || item.user_id}
                  </option>
                ))}
            </select>
          </label>
        )}
        {myRole && (
          <button
            className="button button-secondary"
            onClick={() =>
              setConfirming({
                type: "leave",
                successor: Number(successor) || undefined,
              })
            }
          >
            Rời nhóm
          </button>
        )}
      </fieldset>
      {confirming && (
        <div className="notice">
          <p>
            {confirming.type === "role"
              ? "Xác nhận đổi vai trò thành viên?"
              : confirming.type === "remove"
                ? "Xác nhận xóa thành viên khỏi nhóm?"
                : "Xác nhận rời nhóm?"}
          </p>
          <div className="invite-actions">
            <button
              className="button button-secondary"
              disabled={change.isPending}
              onClick={() => setConfirming(undefined)}
            >
              Hủy
            </button>
            <button
              className="button button-primary"
              disabled={change.isPending}
              onClick={() => change.mutate(confirming)}
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
      {change.isError && <ErrorNotice message={errorMessage(change.error)} />}
      {change.data && (
        <>
          <p role="status">
            Đã thêm {change.data.added_members?.length || 0} · Đã mời{" "}
            {change.data.invited_member_count || 0} · Không thêm được{" "}
            {change.data.failed_members?.length || 0}
          </p>
          {change.data.failed_members?.map((item, index) => (
            <p key={item.user_id ?? index}>
              #{item.user_id} · {item.reason || "Không thể thêm vào nhóm"}
            </p>
          ))}
        </>
      )}
    </Modal>
  );
}
