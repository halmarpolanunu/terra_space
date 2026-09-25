import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sources: vi.fn(), reviews: vi.fn(), events: vi.fn() }));
vi.mock("@/lib/bridge-api", () => ({ listBridgeSources: mocks.sources, listPipelineReviews: mocks.reviews, listPhase5Events: mocks.events }));
import { PrepareWorkspace } from "@/app/prepare/prepare-workspace";

describe("PrepareWorkspace", () => {
  it("shows six stages, useful routes, and an honest section failure", async () => {
    mocks.sources.mockResolvedValue([]);
    mocks.reviews.mockRejectedValue(new Error("offline"));
    mocks.events.mockResolvedValue([]);
    render(<PrepareWorkspace />);
    expect(await screen.findByText("Could not load candidate reviews.")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Sources" })[0]).toHaveAttribute("href", "/documents");
    expect(screen.getByText("Final Qualification")).toBeVisible();
  });
});
