import type { ReactNode } from "react";

type FramedPanelProps = {
  title?: string;
  className?: string;
  children: ReactNode;
};

export function FramedPanel({ title, className, children }: FramedPanelProps) {
  const classes = className ? `panel ${className}` : "panel";
  return (
    <div className={classes}>
      {title && <p className="panel-title">{title}</p>}
      {children}
    </div>
  );
}
