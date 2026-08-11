import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/bridge-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bridge-api")>("@/lib/bridge-api");
  return { ...actual, listBridgeCandidateReviews: vi.fn() };
});

import EventReviewPage from "@/app/event-review/page";
import * as bridgeApi from "@/lib/bridge-api";

describe("EventReviewPage empty state", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows a framed orientation message and a link to Sources when nothing has a Phase 2 result yet", async () => {
    vi.mocked(bridgeApi.listBridgeCandidateReviews).mockResolvedValue([]);

    render(<EventReviewPage />);

    expect(await screen.findByText("No sources have a Phase 2 result yet.")).toBeVisible();
    expect(screen.getByRole("link", { name: /open sources/i })).toHaveAttribute("href", "/documents");
  });
});
