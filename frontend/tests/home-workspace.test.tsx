import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BridgeCandidateReview, Phase5Event } from "@/lib/bridge-api";
import type { IssueAtlasPlace } from "@/lib/issue-atlas-model";

const { listPhase5Events, listBridgeCandidateReviews, params } = vi.hoisted(() => ({
  listPhase5Events: vi.fn<() => Promise<Phase5Event[]>>(),
  listBridgeCandidateReviews: vi.fn<() => Promise<BridgeCandidateReview[]>>(),
  params: new URLSearchParams(),
}));
vi.mock("@/lib/bridge-api", () => ({ listPhase5Events, listBridgeCandidateReviews }));
vi.mock("next/navigation", () => ({ useSearchParams: () => params }));
vi.mock("@/app/home/issue-globe", () => ({ IssueGlobe: ({ places, onSelectIssue, onSelectSharedPlace }: {
  places: IssueAtlasPlace[]; onSelectIssue: (id: string) => void; onSelectSharedPlace: (label: string, places: IssueAtlasPlace[]) => void;
}) => <div role="img" aria-label="Issue globe">
  {places.map((place) => <button key={place.id} type="button" onClick={() => onSelectIssue(place.issueSourceId)}>Point {place.issueLabel} {place.placeLabel}</button>)}
  {places.length > 1 && <button type="button" onClick={() => onSelectSharedPlace("Shared place", places)}>Shared Issue place</button>}
</div> }));

import { HomeWorkspace } from "@/app/home/home-workspace";

function review(id: string): BridgeCandidateReview {
  return { phase1_source_id: id, source_title: `Article ${id}`, main_issue_status: "MAIN_ISSUE_FOUND", main_issue: { label: `Issue ${id}`, summary: `Summary ${id}`, evidence_quote: `Quote ${id}` }, processed_at: "2026-09-01" } as BridgeCandidateReview;
}
function event(id: string, source: string, type: string | null, mapped = true): Phase5Event {
  return { id, phase1_source_id: source, title: `Event ${id}`, classification: { event_type_name: type }, qualification: { status: "FINAL", reason_codes: [] }, timeline: { event_date: null },
    event_geographies: mapped ? [{ geographic_reference_id: `place-${source}`, canonical_name: "Shared place", country_iso3: "ARG", latitude: 1, longitude: 2, resolution_status: "RESOLVED" }] : [], actor_geographies: [], created_at: "2026-09-01" } as Phase5Event;
}

describe("HomeWorkspace Issue Atlas", () => {
  beforeEach(() => { listPhase5Events.mockReset(); listBridgeCandidateReviews.mockReset(); params.delete("present"); });

  it("shows all Issue places, selects an Issue from a point, and keeps event detail in Explore", async () => {
    listBridgeCandidateReviews.mockResolvedValue([review("a"), review("b")]);
    listPhase5Events.mockResolvedValue([event("a1", "a", "Diplomacy"), event("b1", "b", null)]);
    render(<HomeWorkspace />);
    expect(await screen.findByRole("img", { name: "Issue globe" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Point Issue a/i })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Point Issue b/i }));
    expect(screen.getByRole("heading", { name: "Issue b" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Explore this issue/i })).toHaveAttribute("href", "/explore?issue=b");
    fireEvent.click(screen.getByRole("button", { name: "Shared Issue place" }));
    const chooser = screen.getByRole("region", { name: /Issues at Shared place/i });
    fireEvent.click(within(chooser).getByRole("button", { name: "Issue a" }));
    expect(screen.getByRole("heading", { name: "Issue a" })).toBeVisible();
    expect(screen.getAllByRole("link").every((link) => !link.getAttribute("href")?.includes("&event="))).toBe(true);
    expect(screen.getByRole("link", { name: /Diplomacy.*1/i })).toHaveAttribute("href", "/explore?scope=all&type=Diplomacy");
    expect(screen.getByRole("link", { name: /Explore mapped events/i })).toHaveAttribute("href", "/explore?scope=all&location=mapped");
    expect(screen.getByText(/Unclassified/)).toBeVisible();
  });

  it("lets users find an Issue outside the recent rail and keeps unmapped Issues selectable", async () => {
    listBridgeCandidateReviews.mockResolvedValue(["a", "b", "c", "d", "e", "f"].map(review));
    listPhase5Events.mockResolvedValue([event("a1", "a", "Diplomacy")]);
    render(<HomeWorkspace />);
    expect(await screen.findByRole("img", { name: "Issue globe" })).toBeVisible();
    fireEvent.change(screen.getByRole("searchbox", { name: /Find an issue/i }), { target: { value: "Issue f" } });
    fireEvent.click(screen.getByRole("button", { name: /Issue f/i }));
    expect(screen.getByRole("heading", { name: "Issue f" })).toBeVisible();
    expect(screen.getByText(/No resolved related locations for this Issue/i)).toBeVisible();
  });

  it("separates load errors, empty Issues, and presentation mode", async () => {
    listBridgeCandidateReviews.mockResolvedValue([]);
    listPhase5Events.mockRejectedValueOnce(new Error("offline"));
    const { unmount } = render(<HomeWorkspace />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not load Main Issues/i);
    expect(screen.getByRole("button", { name: /Retry/i })).toBeVisible();
    unmount();
    listPhase5Events.mockResolvedValue([]);
    params.set("present", "1");
    render(<HomeWorkspace />);
    expect(await screen.findByText(/No Phase 2 Main Issues yet/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Exit presentation" })).toHaveAttribute("href", "/home");
    await waitFor(() => expect(document.querySelector(".app-shell")).toHaveAttribute("data-presentation", "true"));
  });
});
