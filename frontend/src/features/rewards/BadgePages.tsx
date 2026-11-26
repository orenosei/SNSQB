import { Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import { imageUrl } from "../../components/Avatar";
import { Loading } from "../../components/Feedback";
import { EmptyState, QueryError } from "../../components/SocialFeedback";
import { formatTime, routeId, validId } from "../../lib/cursor";
import { readRewards } from "./api";
import { RewardsTabs } from "./RewardsPages";

interface Badge {
  badge_id: number;
  name?: string;
  description?: string;
  icon_url?: string;
  badge_tier?: string;
  earned_at?: string;
  total_earned_users?: number;
  active?: boolean;
}
const tiers: Record<string, string> = {
  BRONZE: "Đồng",
  SILVER: "Bạc",
  GOLD: "Vàng",
  PLATINUM: "Bạch kim",
};

function BadgeCard({
  badge,
  detail = false,
}: {
  badge: Badge;
  detail?: boolean;
}) {
  const icon = imageUrl(badge.icon_url);
  return (
    <article className="surface rewards-panel badge-card">
      {icon ? (
        <img src={icon} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <Award size={36} aria-hidden="true" />
      )}
      <div>
        <h2>
          {detail || !validId(badge.badge_id) ? (
            badge.name || "Huy hiệu"
          ) : (
            <Link to={`/badges/${badge.badge_id}`}>
              {badge.name || "Huy hiệu"}
            </Link>
          )}
        </h2>
        {badge.badge_tier && (
          <p>{tiers[badge.badge_tier] || badge.badge_tier}</p>
        )}
        {badge.description && <p>{badge.description}</p>}
        {badge.earned_at && <p>Nhận ngày {formatTime(badge.earned_at)}</p>}
        {detail && badge.total_earned_users != null && (
          <p>{badge.total_earned_users} người đã nhận</p>
        )}
        {badge.active === false && <p className="muted">Đã ngừng trao</p>}
      </div>
    </article>
  );
}

function BadgeList({ path }: { path: string }) {
  const query = useQuery({
    queryKey: ["rewards", path],
    queryFn: ({ signal }) => readRewards<Badge[]>(path, signal),
  });
  if (query.isPending) return <Loading label="Đang tải huy hiệu…" />;
  if (query.isError)
    return (
      <QueryError error={query.error} retry={() => void query.refetch()} />
    );
  return query.data?.length ? (
    <div className="rewards-grid">
      {query.data.map((badge) => (
        <BadgeCard key={badge.badge_id} badge={badge} />
      ))}
    </div>
  ) : (
    <EmptyState
      title="Chưa có huy hiệu"
      description="Các huy hiệu hiển thị sẽ xuất hiện tại đây."
    />
  );
}

export function BadgesPage() {
  const [params] = useSearchParams();
  const tab = params.get("tab") === "mine" ? "mine" : "catalog";
  return (
    <div className="social-page rewards-page">
      <h1>Huy hiệu</h1>
      <RewardsTabs
        tabs={[
          ["catalog", "Danh mục"],
          ["mine", "Huy hiệu của tôi"],
        ]}
        active={tab}
        href="/badges"
      />
      <BadgeList path={tab === "mine" ? "/badges/me" : "/badges"} />
    </div>
  );
}

export function BadgeDetailPage() {
  const id = routeId(useParams().badgeId);
  const path = `/badges/${id}`;
  const query = useQuery({
    queryKey: ["rewards", path],
    enabled: id !== undefined,
    queryFn: ({ signal }) => readRewards<Badge>(path, signal),
  });
  return (
    <div className="social-page rewards-page">
      <Link to="/badges" className="back-link">
        ← Danh mục huy hiệu
      </Link>
      <h1>Chi tiết huy hiệu</h1>
      {!id ? (
        <p>Đường dẫn huy hiệu không hợp lệ.</p>
      ) : query.isPending ? (
        <Loading label="Đang tải huy hiệu…" />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && <BadgeCard badge={query.data} detail />
      )}
    </div>
  );
}

export function UserBadgesPage() {
  const id = routeId(useParams().userId);
  return (
    <div className="social-page rewards-page">
      {id && (
        <Link to={`/users/${id}`} className="back-link">
          ← Hồ sơ người dùng
        </Link>
      )}
      <h1>Huy hiệu của người dùng</h1>
      {id ? (
        <BadgeList path={`/badges/users/${id}`} />
      ) : (
        <p>Đường dẫn hồ sơ không hợp lệ.</p>
      )}
    </div>
  );
}
