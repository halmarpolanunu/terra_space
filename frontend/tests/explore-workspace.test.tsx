import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Phase5Event } from "@/lib/bridge-api";

const mocks = vi.hoisted(() => ({ list: vi.fn<() => Promise<Phase5Event[]>>(), push: vi.fn(), search: new URLSearchParams() }));
vi.mock("@/lib/bridge-api", () => ({ listPhase5Events: mocks.list, getBridgeSource: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => mocks.search }));
vi.mock("@/app/dashboard/event-globe", () => ({ EventGlobe: () => <div role="region" aria-label="Event globe" /> }));

import { ExploreWorkspace } from "@/app/explore/explore-workspace";

const event = { id: "e1", title: "First signal", description: "Description", evidence_quote: "Exact quote", qualification: { status: "NOT_FINAL", reason_codes: ["REVIEW_NEEDED"] }, classification: { event_type_name: "Conflict" }, timeline: { event_date: null, reference_date: "2026-09-01", limitations: [] }, event_geographies: [], actor_geographies: [] } as unknown as Phase5Event;

describe("ExploreWorkspace", () => {
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
});
