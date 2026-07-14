import type { CSSProperties } from "react";

type StatusChipProps = {
  value: string;
  label: string;
  colorVar?: string;
};

export function StatusChip({ value, label, colorVar }: StatusChipProps) {
  const style: CSSProperties | undefined = colorVar
    ? { color: `var(${colorVar})`, borderColor: `var(${colorVar})` }
    : undefined;

  return (
    <span className="status-badge" data-status={value} style={style}>
      {label}
    </span>
  );
}
