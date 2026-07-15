import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  LayeredCommandDeck,
  type LayeredCommandDeckProps,
} from "@/app/dashboard/layered-command-deck";

function makeProps(
  overrides: Partial<LayeredCommandDeckProps> = {},
): LayeredCommandDeckProps {
  return {
    activeFilterCount: 2,
    activePanel: null,
    eventsHref: "/events",
    eventCount: 6,
    eyebrow: "Approved intelligence",
    filters: <p>Filter form</p>,
    globe: <p>Globe canvas</p>,
    markerCount: 4,
    onActivePanelChange: vi.fn(),
    register: <p>Event rows</p>,
    signals: <p>Three recent signals</p>,
    sortLabel: "Title (A–Z)",
    stageLabel: "Global operating picture",
    summary: <p>Three summary metrics</p>,
    title: "Dashboard",
    ...overrides,
  };
}

describe("LayeredCommandDeck", () => {
  it("keeps the globe and compact edge instruments visible in its resting state", () => {
    render(<LayeredCommandDeck {...makeProps()} />);

    expect(
      screen.getByRole("region", { name: "Global operating picture" }),
    ).toHaveClass("layered-command-deck");
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    expect(screen.getByText("Global operating picture")).toBeVisible();
    expect(screen.getByText("Globe canvas")).toBeVisible();
    expect(screen.getByRole("button", { name: "Situation summary" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Recent signals" })).toBeVisible();
    expect(screen.getByText("Three summary metrics")).toBeVisible();
    expect(screen.getByText("Three recent signals")).toBeVisible();
    expect(screen.getByRole("button", { name: /Event register.*6/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Filters.*2/i })).toBeVisible();
    expect(screen.getByText("Sort · Title (A–Z)")).toBeVisible();
    expect(screen.getByText("Markers · 4")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open Events" })).toHaveAttribute(
      "href",
      "/events",
    );
    expect(screen.queryByText("Filter form")).not.toBeInTheDocument();
    expect(screen.queryByText("Event rows")).not.toBeInTheDocument();
  });

  it("renders only the selected dock drawer", () => {
    const { rerender } = render(
      <LayeredCommandDeck {...makeProps({ activePanel: "filters" })} />,
    );

    expect(screen.getByText("Filter form")).toBeVisible();
    expect(screen.queryByText("Event rows")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Filters.*2/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    rerender(<LayeredCommandDeck {...makeProps({ activePanel: "register" })} />);
    expect(screen.getByText("Event rows")).toBeVisible();
    expect(screen.queryByText("Filter form")).not.toBeInTheDocument();
  });
});
