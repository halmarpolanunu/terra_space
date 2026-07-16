import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  COMMAND_DECK_REFERENCE_HEIGHT,
  COMMAND_DECK_REFERENCE_WIDTH,
  CommandDeckViewport,
  calculateCommandDeckScale,
} from "@/app/dashboard/command-deck-viewport";

describe("calculateCommandDeckScale", () => {
  it("never enlarges the approved command-deck composition", () => {
    expect(calculateCommandDeckScale(1900, 1000)).toBe(1);
    expect(calculateCommandDeckScale(COMMAND_DECK_REFERENCE_WIDTH, COMMAND_DECK_REFERENCE_HEIGHT)).toBe(1);
  });

  it("uses the tighter viewport dimension when shrinking", () => {
    expect(calculateCommandDeckScale(1024, 562)).toBeCloseTo(1024 / 1664, 5);
    expect(calculateCommandDeckScale(1400, 650)).toBeCloseTo(650 / 872, 5);
  });

  it("returns the safe default before a viewport has measurable size", () => {
    expect(calculateCommandDeckScale(0, 562)).toBe(1);
    expect(calculateCommandDeckScale(1024, 0)).toBe(1);
  });
});

describe("CommandDeckViewport", () => {
  let resizeCallback: ResizeObserverCallback | undefined;
  const disconnect = vi.fn();

  afterEach(() => {
    resizeCallback = undefined;
    disconnect.mockClear();
    vi.unstubAllGlobals();
  });

  it("writes one scale for the complete command-deck canvas", () => {
    class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) { resizeCallback = callback; }
      observe() {}
      unobserve() {}
      disconnect() { disconnect(); }
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);

    const { container } = render(
      <CommandDeckViewport><div>Complete deck</div></CommandDeckViewport>,
    );

    act(() => {
      resizeCallback?.(
        [{ contentRect: { width: 1024, height: 562 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    const canvas = container.querySelector<HTMLElement>(".command-deck-canvas");
    expect(canvas).toHaveAttribute("data-command-deck-scale", "0.6154");
    expect(Number(canvas?.style.getPropertyValue("--command-deck-scale"))).toBeCloseTo(
      1024 / 1664,
      5,
    );
  });
});
