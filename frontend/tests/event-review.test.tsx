import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReviewBar } from "@/app/event-review/review-bar";
import { SourcePanel } from "@/app/event-review/source-panel";

describe("ReviewBar", () => {
  it("shows document and event progress counts", () => {
    render(
      <ReviewBar
        canNext
        canPrev={false}
        documentCount={3}
        documentIndex={1}
        eventCount={4}
        eventIndex={2}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    expect(screen.getByText("Document 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Event 3 of 4")).toBeInTheDocument();
  });

  it("calls onNext, onPrev, and onSkip when their buttons are clicked", () => {
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const onSkip = vi.fn();
    render(
      <ReviewBar
        canNext
        canPrev
        documentCount={2}
        documentIndex={0}
        eventCount={2}
        eventIndex={0}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /prev/i }));
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("disables Prev and Next when canPrev/canNext are false", () => {
    render(
      <ReviewBar
        canNext={false}
        canPrev={false}
        documentCount={1}
        documentIndex={0}
        eventCount={1}
        eventIndex={0}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /prev/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });
});

describe("SourcePanel", () => {
  const content =
    "A local militia reportedly attacked the fuel depot on 2026-07-10, near the northern gate.";

  it("highlights only the substring matching the evidence quote", () => {
    render(<SourcePanel content={content} evidenceQuote="attacked the fuel depot" />);

    const highlighted = screen.getByText("attacked the fuel depot");
    expect(highlighted.tagName).toBe("MARK");
    expect(highlighted).toHaveClass("evidence-highlight");
  });

  it("matches case- and whitespace-insensitively", () => {
    render(
      <SourcePanel content={content} evidenceQuote="ATTACKED   THE FUEL depot" />,
    );

    const highlighted = screen.getByText("attacked the fuel depot");
    expect(highlighted.tagName).toBe("MARK");
  });

  it("re-highlights when the evidence quote changes", () => {
    const { container, rerender } = render(
      <SourcePanel content={content} evidenceQuote="attacked the fuel depot" />,
    );
    expect(container.querySelectorAll("mark")).toHaveLength(1);
    expect(screen.getByText("attacked the fuel depot").tagName).toBe("MARK");

    rerender(<SourcePanel content={content} evidenceQuote="the northern gate" />);
    expect(container.querySelectorAll("mark")).toHaveLength(1);
    expect(screen.getByText("the northern gate").tagName).toBe("MARK");
  });

  it("renders plain text with no highlight when there is no evidence quote", () => {
    const { container } = render(<SourcePanel content={content} />);

    expect(container.querySelectorAll("mark")).toHaveLength(0);
  });
});
