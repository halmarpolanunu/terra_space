import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FramedPanel } from "@/components/framed-panel";
import { StatusChip } from "@/components/status-chip";

describe("FramedPanel", () => {
  it("renders its title and children inside the .panel structure", () => {
    render(
      <FramedPanel title="Source Document">
        <p>Body content</p>
      </FramedPanel>,
    );

    const title = screen.getByText("Source Document");
    expect(title).toHaveClass("panel-title");
    expect(title.parentElement).toHaveClass("panel");
    expect(screen.getByText("Body content").closest(".panel")).not.toBeNull();
  });

  it("omits the title element when no title is given", () => {
    render(
      <FramedPanel>
        <p>Body content</p>
      </FramedPanel>,
    );

    expect(screen.queryByText(/panel-title/)).toBeNull();
  });
});

describe("StatusChip", () => {
  it("renders the given color token as its style", () => {
    render(<StatusChip colorVar="--status-confirmed" label="Confirmed" value="confirmed" />);

    const chip = screen.getByText("Confirmed");
    expect(chip).toHaveAttribute("data-status", "confirmed");
    expect(chip.style.color).toBe("var(--status-confirmed)");
    expect(chip.style.borderColor).toBe("var(--status-confirmed)");
  });

  it("renders without inline color when no colorVar is given", () => {
    render(<StatusChip label="Draft" value="draft" />);

    const chip = screen.getByText("Draft");
    expect(chip.style.color).toBe("");
  });
});
