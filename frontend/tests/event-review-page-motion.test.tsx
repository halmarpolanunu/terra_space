import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/lib/documents-api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/documents-api")>("@/lib/documents-api");
  return { ...actual, listDocuments: vi.fn() };
});

vi.mock("@/lib/events-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/events-api")>("@/lib/events-api");
  return {
    ...actual,
    listActors: vi.fn(),
    listEventsForDocument: vi.fn(),
    listEventTypes: vi.fn(),
  };
});

import EventReviewPage from "@/app/event-review/page";
import * as documentsApi from "@/lib/documents-api";
import type { Document } from "@/lib/documents-api";
import * as eventsApi from "@/lib/events-api";
import type { EventRead } from "@/lib/events-api";

function makeEvent(id: string, title: string): EventRead {
  return {
    id,
    title,
    summary: `${title} summary`,
    start_date: "2026-07-10",
    start_date_precision: "exact",
    end_date: null,
    end_date_precision: null,
    epistemic_status: "claim",
    review_status: "draft",
    event_type: { id: "type-1", name: "Movement", is_active: true },
    actors: [],
    locations: [],
    sources: [],
    duplicate_flags: [],
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
  };
}

const documentFixture: Document = {
  id: "document-1",
  title: "Field report",
  content: "A convoy crossed the bridge before dawn.",
  document_date: "2026-07-10",
  publication_date: "2026-07-11",
  source_url: "https://example.test/report",
  input_date: "2026-07-14T00:00:00Z",
  processing_status: "ready_for_review",
  processing_error: null,
  created_at: "2026-07-14T00:00:00Z",
  updated_at: "2026-07-14T00:00:00Z",
  attachments: [],
};

describe("EventReviewPage motion direction", () => {
  beforeEach(() => {
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([documentFixture]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);
    vi.mocked(eventsApi.listEventsForDocument).mockResolvedValue([
      makeEvent("event-1", "Bridge crossing reported"),
      makeEvent("event-2", "Convoy reached the depot"),
    ]);
  });

  it("keys the active source/event pair and reports next, previous, and skip direction", async () => {
    render(<EventReviewPage />);

    await screen.findByText("Bridge crossing reported");
    const firstPair = document.querySelector(".event-review-columns");
    expect(firstPair).toHaveClass("event-review-transition");
    expect(firstPair).toHaveAttribute("data-motion-direction", "next");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Convoy reached the depot");
    const nextPair = document.querySelector(".event-review-columns");
    expect(nextPair).not.toBe(firstPair);
    expect(nextPair).toHaveAttribute("data-motion-direction", "next");

    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    await screen.findByText("Bridge crossing reported");
    const previousPair = document.querySelector(".event-review-columns");
    expect(previousPair).not.toBe(nextPair);
    expect(previousPair).toHaveAttribute("data-motion-direction", "previous");

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await screen.findByText("Convoy reached the depot");
    await waitFor(() =>
      expect(document.querySelector(".event-review-columns")).toHaveAttribute(
        "data-motion-direction",
        "next",
      ),
    );
  });
});
