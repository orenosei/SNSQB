import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow text-brand">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted social-subtitle">{description}</p>}
      </div>
      {actions && <div className="inline-actions">{actions}</div>}
    </div>
  );
}
