import { render, screen, within } from "@testing-library/react";
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
    expect(title).toHaveRole("heading", { level: 2 });
    expect(title.closest(".panel")).not.toBeNull();
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

  it("groups compact metadata with its section title", () => {
    render(
      <FramedPanel meta={<span>Markers 4</span>} title="Event locations">
        <p>Map</p>
      </FramedPanel>,
    );

    const heading = screen.getByText("Event locations").closest(".panel-heading");
    expect(heading).not.toBeNull();
    expect(within(heading!).getByText("Markers 4").closest(".panel-meta")).not.toBeNull();
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
