import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/documents-api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/documents-api")>("@/lib/documents-api");
  return { ...actual, listExtractionLog: vi.fn() };
});

import { DocumentList } from "@/app/documents/document-list";
import * as documentsApi from "@/lib/documents-api";
import type { Document } from "@/lib/documents-api";

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    title: "Report",
    content: "Body",
    publication_date: "2026-07-10",
    source_url: null,
    input_date: "2026-07-14T00:00:00Z",
    processing_status: "completed",
    processing_error: null,
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
    attachments: [],
    ...overrides,
  };
}

describe("DocumentList extraction log", () => {
  afterEach(() => vi.clearAllMocks());

  it("offers an Extraction log toggle for a processed document", () => {
    render(
      <DocumentList
        documents={[makeDocument()]}
        onProcessSelected={vi.fn()}
        onToggleSelect={vi.fn()}
        selectedIds={new Set()}
      />,
    );

    expect(screen.getByRole("button", { name: /extraction log/i })).toBeVisible();
  });

  it("does not offer the toggle for a document that has never been processed", () => {
    render(
      <DocumentList
        documents={[makeDocument({ processing_status: "draft" })]}
        onProcessSelected={vi.fn()}
        onToggleSelect={vi.fn()}
        selectedIds={new Set()}
      />,
    );

    expect(screen.queryByRole("button", { name: /extraction log/i })).not.toBeInTheDocument();
  });

  it("expands to show the log entries on click", async () => {
    vi.mocked(documentsApi.listExtractionLog).mockResolvedValue([
      {
        id: "entry-1",
        document_id: "doc-1",
        candidate_index: 0,
        stage: "locations",
        outcome: "dropped",
        detail: "Location text not found in the candidate's evidence quote.",
        created_at: "2026-07-21T00:00:00Z",
      },
    ]);

    render(
      <DocumentList
        documents={[makeDocument()]}
        onProcessSelected={vi.fn()}
        onToggleSelect={vi.fn()}
        selectedIds={new Set()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /extraction log/i }));

    expect(
      await screen.findByText("Location text not found in the candidate's evidence quote."),
    ).toBeVisible();
    expect(documentsApi.listExtractionLog).toHaveBeenCalledWith("doc-1");
  });
});
