import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/issues-api", () => ({ listIssues: vi.fn(), getIssue: vi.fn(), getIssueEvent: vi.fn() }));
vi.mock("@/components/world-map", () => ({
  WorldMap: ({ relationshipArcs }: { relationshipArcs?: { features: { properties: { relationshipId: string } }[] } }) => (
    <div data-relationship-ids={relationshipArcs?.features.map((arc) => arc.properties.relationshipId).join(",")} data-testid="issues-relationship-map" />
  ),
  buildRelationshipArcs: (relationships: { id: string }[]) => ({ type: "FeatureCollection", features: relationships.map((relationship) => ({ type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: { relationshipId: relationship.id } })) }),
}));

import { IssuesWorkspace } from "@/app/issues/issues-workspace";
import * as issuesApi from "@/lib/issues-api";
import type { ActorRelationshipRead, IssueDetail, IssueEventDetail, IssueListItem } from "@/lib/issues-api";

const timestamp = "2026-08-16T10:00:00Z";
const issue: IssueListItem = { id: "issue-1", source_id: "source-1", source_title: "Source article", label: "Border security discussion", summary: "Summary", evidence_quote: "Evidence", processed_at: timestamp, created_at: timestamp };
const eventOne = { id: "event-1", title: "First event", evidence_quote: "First evidence", created_at: timestamp };
const eventTwo = { id: "event-2", title: "Second event", evidence_quote: "Second evidence", created_at: timestamp };
const detail: IssueDetail = { ...issue, events: [eventOne, eventTwo] };

function relationship(id: string): ActorRelationshipRead {
  return {
    id, evidence_quote: "Evidence-backed actor relationship.",
    source: { role: "source", actor_name: "Source actor", evidence_quote: "Source actor", location: { id: `${id}-source`, label: "Jakarta", latitude: -6.2, longitude: 106.8, evidence_quote: "Jakarta" } },
    target: { role: "target", actor_name: "Target actor", evidence_quote: "Target actor", location: { id: `${id}-target`, label: "Bandung", latitude: -6.9, longitude: 107.6, evidence_quote: "Bandung" } },
  };
}

describe("IssuesWorkspace", () => {
  afterEach(() => { cleanup(); vi.resetAllMocks(); });

  it("renders only the article Issue list and one globe from server-provided data", () => {
    const event: IssueEventDetail = { ...eventOne, relationships: [relationship("arc-1")] };
    render(<IssuesWorkspace initialEvents={[event]} initialIssue={{ ...issue, events: [eventOne] }} initialIssues={[issue]} />);

    expect(screen.getByRole("heading", { name: "Article Issues" })).toBeVisible();
    expect(screen.getByTestId("issues-relationship-map")).toHaveAttribute("data-relationship-ids", "arc-1");
    expect(screen.queryByRole("heading", { name: "Selected Issue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Related events" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Event map" })).not.toBeInTheDocument();
  });

  it("shows an unavailable Issue service instead of a false empty state", () => {
    render(<IssuesWorkspace initialError="The validated Issue analysis is not configured on this backend." />);

    expect(screen.getByRole("alert")).toHaveTextContent("The validated Issue analysis is not configured on this backend.");
    expect(screen.getByText("Unavailable")).toBeVisible();
    expect(screen.queryByText("No validated Issues yet. Processed articles will appear here only after the pipeline accepts them.")).not.toBeInTheDocument();
  });

  it("combines proven arcs from every event of the selected Issue", async () => {
    vi.mocked(issuesApi.listIssues).mockResolvedValue([issue]);
    vi.mocked(issuesApi.getIssue).mockResolvedValue(detail);
    vi.mocked(issuesApi.getIssueEvent)
      .mockResolvedValueOnce({ ...eventOne, relationships: [relationship("arc-1")] })
      .mockResolvedValueOnce({ ...eventTwo, relationships: [relationship("arc-2")] });
    render(<IssuesWorkspace />);

    await waitFor(() => expect(screen.getByTestId("issues-relationship-map")).toHaveAttribute("data-relationship-ids", "arc-1,arc-2"));
  });

  it("keeps an empty globe when an Issue has no proven actor locations", async () => {
    vi.mocked(issuesApi.listIssues).mockResolvedValue([issue]);
    vi.mocked(issuesApi.getIssue).mockResolvedValue({ ...issue, events: [eventOne] });
    vi.mocked(issuesApi.getIssueEvent).mockResolvedValue({ ...eventOne, relationships: [] });
    render(<IssuesWorkspace />);

    await waitFor(() => expect(screen.getByTestId("issues-relationship-map")).toHaveAttribute("data-relationship-ids", ""));
  });

  it("loads a new Issue's arcs when its list item is selected", async () => {
    const other = { ...issue, id: "issue-2", source_title: "Second source", label: "Second Issue" };
    vi.mocked(issuesApi.listIssues).mockResolvedValue([issue, other]);
    vi.mocked(issuesApi.getIssue)
      .mockResolvedValueOnce({ ...issue, events: [eventOne] })
      .mockResolvedValueOnce({ ...other, events: [eventTwo] });
    vi.mocked(issuesApi.getIssueEvent)
      .mockResolvedValueOnce({ ...eventOne, relationships: [relationship("arc-1")] })
      .mockResolvedValueOnce({ ...eventTwo, relationships: [relationship("arc-2")] });
    render(<IssuesWorkspace />);

    await screen.findByRole("button", { name: /second issue/i });
    fireEvent.click(screen.getByRole("button", { name: /second issue/i }));
    await waitFor(() => expect(screen.getByTestId("issues-relationship-map")).toHaveAttribute("data-relationship-ids", "arc-2"));
  });
});
