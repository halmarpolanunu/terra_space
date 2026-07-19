import { FramedPanel } from "@/components/framed-panel";
import { locationIsResolved } from "@/app/dashboard/event-globe";
import type { EventRead } from "@/lib/events-api";

type DashboardSummaryProps = {
  events: EventRead[];
};

type DashboardSummaryContentProps = DashboardSummaryProps & {
  markerCount: number;
  onShowUnresolvedLocations?: () => void;
};

function approvedInLastSevenDays(approvedAt: string | null | undefined): boolean {
  if (!approvedAt) return false;
  const approvedDate = new Date(approvedAt);
  return !Number.isNaN(approvedDate.getTime()) && approvedDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export function hasResolvedLocation(event: EventRead): boolean {
  return event.locations.some(locationIsResolved);
}

export function unresolvedLocationEvents(events: EventRead[]): EventRead[] {
  return events.filter((event) => !hasResolvedLocation(event));
}

export function summarizeDashboardEvents(events: EventRead[]) {
  const byType = new Map<string, number>();
  for (const event of events) {
    const name = event.event_type?.name ?? "Uncategorized";
    byType.set(name, (byType.get(name) ?? 0) + 1);
  }
  return {
    total_events: events.length,
    new_events: events.filter((event) => approvedInLastSevenDays(event.approved_at)).length,
    by_event_type: [...byType.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([name, count]) => ({ name, count })),
    incomplete_date_count: events.filter((event) => !event.event_date || event.event_date_precision === "unknown").length,
    incomplete_location_count: unresolvedLocationEvents(events).length,
  };
}

export function DashboardSummary({ events }: DashboardSummaryProps) {
  const value = summarizeDashboardEvents(events);

  return (
    <FramedPanel className="dashboard-summary" title="Summary">
      <dl className="dashboard-summary-metrics">
        <div><dt>Total events</dt><dd>{value.total_events}</dd></div>
        <div><dt>New in last 7 days</dt><dd>{value.new_events}</dd></div>
        <div><dt>Incomplete date</dt><dd>{value.incomplete_date_count}</dd></div>
        <div><dt>Incomplete location</dt><dd>{value.incomplete_location_count}</dd></div>
      </dl>
      <div className="dashboard-type-distribution">
        <h3>Distribution by type</h3>
        {value.by_event_type.length ? (
          <ul>{value.by_event_type.map(({ name, count }) => <li key={name}>{name}: {count}</li>)}</ul>
        ) : <p>No event types in this result.</p>}
      </div>
    </FramedPanel>
  );
}

export function DashboardSummaryContent({ events, markerCount, onShowUnresolvedLocations }: DashboardSummaryContentProps) {
  const value = summarizeDashboardEvents(events);

  return (
    <dl className="dashboard-summary-metrics dashboard-summary-metrics--compact">
      <div><dt>Total events</dt><dd>{value.total_events}</dd></div>
      <div><dt>New in last 7 days</dt><dd>{value.new_events}</dd></div>
      <div><dt>Mapped locations</dt><dd>{markerCount}</dd></div>
      <div>
        <dt>Unresolved locations</dt>
        <dd>
          <button
            aria-label={`Unresolved locations · ${value.incomplete_location_count}`}
            className="dashboard-summary-stat-button"
            disabled={value.incomplete_location_count === 0}
            onClick={onShowUnresolvedLocations}
            type="button"
          >
            {value.incomplete_location_count}
          </button>
        </dd>
      </div>
    </dl>
  );
}
