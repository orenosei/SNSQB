import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { Search, Users } from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorNotice, Loading } from "../../components/Feedback";
import {
  EmptyState,
  LoadMore,
  QueryError,
} from "../../components/SocialFeedback";
import { errorMessage } from "../../lib/api";
import { validId } from "../../lib/cursor";
import {
  usePeople,
  acceptFriendRequest,
  declineFriendRequest,
  withdrawFriendRequest,
  unfriend,
  unblock,
  refreshPeople,
  type PeopleKind,
  type PersonEntry,
} from "./api";
import { UserCard } from "./UserCard";

const tabs: { key: PeopleKind; label: string }[] = [
  { key: "friends", label: "Bạn bè" },
  { key: "received", label: "Lời mời đã nhận" },
  { key: "sent", label: "Lời mời đã gửi" },
  { key: "following", label: "Đang theo dõi" },
  { key: "followers", label: "Người theo dõi" },
  { key: "blocked", label: "Đã chặn" },
];

function FriendRequestCard({
  entry,
  kind,
}: {
  entry: PersonEntry;
  kind: PeopleKind;
}) {
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const mutation = useMutation({
    mutationFn: async (
      action: "accept" | "decline" | "withdraw" | "unfriend" | "unblock",
    ) => {
      const actions = {
        accept: acceptFriendRequest,
        decline: declineFriendRequest,
        withdraw: withdrawFriendRequest,
        unfriend,
        unblock,
      };
      await actions[action](entry.person.user_id!);
      return action;
    },
    onSuccess: async (action) => {
      setConfirm(false);
      await refreshPeople(client, action === "unblock");
    },
  });
  const disabled = mutation.isPending || !validId(entry.person.user_id);
  return (
    <UserCard person={entry.person} subtitle={entry.subtitle}>
      {kind === "received" && entry.status === "PENDING" && (
        <>
          <button
            className="button button-primary"
            disabled={disabled}
            onClick={() => mutation.mutate("accept")}
          >
            Chấp nhận
          </button>
          <button
            className="button button-secondary"
            disabled={disabled}
            onClick={() => {
              mutation.reset();
              setConfirm(true);
            }}
          >
            Từ chối
          </button>
        </>
      )}
      {kind === "sent" && (
        <span className="relationship-status">
          {entry.status === "PENDING"
            ? "Đang chờ phản hồi"
            : entry.status === "ACCEPTED"
              ? "Đã kết bạn"
              : entry.status === "DECLINED"
                ? "Lời mời đã bị từ chối"
                : "Chưa rõ trạng thái"}
        </span>
      )}
      {kind === "sent" && entry.status === "PENDING" && (
        <button className="button button-secondary" disabled={disabled} onClick={() => mutation.mutate("withdraw")}>
          Rút lời mời
        </button>
      )}
      {kind === "friends" && (
        <button
          className="button button-secondary"
          disabled={disabled}
          onClick={() => {
            mutation.reset();
            setConfirm(true);
          }}
        >
          Hủy kết bạn
        </button>
      )}
      {kind === "blocked" && (
        <button
          className="button button-secondary"
          disabled={disabled}
          onClick={() => {
            mutation.reset();
            setConfirm(true);
          }}
        >
          Bỏ chặn
        </button>
      )}
      {mutation.isError && !confirm && (
        <ErrorNotice message={errorMessage(mutation.error)} />
      )}
      {confirm && (
        <ConfirmDialog
          title={
            kind === "received"
              ? "Từ chối lời mời?"
              : kind === "blocked"
                ? "Bỏ chặn người dùng?"
                : "Hủy kết bạn?"
          }
          description={
            kind === "blocked"
              ? "Quan hệ bạn bè và theo dõi trước đó không được tự khôi phục."
              : "Xác nhận thay đổi quan hệ với người dùng này."
          }
          confirmLabel={
            kind === "received"
              ? "Từ chối"
              : kind === "blocked"
                ? "Bỏ chặn"
                : "Hủy kết bạn"
          }
          pending={mutation.isPending}
          error={mutation.isError ? errorMessage(mutation.error) : undefined}
          onConfirm={() =>
            mutation.mutate(
              kind === "received"
                ? "decline"
                : kind === "blocked"
                  ? "unblock"
                  : "unfriend",
            )
          }
          onClose={() => setConfirm(false)}
        />
      )}
    </UserCard>
  );
}
export function PeoplePage() {
  const [params, setParams] = useSearchParams();
  const kind =
    tabs.find((tab) => tab.key === params.get("tab"))?.key || "friends";
  const query = usePeople(kind);
  const entries = query.data?.pages.flatMap((page) => page.items || []) || [];
  return (
    <div className="social-page people-page">
      <div className="page-heading">
        <div>
          <h1>Kết nối của bạn</h1>
        </div>
        <Link className="button button-secondary" to="/search">
          <Search size={17} />
          Tìm bạn
        </Link>
      </div>
      <div className="people-intro">
        <Users size={22} />
        <p>Học cùng bạn bè, mở rộng những góc nhìn mới.</p>
      </div>
      <nav className="social-tabs" aria-label="Danh sách quan hệ">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={kind === tab.key ? "tab-active" : ""}
            aria-pressed={kind === tab.key}
            onClick={() => setParams({ tab: tab.key })}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {query.isPending ? (
        <Loading label="Đang tải danh sách…" />
      ) : (
        <>
          {entries.length === 0 && !query.isError && (
            <EmptyState
              title="Danh sách đang trống"
              description="Các kết nối và lời mời của bạn sẽ xuất hiện tại đây."
            />
          )}
          <div className="people-grid">
            {entries.map((entry, index) => (
              <FriendRequestCard
                key={entry.person.user_id || index}
                entry={entry}
                kind={kind}
              />
            ))}
          </div>
          {query.isError && (
            <QueryError
              error={query.error}
              retry={() => void query.refetch()}
            />
          )}
          <LoadMore
            hasNext={!!query.hasNextPage}
            pending={query.isFetchingNextPage}
            load={() => void query.fetchNextPage()}
          />
        </>
      )}
    </div>
  );
}
