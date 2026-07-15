import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-reduced-motion", () => ({ useReducedMotion: vi.fn() }));

import {
  LayeredCommandDeck,
  type LayeredCommandDeckProps,
} from "@/app/dashboard/layered-command-deck";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

beforeEach(() => {
  vi.mocked(useReducedMotion).mockReturnValue(false);
});

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
    parallaxEnabled: true,
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

  it("focuses edge instruments and dismisses the active layer with Escape", () => {
    const onActivePanelChange = vi.fn();
    const props = makeProps({ onActivePanelChange });
    const { rerender } = render(<LayeredCommandDeck {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Situation summary" }));
    expect(onActivePanelChange).toHaveBeenCalledWith("summary");

    rerender(<LayeredCommandDeck {...props} activePanel="summary" />);
    expect(screen.getByRole("button", { name: "Situation summary" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    fireEvent.keyDown(
      screen.getByRole("region", { name: "Global operating picture" }),
      { key: "Escape" },
    );
    expect(onActivePanelChange).toHaveBeenLastCalledWith(null);
  });

  it("sets and resets bounded parallax variables from the stage pointer", () => {
    render(<LayeredCommandDeck {...makeProps()} />);
    const stage = screen.getByRole("region", { name: "Global operating picture" });
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerMove(stage, { clientX: 75, clientY: 25 });
    expect(stage.style.getPropertyValue("--deck-parallax-x")).toBe("4.00px");
    expect(stage.style.getPropertyValue("--deck-parallax-y")).toBe("-2.50px");

    fireEvent.pointerLeave(stage);
    expect(stage.style.getPropertyValue("--deck-parallax-x")).toBe("0px");
    expect(stage.style.getPropertyValue("--deck-parallax-y")).toBe("0px");
  });

  it.each([
    ["reduced motion", true, true],
    ["projection fallback", false, false],
  ])("does not calculate parallax for %s", (_, reducedMotion, parallaxEnabled) => {
    vi.mocked(useReducedMotion).mockReturnValue(reducedMotion);
    render(<LayeredCommandDeck {...makeProps({ parallaxEnabled })} />);
    const stage = screen.getByRole("region", { name: "Global operating picture" });
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerMove(stage, { clientX: 75, clientY: 25 });
    expect(stage.style.getPropertyValue("--deck-parallax-x")).toBe("");
    expect(stage.style.getPropertyValue("--deck-parallax-y")).toBe("");
  });

  it("keeps every data instrument usable when the map package is unavailable", () => {
    render(
      <LayeredCommandDeck
        {...makeProps({ globe: <p role="alert">Map package is not installed.</p> })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Map package is not installed.");
    expect(screen.getByRole("button", { name: "Situation summary" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Recent signals" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Event register.*6/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Filters.*2/i })).toBeEnabled();
  });
});
