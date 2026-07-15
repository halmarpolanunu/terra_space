import { act, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

function PreferenceProbe() {
  return <output>{useReducedMotion() ? "reduced" : "full"}</output>;
}

describe("useReducedMotion", () => {
  it("tracks the browser preference and removes its listener on unmount", () => {
    let listener: (() => void) | undefined;
    let matches = false;
    const removeEventListener = vi.fn();
    const mediaQuery = {
      get matches() { return matches; },
      addEventListener: (_: string, nextListener: () => void) => {
        listener = nextListener;
      },
      removeEventListener,
    };
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => mediaQuery),
    );

    const { unmount } = render(<PreferenceProbe />);

    expect(screen.getByText("full")).toBeVisible();
    act(() => {
      matches = true;
      listener?.();
    });
    expect(screen.getByText("reduced")).toBeVisible();

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith("change", listener);
    vi.unstubAllGlobals();
  });

  it("defines shared cinematic timings and suppresses animation for reduced motion", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toContain("--motion-quick: 140ms");
    expect(css).toContain("--motion-standard: 320ms");
    expect(css).toContain("--motion-cinematic: 680ms");
    expect(css).toContain("--motion-ease: cubic-bezier(0.05, 0.7, 0.1, 1)");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration: 0\.01ms !important/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-iteration-count: 1 !important/,
    );
  });
});
