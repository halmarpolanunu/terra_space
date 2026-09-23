import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Phase5Event } from "@/lib/bridge-api";

const { listPhase5Events, params } = vi.hoisted(() => ({ listPhase5Events: vi.fn<() => Promise<Phase5Event[]>>(), params: new URLSearchParams() }));
vi.mock("@/lib/bridge-api", () => ({ listPhase5Events }));
vi.mock("@/app/dashboard/event-globe", () => ({ EventGlobe: ({ events, onSelectCluster }: { events: { id: string; title: string }[]; onSelectCluster?: (events: { id: string; title: string }[], label: string) => void }) => <div role="region" aria-label="Event globe"><button type="button" onClick={() => onSelectCluster?.(events, "Shared place")}>Shared marker</button></div> }));
vi.mock("next/navigation", () => ({ useSearchParams: () => params }));

import { HomeWorkspace } from "@/app/home/home-workspace";

describe("HomeWorkspace", () => {
  beforeEach(() => { listPhase5Events.mockReset(); params.delete("present"); });
  it("distinguishes API failure from an empty result and offers retry", async () => {
    listPhase5Events.mockRejectedValueOnce(new Error("offline"));
    render(<HomeWorkspace />);
    expect(await screen.findByText(/could not load current Phase 5 events/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /retry/i })).toBeVisible();
    expect(screen.queryByText("0 events")).not.toBeInTheDocument();
  });
  it("shows an honest empty state", async () => {
    listPhase5Events.mockResolvedValue([]);
    render(<HomeWorkspace />);
    await waitFor(() => expect(screen.getByText(/No current Phase 5 events yet/i)).toBeVisible());
    expect(screen.getByText("Current Phase 5 events")).toBeVisible();
  });
  it("keeps the data scope and an exit in presentation mode", async () => {
    params.set("present", "1");
    listPhase5Events.mockResolvedValue([]);
    render(<HomeWorkspace />);
    expect(await screen.findByText(/No current Phase 5 events yet/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Exit presentation" })).toHaveAttribute("href", "/home");
    expect(document.querySelector(".app-shell")).toHaveAttribute("data-presentation", "true");
    expect(screen.getByText("Current Phase 5 events")).toBeVisible();
  });
  it("links real qualification and type counts to their Explore records", async () => {
    const event = { id: "one", title: "Signal", description: "Description", evidence_quote: "Quote", qualification: { status: "FINAL", reason_codes: [] }, classification: { event_type_name: "Conflict" }, timeline: { event_date: "2026-09-01" }, event_geographies: [{ resolution_status: "RESOLVED", latitude: 1, longitude: 2 }], actor_geographies: [], created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z" } as unknown as Phase5Event;
    listPhase5Events.mockResolvedValue([event]);
    render(<HomeWorkspace />);
    expect(await screen.findByRole("region", { name: "Phase 5 event globe" })).toBeVisible();
    const links = screen.getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href") === "/explore?status=FINAL")).toBe(true);
    expect(links.some((link) => link.getAttribute("href") === "/explore?type=Conflict")).toBe(true);
  });
  it("lets a shared map marker reveal each event and links pending records", async () => {
    const base = { id: "one", title: "First", qualification: { status: null, reason_codes: [] }, classification: { event_type_name: "Conflict" }, timeline: { event_date: null }, event_geographies: [{ resolution_status: "RESOLVED", latitude: 1, longitude: 2 }], actor_geographies: [], created_at: "2026-09-01", updated_at: "2026-09-01" } as unknown as Phase5Event;
    listPhase5Events.mockResolvedValue([base, { ...base, id: "two", title: "Second" }]);
    render(<HomeWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: "Shared marker" }));
    const chooser = screen.getByRole("region", { name: "Events at Shared place" });
    expect(within(chooser).getByRole("link", { name: "First" })).toHaveAttribute("href", "/explore?event=one");
    expect(within(chooser).getByRole("link", { name: "Second" })).toHaveAttribute("href", "/explore?event=two");
    expect(screen.getAllByRole("link").some((link) => link.getAttribute("href") === "/explore?status=PENDING")).toBe(true);
  });
});
