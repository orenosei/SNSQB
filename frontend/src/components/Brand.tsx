import { BookOpen } from "lucide-react";
import { Link } from "react-router";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label="SNSQB — Trang chủ"
    >
      <span className="brand-mark">
        <BookOpen size={25} strokeWidth={2.2} />
      </span>
      <span>
        SNSQB<span className="brand-subtitle">Không gian học tập</span>
      </span>
    </Link>
  );
}
