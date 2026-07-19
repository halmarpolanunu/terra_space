import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/documents-api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/documents-api")>("@/lib/documents-api");
  return {
    ...actual,
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    processDocuments: vi.fn(),
    retryDocument: vi.fn(),
  };
});

import DocumentsPage from "@/app/documents/page";
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

describe("DocumentsPage batch processing", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("marks populated rows and attachment thumbnails for restrained motion", async () => {
    const document = makeDocument({
      attachments: [
        {
          id: "attachment-1",
          original_name: "briefing-map.png",
          media_type: "image/png",
          size_bytes: 2048,
          created_at: "2026-07-14T00:00:00Z",
        },
      ],
    });
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([document]);

    render(<DocumentsPage />);

    const title = await screen.findByText(document.title);
    expect(title.closest("li")).toHaveAttribute("data-motion-item", "document-row");
    expect(screen.getByAltText("briefing-map.png").closest(".attachment-thumb")).toHaveAttribute(
      "data-motion-item",
      "attachment",
    );
  });

  it("shows the confirmation dialog before reprocessing, and proceeds only once confirmed", async () => {
    const document = makeDocument();
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([document]);
    vi.mocked(documentsApi.processDocuments).mockResolvedValueOnce({
      status: "confirmation_required",
      document_ids: [document.id],
    });

    render(<DocumentsPage />);
    await screen.findByText(document.title);

    fireEvent.click(screen.getByLabelText(`Select ${document.title}`));
    fireEvent.click(screen.getByRole("button", { name: /process 1 selected/i }));

    await screen.findByText(/1 selected document has approved events/i);
    expect(documentsApi.processDocuments).toHaveBeenCalledTimes(1);
    expect(documentsApi.processDocuments).toHaveBeenCalledWith([document.id]);

    vi.mocked(documentsApi.processDocuments).mockResolvedValueOnce({
      status: "queued",
      document_ids: [document.id],
    });

    fireEvent.click(screen.getByRole("button", { name: /reprocess anyway/i }));

    await waitFor(() => expect(documentsApi.processDocuments).toHaveBeenCalledTimes(2));
    expect(documentsApi.processDocuments).toHaveBeenLastCalledWith([document.id], true);
    expect(screen.queryByText(/selected document.*has approved events/i)).not.toBeInTheDocument();
  });

  it(
    "polls document status after processing starts and reflects the badge as it changes",
    async () => {
      const target = makeDocument({ processing_status: "draft" });
      vi.mocked(documentsApi.listDocuments)
        .mockResolvedValueOnce([target])
        .mockResolvedValueOnce([{ ...target, processing_status: "processing" }])
        .mockResolvedValueOnce([{ ...target, processing_status: "ready_for_review" }]);
      vi.mocked(documentsApi.processDocuments).mockResolvedValueOnce({
        status: "queued",
        document_ids: [target.id],
      });

      render(<DocumentsPage />);
      await screen.findByText(target.title);

      fireEvent.click(screen.getByLabelText(`Select ${target.title}`));
      fireEvent.click(screen.getByRole("button", { name: /process 1 selected/i }));

      await waitFor(() => expect(documentsApi.processDocuments).toHaveBeenCalledTimes(1));

      await screen.findByText("Processing", {}, { timeout: 5000 });
      await screen.findByText("Ready for review", {}, { timeout: 5000 });
    },
    10000,
  );

  it("shows a Retry control for a failed document and calls the retry endpoint", async () => {
    const failed = makeDocument({
      processing_status: "failed",
      processing_error: "LM Studio timed out.",
    });
    vi.mocked(documentsApi.listDocuments).mockResolvedValue([failed]);
    vi.mocked(documentsApi.retryDocument).mockResolvedValueOnce({
      status: "queued",
      document_ids: [failed.id],
    });

    render(<DocumentsPage />);
    await screen.findByText("LM Studio timed out.");

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(documentsApi.retryDocument).toHaveBeenCalledWith(failed.id));
  });
});
