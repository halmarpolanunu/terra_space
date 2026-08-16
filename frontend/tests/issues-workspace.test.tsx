import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/issues-api", () => ({
  listIssues: vi.fn(),
  getIssue: vi.fn(),
  getIssueEvent: vi.fn(),
}));

vi.mock("@/components/world-map", () => ({
  WorldMap: ({ relationshipArcs, selectedRelationshipId }: {
    relationshipArcs?: { features: { properties: { relationshipId: string } }[] };
    selectedRelationshipId?: string;
  }) => (
    <div
      data-relationship-ids={relationshipArcs?.features.map((arc) => arc.properties.relationshipId).join(",")}
      data-selected-relationship-id={selectedRelationshipId}
      data-testid="issues-relationship-map"
    />
  ),
  buildRelationshipArcs: (relationships: { id: string }[]) => ({
    type: "FeatureCollection",
    features: relationships.map((relationship) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [] },
      properties: { relationshipId: relationship.id },
    })),
  }),
}));

import { IssuesWorkspace } from "@/app/issues/issues-workspace";
import * as issuesApi from "@/lib/issues-api";
import type { ActorRelationshipRead, IssueDetail, IssueEventDetail, IssueListItem } from "@/lib/issues-api";

const processedAt = "2026-08-16T10:00:00Z";

function makeIssue(overrides: Partial<IssueListItem> = {}): IssueListItem {
  return {
    id: "issue-new",
    source_id: "source-new",
    source_title: "Newer source article",
    label: "Border security discussion",
    summary: "Officials discussed security arrangements.",
    evidence_quote: "Officials discussed security arrangements at the border.",
    processed_at: processedAt,
    created_at: processedAt,
    ...overrides,
  };
}

function makeDetail(overrides: Partial<IssueDetail> = {}): IssueDetail {
  return {
    ...makeIssue(),
    events: [{
      id: "event-new",
      title: "Officials meet at the border",
      evidence_quote: "Officials met at the border.",
      created_at: processedAt,
    }],
    ...overrides,
  };
}

function makeEventDetail(overrides: Partial<IssueEventDetail> = {}): IssueEventDetail {
  return {
    id: "event-new",
    title: "Officials meet at the border",
    evidence_quote: "Officials met at the border.",
    created_at: processedAt,
    relationships: [],
    ...overrides,
  };
}

function makeRelationship(overrides: Partial<ActorRelationshipRead> = {}): ActorRelationshipRead {
  return {
    id: "relationship-1",
    evidence_quote: "The Jakarta delegation met the Manila delegation.",
    source: {
      role: "source",
      actor_name: "Jakarta delegation",
      evidence_quote: "The Jakarta delegation",
      location: { id: "jakarta", label: "Jakarta, Indonesia", latitude: -6.2088, longitude: 106.8456, evidence_quote: "in Jakarta" },
    },
    target: {
      role: "target",
      actor_name: "Manila delegation",
      evidence_quote: "the Manila delegation",
      location: { id: "manila", label: "Manila, Philippines", latitude: 14.5995, longitude: 120.9842, evidence_quote: "in Manila" },
    },
    ...overrides,
  };
}

