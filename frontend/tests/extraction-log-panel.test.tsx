import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/documents-api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/documents-api")>("@/lib/documents-api");
  return { ...actual, listExtractionLog: vi.fn() };
});

import { ExtractionLogPanel } from "@/app/documents/extraction-log-panel";
import * as documentsApi from "@/lib/documents-api";
import type { ExtractionLogEntry } from "@/lib/documents-api";

function makeEntry(overrides: Partial<ExtractionLogEntry> = {}): ExtractionLogEntry {
  return {
    id: "entry-1",
    document_id: "doc-1",
    candidate_index: 0,
    stage: "locations",
    outcome: "dropped",
    detail: "Location text not found in the candidate's evidence quote.",
    created_at: "2026-07-21T00:00:00Z",
    ...overrides,
  };
}

describe("ExtractionLogPanel", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows entries once loaded, newest first as returned by the API", async () => {
    vi.mocked(documentsApi.listExtractionLog).mockResolvedValue([
      makeEntry({ id: "entry-2", stage: "actors", outcome: "failed", detail: "Timed out." }),
      makeEntry({ id: "entry-1" }),
    ]);

    render(<ExtractionLogPanel documentId="doc-1" />);

    expect(await screen.findByText("Timed out.")).toBeVisible();
    expect(
      screen.getByText("Location text not found in the candidate's evidence quote."),
    ).toBeVisible();
    expect(documentsApi.listExtractionLog).toHaveBeenCalledWith("doc-1");
  });

  it("shows an empty state when there are no entries", async () => {
    vi.mocked(documentsApi.listExtractionLog).mockResolvedValue([]);

    render(<ExtractionLogPanel documentId="doc-1" />);

    expect(await screen.findByText(/no extraction log entries/i)).toBeVisible();
  });

  it("shows an error when the log cannot be loaded", async () => {
    vi.mocked(documentsApi.listExtractionLog).mockRejectedValue(new Error("offline"));

    render(<ExtractionLogPanel documentId="doc-1" />);

    await waitFor(() => expect(screen.getByText("offline")).toBeVisible());
  });
});
