import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentForm } from "@/app/documents/document-form";
import { DocumentList } from "@/app/documents/document-list";
import type { Document } from "@/lib/documents-api";

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    title: "Field report",
    content: "Something happened.",
    document_date: "2026-07-10",
    publication_date: null,
    source_url: null,
    input_date: "2026-07-14T00:00:00Z",
    processing_status: "draft",
    processing_error: null,
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
    ...overrides,
  };
}

describe("DocumentForm", () => {
  it("keeps submit disabled until title, content, and document date are filled", () => {
    render(<DocumentForm onSubmit={vi.fn()} />);

    const submit = screen.getByRole("button", { name: /save/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Field report" } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/content/i), { target: { value: "Body text" } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/document date/i), {
      target: { value: "2026-07-10" },
    });
    expect(submit).toBeEnabled();
  });

  it("submits the draft with the entered values", () => {
    const onSubmit = vi.fn();
    render(<DocumentForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Field report" } });
    fireEvent.change(screen.getByLabelText(/content/i), { target: { value: "Body text" } });
    fireEvent.change(screen.getByLabelText(/document date/i), {
      target: { value: "2026-07-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Field report",
      content: "Body text",
      document_date: "2026-07-10",
      publication_date: null,
      source_url: null,
    });
  });
});

describe("DocumentList", () => {
  it("renders one row per document with a status badge and checkbox", () => {
    const documents = [
      makeDocument({ id: "doc-1", title: "Report A", processing_status: "draft" }),
      makeDocument({ id: "doc-2", title: "Report B", processing_status: "failed" }),
    ];

    render(
      <DocumentList
        documents={documents}
        onProcessSelected={vi.fn()}
        onToggleSelect={vi.fn()}
        selectedIds={new Set()}
      />,
    );

    expect(screen.getByText("Report A")).toBeVisible();
    expect(screen.getByText("Report B")).toBeVisible();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getByText("Draft")).toBeVisible();
    expect(screen.getByText("Failed")).toBeVisible();
  });

  it("enables Process Selected with a count once rows are selected", () => {
    const documents = [
      makeDocument({ id: "doc-1", title: "Report A" }),
      makeDocument({ id: "doc-2", title: "Report B" }),
      makeDocument({ id: "doc-3", title: "Report C" }),
    ];
    const onProcessSelected = vi.fn();

    const { rerender } = render(
      <DocumentList
        documents={documents}
        onProcessSelected={onProcessSelected}
        onToggleSelect={vi.fn()}
        selectedIds={new Set()}
      />,
    );

    const processButton = screen.getByRole("button", { name: /process selected/i });
    expect(processButton).toBeDisabled();

    rerender(
      <DocumentList
        documents={documents}
        onProcessSelected={onProcessSelected}
        onToggleSelect={vi.fn()}
        selectedIds={new Set(["doc-1", "doc-2", "doc-3"])}
      />,
    );

    const enabledButton = screen.getByRole("button", { name: /process 3 selected/i });
    expect(enabledButton).toBeEnabled();

    fireEvent.click(enabledButton);
    expect(onProcessSelected).toHaveBeenCalled();
  });

  it("shows the failure message for a failed document", () => {
    const documents = [
      makeDocument({
        id: "doc-1",
        processing_status: "failed",
        processing_error: "LM Studio timed out.",
      }),
    ];

    render(
      <DocumentList
        documents={documents}
        onProcessSelected={vi.fn()}
        onToggleSelect={vi.fn()}
        selectedIds={new Set()}
      />,
    );

    expect(screen.getByText("LM Studio timed out.")).toBeVisible();
  });
});
