import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  titleId: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  titleId,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id={titleId}>{title}</h1>
        <p className="page-header-description">{description}</p>
      </div>
      {action && (
        <div className="page-header-actions" data-testid="page-header-actions">
          {action}
        </div>
      )}
    </header>
  );
}
