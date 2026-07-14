import type { EpistemicStatus } from "@/lib/events-api";

const OPTIONS: { value: EpistemicStatus; label: string; colorVar: string }[] = [
  { value: "confirmed", label: "Confirmed", colorVar: "--status-confirmed" },
  { value: "claim", label: "Claim", colorVar: "--status-claim" },
  { value: "rumor", label: "Rumor", colorVar: "--status-rumor" },
  { value: "denied", label: "Denied", colorVar: "--status-denied" },
];

type EpistemicStatusControlProps = {
  value: EpistemicStatus;
  onChange: (value: EpistemicStatus) => void;
};

export function EpistemicStatusControl({ value, onChange }: EpistemicStatusControlProps) {
  return (
    <div aria-label="Epistemic status" className="epistemic-control" role="radiogroup">
      {OPTIONS.map((option) => (
        <button
          aria-pressed={value === option.value}
          className="epistemic-option"
          data-active={value === option.value}
          key={option.value}
          onClick={() => onChange(option.value)}
          style={
            value === option.value
              ? { borderColor: `var(${option.colorVar})`, color: `var(${option.colorVar})` }
              : undefined
          }
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
