import { useId, useState } from "react";
import { MessageCircle } from "lucide-react";
import { CommentSection } from "./Comments";

export function DiscussionToggle({
  id,
  type,
}: {
  id: number;
  type: "QUESTION" | "SESSION";
}) {
  const [open, setOpen] = useState(false);
  const region = useId();
  return (
    <div className="discussion-panel">
      <button
        type="button"
        className="button button-secondary"
        aria-expanded={open}
        aria-controls={region}
        onClick={() => setOpen(!open)}
      >
        <MessageCircle size={17} />
        {open ? "Ẩn thảo luận" : "Thảo luận cùng cộng đồng"}
      </button>
      {open && (
        <div id={region}>
          <CommentSection postId={id} targetType={type} />
        </div>
      )}
    </div>
  );
}
