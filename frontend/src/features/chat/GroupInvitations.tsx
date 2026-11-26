import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Avatar } from "../../components/Avatar";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { Modal } from "../../components/Modal";
import { LoadMore, QueryError } from "../../components/SocialFeedback";
import { errorMessage } from "../../lib/api";
import { formatTime, nextCursor, validId } from "../../lib/cursor";
import { getGroupInvitations, respondToInvitation } from "./api";

const invitationsKey = ["chat-group-invitations"];

export function GroupInvitations({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (id: number) => void;
}) {
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: invitationsKey,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) => getGroupInvitations(pageParam, signal),
    getNextPageParam: (page, _pages, cursor) => nextCursor(page, cursor),
  });
  const items = query.data?.pages.flatMap((page) => page.items || []) || [];
  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: number; accept: boolean }) =>
      respondToInvitation(id, accept),
    onSuccess: async (conversationId) => {
      await client.invalidateQueries({ queryKey: invitationsKey });
      if (validId(conversationId)) {
        await client.invalidateQueries({ queryKey: ["conversations"] });
        onOpen(conversationId);
      }
    },
    onError: () => void client.invalidateQueries({ queryKey: invitationsKey }),
  });
  return (
    <Modal
      title="Lời mời vào nhóm"
      onClose={onClose}
      pending={respond.isPending}
    >
      {query.isPending ? (
        <Loading label="Đang tải lời mời…" />
      ) : (
        <>
          {!items.length && !query.isError && <p>Chưa có lời mời vào nhóm.</p>}
          {!!items.length && (
            <ul className="rewards-list">
              {items.map((item) => {
                const expired =
                  !!item.expires_at &&
                  Date.parse(item.expires_at) <= Date.now();
                return (
                  <li key={item.invitation_id} className="invite-row">
                    <Avatar
                      name={item.group_name}
                      url={item.group_avatar_url}
                    />
                    <div>
                      <strong>{item.group_name || "Nhóm trò chuyện"}</strong>
                      {item.inviter_name && (
                        <p>Người mời: {item.inviter_name}</p>
                      )}
                      {item.expires_at && (
                        <p className="muted">
                          {expired
                            ? "Đã hết hạn"
                            : `Hết hạn ${formatTime(item.expires_at)}`}
                        </p>
                      )}
                      <div className="invite-actions">
                        <button
                          className="button button-primary"
                          disabled={
                            respond.isPending ||
                            expired ||
                            !validId(item.invitation_id)
                          }
                          onClick={() =>
                            respond.mutate({
                              id: item.invitation_id,
                              accept: true,
                            })
                          }
                        >
                          Chấp nhận
                        </button>
                        <button
                          className="button button-secondary"
                          disabled={
                            respond.isPending ||
                            expired ||
                            !validId(item.invitation_id)
                          }
                          onClick={() =>
                            respond.mutate({
                              id: item.invitation_id,
                              accept: false,
                            })
                          }
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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
          {respond.isError && (
            <ErrorNotice message={errorMessage(respond.error)} />
          )}
          {respond.isSuccess && !respond.variables?.accept && (
            <p role="status">Đã từ chối lời mời.</p>
          )}
          <LoadMore
            hasNext={!!query.hasNextPage}
            pending={query.isFetchingNextPage}
            load={() => void query.fetchNextPage()}
          />
        </>
      )}
    </Modal>
  );
}
