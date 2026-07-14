import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/documents-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/documents-api")>("@/lib/documents-api");
  return { ...actual, listDocuments: vi.fn() };
});

vi.mock("@/lib/events-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/events-api")>("@/lib/events-api");
  return { ...actual, listEventTypes: vi.fn(), listActors: vi.fn() };
});

import EventReviewPage from "@/app/event-review/page";
import * as documentsApi from "@/lib/documents-api";
import * as eventsApi from "@/lib/events-api";

describe("EventReviewPage empty state", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows a framed orientation message and a link to Documents when nothing is waiting for review", async () => {
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([]);
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue([]);
    vi.mocked(eventsApi.listActors).mockResolvedValue([]);

    render(<EventReviewPage />);

    expect(await screen.findByText("No documents are waiting for review.")).toBeVisible();
    expect(
      screen.getByText(
        "Events extracted from processed documents appear here for one-at-a-time approval.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /add or process documents/i })).toHaveAttribute(
      "href",
      "/documents",
    );
  });
});
