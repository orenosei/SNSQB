import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { Ban, Check, UserPlus } from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorNotice } from "../../components/Feedback";
import { QueryError } from "../../components/SocialFeedback";
import { errorMessage } from "../../lib/api";
import { useProfile } from "../profile/api";
import type { ProfileResponse } from "../social/types";
import {
  useRelationship,
  sendFriendRequest,
  unfriend,
  follow,
  unfollow,
  block,
  unblock,
  refreshPeople,
} from "./api";

export function RelationshipActions({
  userId,
  profile,
}: {
  userId: number;
  profile?: ProfileResponse;
}) {
  const me = useProfile();
  const query = useRelationship(userId);
  const client = useQueryClient();
  const [confirmation, setConfirmation] = useState<
    "unfriend" | "block" | "unblock"
  >();
  const relation = query.data?.relationship_with_me;
  const mutation = useMutation({
    mutationFn: async (
      action:
        | "request"
        | "unfriend"
        | "follow"
        | "unfollow"
        | "block"
        | "unblock",
    ) => {
      const actions = {
        request: sendFriendRequest,
        unfriend,
        follow,
        unfollow,
        block,
        unblock,
      };
      await actions[action](userId);
      return action;
    },
    onSuccess: async (action) => {
      setConfirmation(undefined);
      await refreshPeople(client, action === "block" || action === "unblock");
    },
  });
  if (me.data?.user_id === userId)
    return (
      <Link to="/me" className="button button-secondary">
        Hồ sơ của bạn
      </Link>
    );
  if (query.isPending)
    return (
      <p className="muted" role="status">
        Đang tải trạng thái quan hệ…
      </p>
    );
  if (query.isError)
    return (
      <QueryError error={query.error} retry={() => void query.refetch()} />
    );
  if (!relation || relation.blocked === undefined)
    return (
      <p className="notice">
        Chưa xác định được trạng thái quan hệ từ máy chủ.
      </p>
    );
  const sameRole =
    me.data?.role === profile?.role &&
    (me.data?.role === "STUDENT" || me.data?.role === "LECTURER");
  const pending = mutation.isPending || query.isFetching;
  return (
    <div className="relationship-panel">
      <div className="relationship-actions">
        {relation.blocked ? (
          <>
            <span className="relationship-status">
              <Ban size={16} />
              Bạn đang chặn người này
            </span>
            <button
              className="button button-secondary"
              disabled={pending}
              onClick={() => {
                mutation.reset();
                setConfirmation("unblock");
              }}
            >
              Bỏ chặn
            </button>
          </>
        ) : (
          <>
            {relation.friend === true ? (
              <button
                className="button button-secondary"
                disabled={pending}
                onClick={() => {
                  mutation.reset();
                  setConfirmation("unfriend");
                }}
              >
                <Check size={16} />
                Hủy kết bạn
              </button>
            ) : relation.friend_request_status === "PENDING" ? (
              <>
                <span className="relationship-status">Lời mời đang chờ</span>
                <Link
                  to="/friends?tab=received"
                  className="button button-secondary"
                >
                  Xem lời mời
                </Link>
              </>
            ) : relation.friend === false &&
              relation.friend_request_status !== undefined ? (
              <button
                className="button button-primary"
                disabled={pending || !sameRole}
                title={
                  sameRole
                    ? "Gửi lời mời kết bạn"
                    : "Chỉ có thể kết bạn với người cùng vai trò đào tạo"
                }
                onClick={() => mutation.mutate("request")}
              >
                <UserPlus size={16} />
                Kết bạn
              </button>
            ) : (
              <span className="muted text-sm">Chưa rõ trạng thái kết bạn</span>
            )}
            <button
              className="button button-secondary"
              disabled={pending || relation.following === undefined}
              onClick={() =>
                mutation.mutate(relation.following ? "unfollow" : "follow")
              }
            >
              {relation.following ? "Bỏ theo dõi" : "Theo dõi"}
            </button>
            <button
              className="button button-secondary"
              disabled={pending}
              onClick={() => {
                mutation.reset();
                setConfirmation("block");
              }}
            >
              <Ban size={15} />
              Chặn
            </button>
          </>
        )}
      </div>
      {mutation.isError && !confirmation && (
        <ErrorNotice message={errorMessage(mutation.error)} />
      )}
      {confirmation && (
        <ConfirmDialog
          title={
            confirmation === "block"
              ? "Chặn người dùng?"
              : confirmation === "unblock"
                ? "Bỏ chặn người dùng?"
                : "Hủy kết bạn?"
          }
          description={
            confirmation === "block"
              ? "Thao tác này tự động hủy kết bạn và hủy theo dõi hai chiều. Nội dung giữa hai người có thể không còn xem được."
              : confirmation === "unblock"
                ? "Bạn sẽ bỏ chặn người này. Quan hệ bạn bè và theo dõi cũ không được tự khôi phục."
                : "Hai người sẽ không còn là bạn bè. Những bài viết chỉ dành cho bạn bè có thể không còn xem được."
          }
          confirmLabel={
            confirmation === "block"
              ? "Chặn người dùng"
              : confirmation === "unblock"
                ? "Bỏ chặn"
                : "Hủy kết bạn"
          }
          pending={mutation.isPending}
          error={mutation.isError ? errorMessage(mutation.error) : undefined}
          onClose={() => setConfirmation(undefined)}
          onConfirm={() => mutation.mutate(confirmation)}
        />
      )}
    </div>
  );
}
