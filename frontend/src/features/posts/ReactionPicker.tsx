import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Sparkles, ThumbsUp } from "lucide-react";
import { ErrorNotice } from "../../components/Feedback";
import { errorMessage } from "../../lib/api";
import { reactToPost } from "./api";

const reactions = [
  { type: "LIKE", label: "Thích", icon: ThumbsUp },
  { type: "LOVE", label: "Yêu thích", icon: Heart },
  { type: "WOW", label: "Wow", icon: Sparkles },
] as const;

export function ReactionPicker({
  postId,
  count,
  reacted,
}: {
  postId: number;
  count?: number;
  reacted?: boolean;
}) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (reaction_type: "LIKE" | "LOVE" | "WOW") =>
      reactToPost({ target_type: "POST", target_id: postId, reaction_type }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["posts"] }),
        client.invalidateQueries({ queryKey: ["search"] }),
        client.invalidateQueries({ queryKey: ["video-posts"] }),
      ]);
    },
  });
  const result = mutation.data;
  const knownReaction = result?.my_reaction;
  const alreadyReacted = result ? !!knownReaction : reacted;
  return (
    <div className="reaction-section">
      <div className="reaction-summary">
        <span>
          <Heart size={14} />
          {result?.total_count ?? count ?? "—"} cảm xúc
        </span>
        {alreadyReacted && (
          <span className="text-brand">
            {knownReaction
              ? `Bạn: ${reactions.find((reaction) => reaction.type === knownReaction)?.label || knownReaction}`
              : "Bạn đã bày tỏ cảm xúc"}
          </span>
        )}
      </div>
      <div
        className="reaction-buttons"
        role="group"
        aria-label="Cảm xúc bài viết"
      >
        {reactions.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            className={`reaction-button reaction-${type.toLowerCase()} ${knownReaction === type ? "reaction-selected" : ""}`}
            disabled={mutation.isPending}
            aria-pressed={knownReaction === type}
            onClick={() => mutation.mutate(type)}
            title={
              knownReaction === type
                ? `Bấm lại để gỡ ${label.toLowerCase()}`
                : label
            }
          >
            <Icon size={18} />
            <span>{label}</span>
            {result?.reaction_counts?.[type] !== undefined && (
              <span className="reaction-type-count">
                {result.reaction_counts[type]}
              </span>
            )}
          </button>
        ))}
      </div>
      {mutation.isError && (
        <ErrorNotice message={errorMessage(mutation.error)} />
      )}
    </div>
  );
}
