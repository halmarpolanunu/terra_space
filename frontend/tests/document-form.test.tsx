import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentForm } from "@/app/documents/document-form";

describe("DocumentForm", () => {
  it("requires one publication date and explains what it means", () => {
    render(<DocumentForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/title/i)).toBeRequired();
    expect(screen.getByLabelText(/content/i)).toBeRequired();
    expect(screen.getByLabelText("Publication date")).toBeRequired();
    expect(screen.queryByLabelText(/document date/i)).not.toBeInTheDocument();
    expect(screen.getByText("Date the source document was made.")).toBeVisible();
    expect(screen.getByLabelText(/source url/i)).not.toBeRequired();
  });
});