describe("IssuesWorkspace", () => {
  afterEach(() => vi.clearAllMocks());

  it("selects the newest article-level Issue and sends only its events to the globe slot", async () => {
    const newest = makeIssue();
    const older = makeIssue({
      id: "issue-old",
      source_id: "source-old",
      source_title: "Older source article",
      label: "Earlier diplomatic meeting",
      processed_at: "2026-08-15T10:00:00Z",
    });
    vi.mocked(issuesApi.listIssues).mockResolvedValue([newest, older]);
    vi.mocked(issuesApi.getIssue).mockResolvedValue(makeDetail());
    vi.mocked(issuesApi.getIssueEvent).mockResolvedValue(makeEventDetail({ relationships: [makeRelationship()] }));

    render(<IssuesWorkspace />);

    expect(await screen.findByRole("heading", { name: "Border security discussion" })).toBeVisible();
    expect(issuesApi.getIssue).toHaveBeenCalledWith("issue-new");
    expect(screen.getByRole("button", { name: /border security discussion/i })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByTestId("issues-relationship-map")).toHaveAttribute("data-relationship-ids", "relationship-1");
    expect(screen.getAllByText("Newer source article")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /earlier diplomatic meeting/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("loads only the newly selected Issue's events", async () => {
    const newest = makeIssue();
    const older = makeIssue({ id: "issue-old", source_id: "source-old", label: "Earlier diplomatic meeting" });
    vi.mocked(issuesApi.listIssues).mockResolvedValue([newest, older]);
    vi.mocked(issuesApi.getIssue)
      .mockResolvedValueOnce(makeDetail())
      .mockResolvedValueOnce(makeDetail({ ...older, events: [{ id: "event-old", title: "Earlier meeting", evidence_quote: "Earlier meeting.", created_at: processedAt }] }));
    vi.mocked(issuesApi.getIssueEvent).mockResolvedValue(makeEventDetail());

    render(<IssuesWorkspace />);
    await screen.findByRole("heading", { name: "Border security discussion" });
    fireEvent.click(screen.getByRole("button", { name: /earlier diplomatic meeting/i }));

    await waitFor(() => expect(issuesApi.getIssue).toHaveBeenLastCalledWith("issue-old"));
    expect(await screen.findByRole("heading", { name: "Earlier diplomatic meeting" })).toBeVisible();
  });

  it("honestly reports an Issue with no mapped events", async () => {
    vi.mocked(issuesApi.listIssues).mockResolvedValue([makeIssue()]);
    vi.mocked(issuesApi.getIssue).mockResolvedValue(makeDetail({ events: [] }));

    render(<IssuesWorkspace />);

    expect((await screen.findAllByText("No mapped events yet")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Officials meet at the border")).not.toBeInTheDocument();
  });

  it("does not invent an event pin when the selected event has no proven actor-to-actor locations", async () => {
    vi.mocked(issuesApi.listIssues).mockResolvedValue([makeIssue()]);
    vi.mocked(issuesApi.getIssue).mockResolvedValue(makeDetail());
    vi.mocked(issuesApi.getIssueEvent).mockResolvedValue(makeEventDetail({ relationships: [] }));

    render(<IssuesWorkspace />);

    expect(await screen.findByText("No proven actor-to-actor locations for this event")).toBeVisible();
    expect(screen.queryByTestId("issues-relationship-map")).not.toBeInTheDocument();
  });

  it("highlights only the relationship the owner selects", async () => {
    const second = makeRelationship({
      id: "relationship-2",
      evidence_quote: "Canberra officials contacted Wellington officials.",
      source: {
        ...makeRelationship().source,
        actor_name: "Canberra officials",
        location: { ...makeRelationship().source.location, id: "canberra", label: "Canberra, Australia" },
      },
      target: {
        ...makeRelationship().target,
        actor_name: "Wellington officials",
        location: { ...makeRelationship().target.location, id: "wellington", label: "Wellington, New Zealand" },
      },
    });
    vi.mocked(issuesApi.listIssues).mockResolvedValue([makeIssue()]);
    vi.mocked(issuesApi.getIssue).mockResolvedValue(makeDetail());
    vi.mocked(issuesApi.getIssueEvent).mockResolvedValue(
      makeEventDetail({ relationships: [makeRelationship(), second] }),
    );

    render(<IssuesWorkspace />);

    const map = await screen.findByTestId("issues-relationship-map");
    expect(map).toHaveAttribute("data-relationship-ids", "relationship-1,relationship-2");
    expect(map).not.toHaveAttribute("data-selected-relationship-id");
    fireEvent.click(screen.getByRole("button", { name: /canberra officials.*wellington officials/i }));
    expect(map).toHaveAttribute("data-selected-relationship-id", "relationship-2");
  });

  it("shows a clear backend error without offering a correction action", async () => {
    vi.mocked(issuesApi.listIssues).mockRejectedValue(new Error("Backend unavailable"));

    render(<IssuesWorkspace />);

    expect(await screen.findByText("Backend unavailable", { selector: ".document-error" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /edit|review|approve|reject/i })).not.toBeInTheDocument();
  });
});
