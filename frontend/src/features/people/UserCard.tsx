import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { validId } from "../../lib/cursor";
import type { AuthorDto } from "../social/types";

export function UserCard({
  person,
  subtitle,
  children,
}: {
  person: AuthorDto;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <article className="surface user-card">
      <div className="user-card-identity">
        <Avatar large name={person.full_name} url={person.avatar_url} />
        <div>
          <h2>{person.full_name || "Thành viên"}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {validId(person.user_id) && (
        <Link className="user-card-link" to={`/users/${person.user_id}`}>
          Xem trang cá nhân <ArrowUpRight size={16} />
        </Link>
      )}
      {children && <div className="user-card-actions">{children}</div>}
    </article>
  );
}
