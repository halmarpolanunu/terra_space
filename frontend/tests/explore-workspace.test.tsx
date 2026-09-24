import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BridgeCandidateReview, Phase5Event } from "@/lib/bridge-api";

const mocks = vi.hoisted(() => ({ list: vi.fn<() => Promise<Phase5Event[]>>(), reviews: vi.fn<() => Promise<BridgeCandidateReview[]>>(), push: vi.fn(), search: new URLSearchParams() }));
vi.mock("@/lib/bridge-api", () => ({ listPhase5Events: mocks.list, listBridgeCandidateReviews: mocks.reviews, getBridgeSource: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => mocks.search }));
vi.mock("@/app/dashboard/event-globe", () => ({ EventGlobe: ({ events, onSelectCluster }: { events: { id: string; title: string }[]; onSelectCluster?: (events: { id: string; title: string }[], label: string) => void }) => <div role="region" aria-label="Event globe"><button type="button" onClick={() => onSelectCluster?.(events, "Shared place")}>Shared marker</button></div> }));

import { ExploreWorkspace } from "@/app/explore/explore-workspace";

const event = { id: "e1", phase1_source_id: "source-one", title: "First signal", description: "Description", evidence_quote: "Exact quote", qualification: { status: "NOT_FINAL", reason_codes: ["REVIEW_NEEDED"] }, classification: { event_type_name: "Conflict" }, timeline: { event_date: null, reference_date: "2026-09-01", limitations: [] }, event_geographies: [], actor_geographies: [] } as unknown as Phase5Event;
const review = { phase1_source_id: "source-one", source_title: "Source article", main_issue_status: "MAIN_ISSUE_FOUND", main_issue: { label: "Main concern", summary: "Issue summary", evidence_quote: "Grounded issue quote" }, processed_at: "2026-09-01" } as BridgeCandidateReview;

describe("ExploreWorkspace", () => {
  beforeEach(() => { mocks.reviews.mockResolvedValue([review]); mocks.search = new URLSearchParams(); mocks.push.mockClear(); });
  it("shows the current set, unknown date, evidence, and earlier route", async () => {
    mocks.list.mockResolvedValue([event]);
    render(<ExploreWorkspace />);
    expect(await within(await screen.findByRole("region", { name: "Filtered event list" })).findByRole("button", { name: "First signal" })).toBeVisible();
    expect(screen.getByText(/Date unknown/i)).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Earlier events" })[0]).toHaveAttribute("href", "/events");
    fireEvent.click(within(screen.getByRole("region", { name: "Filtered event list" })).getByRole("button", { name: "First signal" }));
    expect(screen.getByText("Exact quote")).toBeVisible();
    expect(screen.getByText("REVIEW_NEEDED")).toBeVisible();
    expect(screen.getByRole("button", { name: /Close detail/i })).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText("Event evidence detail"), { key: "Escape" });
    expect(screen.queryByLabelText("Event evidence detail")).not.toBeInTheDocument();
  });
  it("synchronizes qualification filter with URL", async () => {
    mocks.list.mockResolvedValue([event]);
    render(<ExploreWorkspace />);
    await waitFor(() => expect(within(screen.getByRole("region", { name: "Filtered event list" })).getByRole("button", { name: "First signal" })).toBeVisible());
    fireEvent.change(screen.getByLabelText("Qualification"), { target: { value: "FINAL" } });
    expect(mocks.push).toHaveBeenCalledWith("/explore?status=FINAL");
  });
  it("keeps rapid search typing before updating the URL", async () => {
    mocks.search = new URLSearchParams(); mocks.push.mockClear(); mocks.list.mockResolvedValue([event]);
    render(<ExploreWorkspace />);
    await screen.findByRole("region", { name: "Filtered event list" });
    fireEvent.change(screen.getByLabelText("Search events"), { target: { value: "Fir" } });
    fireEvent.change(screen.getByLabelText("Search events"), { target: { value: "First" } });
    expect(screen.getByLabelText("Search events")).toHaveValue("First");
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/explore?q=First"));
  });
  it("opens co-located events through a shared map marker", async () => {
    mocks.search = new URLSearchParams();
    const mapped = { ...event, event_geographies: [{ resolution_status: "RESOLVED", latitude: 1, longitude: 2 }] } as Phase5Event;
    mocks.list.mockResolvedValue([mapped, { ...mapped, id: "e2", title: "Second signal", evidence_quote: "Second quote" }]);
    render(<ExploreWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: "Shared marker" }));
    fireEvent.click(within(screen.getByRole("region", { name: "Events at Shared place" })).getByRole("button", { name: "Second signal" }));
    expect(screen.getByText("Second quote")).toBeVisible();
  });
});
