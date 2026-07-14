import { FramedPanel } from "@/components/framed-panel";
import type { DuplicateFlagRead, DuplicateResolution, EventRead } from "@/lib/events-api";

type DuplicateComparePanelProps = {
  flags: DuplicateFlagRead[];
  matchedEvents: Record<string, EventRead>;
  onResolve: (flagId: string, resolution: DuplicateResolution) => void;
};

export function DuplicateComparePanel({ flags, matchedEvents, onResolve }: DuplicateComparePanelProps) {
  const pendingFlags = flags.filter((flag) => flag.resolution === "pending");
  if (pendingFlags.length === 0) {
    return null;
  }

  return (
    <FramedPanel className="duplicate-compare-panel" title="Possible Duplicate">
      {pendingFlags.map((flag) => {
        const matched = matchedEvents[flag.matched_event_id];
        return (
          <div className="duplicate-flag-row" key={flag.id}>
            <p className="duplicate-reason">{flag.matched_reason}</p>
            {matched && (
              <div className="duplicate-matched-summary">
                <span className="field-label">Matches approved event</span>
                <p>{matched.title}</p>
                <p className="document-meta">{matched.summary}</p>
              </div>
            )}
            <div className="form-actions">
              <button
                className="btn"
                onClick={() => onResolve(flag.id, "kept_separate")}
                type="button"
              >
                Keep Separate
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onResolve(flag.id, "linked")}
                type="button"
              >
                Link to This Event
              </button>
            </div>
          </div>
        );
      })}
    </FramedPanel>
  );
}
