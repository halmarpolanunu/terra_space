import type { ReactNode } from "react";

type FramedPanelProps = {
  title?: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function FramedPanel({ title, meta, className, children }: FramedPanelProps) {
  const classes = className ? `panel ${className}` : "panel";
  return (
    <div className={classes}>
      {title && (
        <div className="panel-heading">
          <h2 className="panel-title">{title}</h2>
          {meta && <span className="panel-meta">{meta}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
