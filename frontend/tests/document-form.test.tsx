import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentForm } from "@/app/documents/document-form";

describe("DocumentForm", () => {
  it("marks the three required document fields semantically", () => {
    render(<DocumentForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/title/i)).toBeRequired();
    expect(screen.getByLabelText(/content/i)).toBeRequired();
    expect(screen.getByLabelText(/document date/i)).toBeRequired();
    expect(screen.getByLabelText(/publication date/i)).not.toBeRequired();
    expect(screen.getByLabelText(/source url/i)).not.toBeRequired();
  });
});
