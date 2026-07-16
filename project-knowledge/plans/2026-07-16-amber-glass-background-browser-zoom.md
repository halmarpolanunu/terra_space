---
type: Plan
title: Amber Glass Background and Browser Zoom Implementation Plan
description: Test-first execution plan for route-specific amber backgrounds, restrained shell glass, and whole-canvas Dashboard scaling across browser zoom levels.
tags: [project-knowledge, plan, frontend, design, accessibility]
status: planned
---

# Amber Glass Background and Browser Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. In this repository, execute inline unless the owner explicitly authorizes subagents.

**Goal:** Add the approved five-background amber visual family and restrained glass shell, then keep the complete Dashboard command deck visible by proportionally shrinking its approved composition at higher browser zoom.

**Architecture:** `AppShell` owns one route-to-background contract and exposes the selected local asset through a CSS custom property, so all five menus share one shell implementation. A focused `CommandDeckViewport` owns Dashboard-only scaling: it renders the existing `LayeredCommandDeck` at the approved `1664 x 872` design size and applies one bounded scale derived from the available viewport. Existing work panels remain opaque; no individual page or data workflow is redesigned.

**Tech Stack:** Next.js 16.2.10, React 19.2.4, TypeScript, CSS, Sharp 0.34.5 (already installed through Next.js), Vitest 4.1.10, Testing Library, Playwright 1.61.1, and local ImageGen output.

## Global Constraints

- Follow [Amber Glass Background and Browser Zoom](../decisions/Amber-Glass-Background-and-Browser-Zoom.md) as the approved source of truth.
- Keep the base canvas `#000000`, accent `#f2a93b`, current epistemic-status colors, current logo, and existing typography assignments unchanged.
- Use no blue tint, external image request, text baked into artwork, logo baked into artwork, or moving background.
- Produce five original images from one visual family; do not ship the owner's reference image.
- Keep Documents, Event Review, Events, Settings, source text, forms, and tables nearly opaque and readable.
- Scale only the Dashboard command deck; all other routes reflow normally.
- At 90% and 100% browser zoom, never enlarge the command deck beyond its approved 100% composition.
- Verify 90%, 100%, 110%, 125%, and 150% browser zoom equivalents on the owner's `1920 x 1080` display.
- Keep the frontend fully local and offline-safe; background files live under `frontend/public/backgrounds/`.
- Preserve reduced-motion behavior, MapLibre interaction, keyboard access, and the existing pointer-parallax bounds.
- Phone/mobile remains outside the acceptance target.

---

## File Structure

### New files

- `frontend/public/backgrounds/dashboard.webp` - orbital/radar edge artwork behind the globe.
- `frontend/public/backgrounds/documents.webp` - layered-document and data-flow motif.
- `frontend/public/backgrounds/event-review.webp` - evidence-bracket and extraction-line motif.
- `frontend/public/backgrounds/events.webp` - timeline-signal and coordinate-marker motif.
- `frontend/public/backgrounds/settings.webp` - calibration-ring and control-geometry motif.
- `frontend/scripts/prepare-workspace-backgrounds.mjs` - deterministic 1920 x 1080 WebP normalization and size validation.
- `frontend/src/lib/workspace-backgrounds.ts` - exact route-to-local-asset mapping.
- `frontend/tests/workspace-backgrounds.test.ts` - route mapping and fallback contract.
- `frontend/src/app/dashboard/command-deck-viewport.tsx` - bounded whole-canvas scaling.
- `frontend/tests/command-deck-viewport.test.tsx` - scale calculation and ResizeObserver behavior.
- `tests/e2e/visual-responsive.spec.ts` - shell, local asset, glass, effective-zoom, and overflow checks.

### Modified files

- `frontend/src/components/app-shell.tsx` - expose route and background custom property at the shell root.
- `frontend/src/app/globals.css` - shared background layer, glass surfaces, opaque work surfaces, Dashboard canvas sizing, and fallback styling.
- `frontend/src/app/dashboard/dashboard-workspace.tsx` - wrap the existing deck in `CommandDeckViewport`.
- `frontend/tests/app-shell.test.tsx` - verify the selected route asset is attached without changing shell semantics.
- `tests/e2e/run-foundation.mjs` - run the new read-only visual/responsive scenario in the isolated foundation environment.
- `project-knowledge/Current-Status.md` - record the implemented continuation point after final verification.
- `project-knowledge/Feedback-Backlog.md` - mark both approved feedback items implemented after verification.
- `project-knowledge/Project-Knowledge-Log.md` - record the completed visual/zoom change and evidence.

---

### Task 1: Generate and Normalize the Five Local Backgrounds

**Files:**

- Create: `frontend/scripts/prepare-workspace-backgrounds.mjs`
- Create: `frontend/public/backgrounds/dashboard.webp`
- Create: `frontend/public/backgrounds/documents.webp`
- Create: `frontend/public/backgrounds/event-review.webp`
- Create: `frontend/public/backgrounds/events.webp`
- Create: `frontend/public/backgrounds/settings.webp`
- Temporary only: `D:\tmp\terra-space-backgrounds\*.png`

**Interfaces:**

- Consumes: the approved visual rules in `project-knowledge/decisions/Amber-Glass-Background-and-Browser-Zoom.md` and the existing `--accent: #f2a93b` token.
- Produces: five `1920 x 1080` WebP files, each at most `650 KiB`, with no transparency requirement and no external runtime dependency.

- [ ] **Step 1: Read the image-generation skill and generate the shared visual family**

Use the `imagegen` skill before calling ImageGen. Generate each image as original artwork. Use this shared prefix verbatim for all five prompts:

```text
Original abstract tactical-intelligence interface background for Terra Space. 16:9 landscape. Pure black #000000 base with only thin amber #f2a93b linework, restrained glowing points, coordinate marks, and precise geometric construction. Edge-weighted composition with the central 60 percent kept quiet and dark for readable interface content. Calm, premium, technical, and suitable for hours of daily use. No blue, cyan, green, red, white fog, photorealistic scenery, text, letters, numbers, logos, flags, insignia, people, weapons, UI panels, buttons, or baked-in interface labels. Static background artwork, crisp fine lines, restrained glow, no heavy bloom.
```

Append exactly one route-specific suffix per output:

```text
dashboard.png: Add sparse orbital and radar arcs near the outer corners and a low network horizon near the bottom. Leave the center clear for a large globe. Do not draw a globe.

documents.png: Add abstract layered document planes near the lower-left and fine data points flowing toward the upper-right. Do not draw readable paper, text, or file icons.

event-review.png: Add evidence-bracket geometry at the far left and right edges with sparse converging extraction lines. Keep both central columns quiet for source text and an event card.

events.png: Add a restrained horizontal timeline signal near the lower edge and sparse coordinate markers around the perimeter. Do not create a knowledge graph or imply entity relationships.

settings.png: Add calibration rings and precise control geometry around the outer corners, with a quiet center for settings forms. Do not draw sliders, switches, labels, or literal UI controls.
```

Save the five generated PNG files under `D:\tmp\terra-space-backgrounds\` using the filenames above. Inspect every output with `view_image`. Reject and regenerate any image containing blue, text-like glyphs, a logo, a bright center, or route-inappropriate imagery.

- [ ] **Step 2: Write the deterministic asset-normalization script**

Create `frontend/scripts/prepare-workspace-backgrounds.mjs` with this complete content:

```js
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const names = ["dashboard", "documents", "event-review", "events", "settings"];
const sourceDirectory = process.argv[2];
const outputDirectory = process.argv[3]
  ?? path.resolve(process.cwd(), "public", "backgrounds");
const maximumBytes = 650 * 1024;

if (!sourceDirectory) {
  throw new Error(
    "Usage: node scripts/prepare-workspace-backgrounds.mjs <source-directory> [output-directory]",
  );
}

await mkdir(outputDirectory, { recursive: true });

for (const name of names) {
  const source = path.join(sourceDirectory, `${name}.png`);
  const output = path.join(outputDirectory, `${name}.webp`);

  await sharp(source)
    .resize({ width: 1920, height: 1080, fit: "cover", position: "centre" })
    .webp({ quality: 80, effort: 6, smartSubsample: true })
    .toFile(output);

  const metadata = await sharp(output).metadata();
  const file = await stat(output);

  if (metadata.width !== 1920 || metadata.height !== 1080 || metadata.format !== "webp") {
    throw new Error(`${name}.webp is not a 1920 x 1080 WebP image.`);
  }
  if (file.size > maximumBytes) {
    throw new Error(`${name}.webp is ${file.size} bytes; the limit is ${maximumBytes}.`);
  }

  console.log(`${name}.webp: ${metadata.width}x${metadata.height}, ${file.size} bytes`);
}
```

- [ ] **Step 3: Run normalization and verify the asset contract**

Run from `frontend/`:

```powershell
node .\scripts\prepare-workspace-backgrounds.mjs 'D:\tmp\terra-space-backgrounds'
```

Expected: five lines reporting `1920x1080`; every byte count is at most `665600`.

Then run:

```powershell
Get-ChildItem .\public\backgrounds\*.webp | Measure-Object -Property Length -Sum
```

Expected: `Count` is `5`; `Sum` is at most `3328000` bytes.

- [ ] **Step 4: Inspect the normalized assets as a family**

Open each WebP with `view_image`. Confirm all five use the same black/amber line weight and glow intensity, each has a quiet central reading area, and only the route motif changes. Regenerate and renormalize an asset if it breaks those exact checks.

- [ ] **Step 5: Commit the reproducible asset set**

```powershell
git add frontend/scripts/prepare-workspace-backgrounds.mjs frontend/public/backgrounds
git commit -m "feat: add Terra Space workspace background family"
```

---

### Task 2: Add the Route-to-Background Contract

**Files:**

- Create: `frontend/src/lib/workspace-backgrounds.ts`
- Create: `frontend/tests/workspace-backgrounds.test.ts`
- Modify: `frontend/src/components/app-shell.tsx`
- Modify: `frontend/tests/app-shell.test.tsx`

**Interfaces:**

- Consumes: the five `/backgrounds/*.webp` files from Task 1.
- Produces: `getWorkspaceBackground(currentPath: string): string` and an `.app-shell` root carrying `data-route` plus `--workspace-background-image`.

- [ ] **Step 1: Write the failing route-mapping test**

Create `frontend/tests/workspace-backgrounds.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getWorkspaceBackground } from "@/lib/workspace-backgrounds";

describe("getWorkspaceBackground", () => {
  it.each([
    ["/dashboard", "/backgrounds/dashboard.webp"],
    ["/documents", "/backgrounds/documents.webp"],
    ["/event-review", "/backgrounds/event-review.webp"],
    ["/events", "/backgrounds/events.webp"],
    ["/settings", "/backgrounds/settings.webp"],
  ])("maps %s to its local visual-family asset", (route, asset) => {
    expect(getWorkspaceBackground(route)).toBe(asset);
  });

  it("uses the Dashboard family asset for an unknown shell route", () => {
    expect(getWorkspaceBackground("/unknown")).toBe("/backgrounds/dashboard.webp");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run from `frontend/`:

```powershell
npm.cmd test -- workspace-backgrounds.test.ts
```

Expected: FAIL because `@/lib/workspace-backgrounds` does not exist.

- [ ] **Step 3: Implement the exact route mapping**

Create `frontend/src/lib/workspace-backgrounds.ts`:

```ts
const WORKSPACE_BACKGROUNDS = {
  "/dashboard": "/backgrounds/dashboard.webp",
  "/documents": "/backgrounds/documents.webp",
  "/event-review": "/backgrounds/event-review.webp",
  "/events": "/backgrounds/events.webp",
  "/settings": "/backgrounds/settings.webp",
} as const;

export function getWorkspaceBackground(currentPath: string): string {
  return WORKSPACE_BACKGROUNDS[currentPath as keyof typeof WORKSPACE_BACKGROUNDS]
    ?? WORKSPACE_BACKGROUNDS["/dashboard"];
}
```

- [ ] **Step 4: Extend the AppShell test before changing AppShell**

In `frontend/tests/app-shell.test.tsx`, add this assertion to the existing test after the `main` assertion:

```ts
const shell = document.querySelector(".app-shell");
expect(shell).toHaveAttribute("data-route", "/dashboard");
expect(shell?.getAttribute("style")).toContain(
  '--workspace-background-image: url("/backgrounds/dashboard.webp")',
);
```

Run:

```powershell
npm.cmd test -- workspace-backgrounds.test.ts app-shell.test.tsx
```

Expected: the mapping test passes and the AppShell test FAILS because `.app-shell` has neither the route attribute nor custom property.

- [ ] **Step 5: Attach the local asset to the AppShell root**

Modify `frontend/src/components/app-shell.tsx` so its imports and function start are:

```tsx
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { Navigation } from "@/components/navigation";
import { ServiceStatusPanel } from "@/components/service-status";
import { getWorkspaceBackground } from "@/lib/workspace-backgrounds";

type AppShellProps = { currentPath: string; children: ReactNode };
type WorkspaceShellStyle = CSSProperties & {
  "--workspace-background-image": string;
};

export function AppShell({ currentPath, children }: AppShellProps) {
  const style: WorkspaceShellStyle = {
    "--workspace-background-image": `url("${getWorkspaceBackground(currentPath)}")`,
  };

  return (
    <div className="app-shell" data-route={currentPath} style={style}>
```

Keep the remaining existing children unchanged, including `main[data-route]`, the skip link, status bar, sidebar, and navigation semantics.

- [ ] **Step 6: Run the focused tests**

```powershell
npm.cmd test -- workspace-backgrounds.test.ts app-shell.test.tsx navigation.test.tsx
```

Expected: all focused tests PASS.

- [ ] **Step 7: Commit the route contract**

```powershell
git add frontend/src/lib/workspace-backgrounds.ts frontend/src/components/app-shell.tsx frontend/tests/workspace-backgrounds.test.ts frontend/tests/app-shell.test.tsx
git commit -m "feat: select workspace backgrounds by route"
```

---

### Task 3: Apply Restrained Glass and Protect Work Surfaces

**Files:**

- Modify: `frontend/src/app/globals.css`
- Test: `tests/e2e/visual-responsive.spec.ts` (created in Task 5; Task 3 establishes its computed-style contract)

**Interfaces:**

- Consumes: `--workspace-background-image` and `data-route` from Task 2.
- Produces: one fixed decorative background layer, translucent status/sidebar surfaces, stronger Dashboard HUD glass, opaque workflow panels, and an opaque fallback when blur is unsupported.

- [ ] **Step 1: Add the shared material tokens**

Extend the existing `:root` block in `frontend/src/app/globals.css` immediately after `--focus`:

```css
  --shell-glass: rgba(3, 5, 6, 0.78);
  --sidebar-glass: rgba(5, 7, 8, 0.76);
  --dashboard-glass: rgba(5, 8, 9, 0.78);
  --work-surface: rgba(8, 11, 13, 0.97);
  --glass-blur: 12px;
```

Do not change `--bg`, `--panel`, `--inset`, `--accent`, fonts, or status colors.

- [ ] **Step 2: Add the route artwork layer behind the shell**

Add this block after the July 2026 `.app-shell` rule:

```css
.app-shell {
  position: relative;
  isolation: isolate;
  background: #000;
}

.app-shell::before {
  content: "";
  position: fixed;
  z-index: 0;
  inset: 0;
  pointer-events: none;
  background-color: #000;
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.38)),
    var(--workspace-background-image);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.top-status-bar,
.sidebar,
.main-content {
  position: relative;
}
```

Keep `.top-status-bar` at `z-index: 30`. Add `z-index: 2` to the existing `.sidebar` and `z-index: 1` to the existing `.main-content` declarations.

- [ ] **Step 3: Convert only the approved shell and Dashboard surfaces to glass**

Change the existing later declarations to these values:

```css
.top-status-bar {
  background: var(--shell-glass);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(112%);
  backdrop-filter: blur(var(--glass-blur)) saturate(112%);
}

.sidebar {
  background: var(--sidebar-glass);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(110%);
  backdrop-filter: blur(var(--glass-blur)) saturate(110%);
}

.command-deck-marker-count,
.command-deck-instrument,
.command-deck-dock {
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(112%);
  backdrop-filter: blur(var(--glass-blur)) saturate(112%);
}
```

Change only the existing Dashboard surface alpha values:

```css
.command-deck-marker-count { background: rgba(3, 6, 7, 0.8); }
.command-deck-instrument { background-color: var(--dashboard-glass); }
.command-deck-dock { background-color: rgba(4, 7, 8, 0.82); }
```

Keep `.command-deck-drawer` at its current `rgba(4, 7, 8, 0.985)` because filters, lists, and event detail are work surfaces.

- [ ] **Step 4: Keep all workflow panels opaque and remove the old blue-gray Dashboard atmosphere**

Add:

```css
.main-content:not([data-route="/dashboard"]) .panel,
.main-content:not([data-route="/dashboard"]) .event-filter-bar,
.main-content:not([data-route="/dashboard"]) .document-row,
.main-content:not([data-route="/dashboard"]) .event-list-row,
.main-content:not([data-route="/dashboard"]) .event-type-row {
  background-color: var(--work-surface);
}
```

Replace the current `.layered-command-deck` background with:

```css
  background:
    radial-gradient(circle at 50% 46%, rgba(242, 169, 59, 0.035), transparent 54%),
    linear-gradient(90deg, rgba(242, 169, 59, 0.025), transparent 20%, transparent 80%, rgba(242, 169, 59, 0.02));
```

This removes the existing blue-gray `rgba(25, 39, 42, 0.34)` atmosphere and allows the approved Dashboard asset to show through.

- [ ] **Step 5: Add the opaque fallback**

Add before the reduced-motion media query:

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .top-status-bar { background: rgba(0, 0, 0, 0.97); }
  .sidebar { background: #050708; }
  .command-deck-marker-count { background: rgba(3, 6, 7, 0.96); }
  .command-deck-instrument { background-color: rgba(5, 8, 9, 0.97); }
  .command-deck-dock { background-color: rgba(4, 7, 8, 0.98); }
}
```

- [ ] **Step 6: Run frontend regression checks**

```powershell
npm.cmd test -- app-shell.test.tsx design-components.test.tsx layered-command-deck.test.tsx
npm.cmd run lint
```

Expected: all focused tests PASS and lint exits successfully.

- [ ] **Step 7: Commit the material system**

```powershell
git add frontend/src/app/globals.css
git commit -m "feat: add restrained amber glass shell"
```

---

### Task 4: Scale the Dashboard as One Command-Deck Canvas

**Files:**

- Create: `frontend/src/app/dashboard/command-deck-viewport.tsx`
- Create: `frontend/tests/command-deck-viewport.test.tsx`
- Modify: `frontend/src/app/dashboard/dashboard-workspace.tsx`
- Modify: `frontend/src/app/globals.css`

**Interfaces:**

- Consumes: any React child representing the complete current `LayeredCommandDeck`.
- Produces: `calculateCommandDeckScale(width: number, height: number): number` and `CommandDeckViewport({ children })`, with `--command-deck-scale` bounded to `0 < scale <= 1`.

- [ ] **Step 1: Write the failing pure scale tests**

Create `frontend/tests/command-deck-viewport.test.tsx` with the first test block:

```tsx
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
```

- [ ] **Step 2: Run the focused test and verify it fails**

```powershell
npm.cmd test -- command-deck-viewport.test.tsx
```

Expected: FAIL because `command-deck-viewport.tsx` does not exist.

- [ ] **Step 3: Implement the viewport and calculation**

Create `frontend/src/app/dashboard/command-deck-viewport.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export const COMMAND_DECK_REFERENCE_WIDTH = 1664;
export const COMMAND_DECK_REFERENCE_HEIGHT = 872;

type CommandDeckViewportProps = { children: ReactNode };
type CommandDeckCanvasStyle = CSSProperties & { "--command-deck-scale": number };

export function calculateCommandDeckScale(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 1;
  return Math.min(
    1,
    width / COMMAND_DECK_REFERENCE_WIDTH,
    height / COMMAND_DECK_REFERENCE_HEIGHT,
  );
}

export function CommandDeckViewport({ children }: CommandDeckViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setScale(calculateCommandDeckScale(entry.contentRect.width, entry.contentRect.height));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const style: CommandDeckCanvasStyle = { "--command-deck-scale": scale };

  return (
    <div className="command-deck-viewport" ref={viewportRef}>
      <div
        className="command-deck-canvas"
        data-command-deck-scale={scale.toFixed(4)}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the ResizeObserver behavior test**

Append inside `frontend/tests/command-deck-viewport.test.tsx`:

```tsx
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
```

- [ ] **Step 5: Run the viewport tests**

```powershell
npm.cmd test -- command-deck-viewport.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 6: Wrap the existing deck without changing its internal behavior**

In `frontend/src/app/dashboard/dashboard-workspace.tsx`, add:

```tsx
import { CommandDeckViewport } from "@/app/dashboard/command-deck-viewport";
```

Immediately before the existing `<LayeredCommandDeck` opening tag, add:

```tsx
<CommandDeckViewport>
```

Then replace the existing closing fragment:

```tsx
          title="Dashboard"
        />
```

with:

```tsx
          title="Dashboard"
        />
      </CommandDeckViewport>
```

Do not move filters, globe, event state, parallax state, or active-panel state into the viewport component.

- [ ] **Step 7: Add the fixed design-canvas CSS**

Immediately before `.layered-command-deck` in `frontend/src/app/globals.css`, add:

```css
.command-deck-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.command-deck-canvas {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1664px;
  height: 872px;
  transform: translate(-50%, -50%) scale(var(--command-deck-scale, 1));
  transform-origin: center;
}
```

Keep `.layered-command-deck` at `width: 100%` and `height: 100%`. Do not add scale transforms to individual instruments, the globe, the dock, or typography.

- [ ] **Step 8: Run Dashboard regression tests**

```powershell
npm.cmd test -- command-deck-viewport.test.tsx layered-command-deck.test.tsx dashboard-workspace.test.tsx world-map.test.tsx
npm.cmd run lint
```

Expected: all focused tests PASS and lint exits successfully.

- [ ] **Step 9: Commit whole-canvas scaling**

```powershell
git add frontend/src/app/dashboard/command-deck-viewport.tsx frontend/src/app/dashboard/dashboard-workspace.tsx frontend/src/app/globals.css frontend/tests/command-deck-viewport.test.tsx
git commit -m "feat: scale Dashboard command deck with browser zoom"
```

---

### Task 5: Add Automated Visual and Effective-Zoom Regression Checks

**Files:**

- Create: `tests/e2e/visual-responsive.spec.ts`
- Modify: `tests/e2e/run-foundation.mjs`

**Interfaces:**

- Consumes: the route asset mapping, computed glass styles, and `data-command-deck-scale` from Tasks 2-4.
- Produces: read-only browser evidence for every menu and effective viewport corresponding to browser zoom 90%-150%.

- [ ] **Step 1: Write the failing Playwright scenario**

Create `tests/e2e/visual-responsive.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

const routes = [
  ["/dashboard", "Dashboard", "dashboard.webp"],
  ["/documents", "Documents", "documents.webp"],
  ["/event-review", "Event Review", "event-review.webp"],
  ["/events", "Events", "events.webp"],
  ["/settings", "Settings", "settings.webp"],
] as const;

const zoomViewports = [
  [90, 2133, 1033],
  [100, 1920, 930],
  [110, 1745, 845],
  [125, 1536, 744],
  [150, 1280, 620],
] as const;

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test("every menu uses its local amber background and readable shell material", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      ["http:", "https:"].includes(url.protocol)
      && !["localhost", "127.0.0.1"].includes(url.hostname)
    ) {
      externalRequests.push(url.href);
    }
  });

  for (const [route, heading, asset] of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    const shell = page.locator(".app-shell");
    await expect(shell).toHaveAttribute("data-route", route);
    const background = await shell.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--workspace-background-image"),
    );
    expect(background).toContain(asset);
    await expect(page.locator(".top-status-bar")).toHaveCSS("backdrop-filter", /blur/);
    await expect(page.locator(".sidebar")).toHaveCSS("backdrop-filter", /blur/);
  }

  expect(externalRequests).toEqual([]);
});

test("the complete Dashboard deck shrinks at effective browser-zoom viewports", async ({ page }) => {
  for (const [zoom, width, height] of zoomViewports) {
    await page.setViewportSize({ width, height });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Situation summary" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Recent signals" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Event register/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Filters/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Events" })).toBeVisible();

    const scale = Number(await page.locator(".command-deck-canvas").getAttribute("data-command-deck-scale"));
    expect(scale).toBeGreaterThan(0);
    expect(scale).toBeLessThanOrEqual(1);
    if (zoom <= 100) expect(scale).toBeCloseTo(1, 2);
    if (zoom >= 110) expect(scale).toBeLessThan(1);

    await expectNoPageOverflow(page);
  }
});

test("workflow routes reflow rather than globally shrinking", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 620 });
  for (const [route, heading] of routes.filter(([route]) => route !== "/dashboard")) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.locator(".command-deck-canvas")).toHaveCount(0);
    await expectNoPageOverflow(page);
  }
});
```

- [ ] **Step 2: Run the new cross-task acceptance scenario**

With the isolated app running, run from the repository root:

```powershell
npx.cmd playwright test tests/e2e/visual-responsive.spec.ts
```

Expected after Tasks 2-4: all three tests PASS. Unit tests in Tasks 2 and 4 already supplied the red/green test-first cycles for the new TypeScript behavior; this scenario verifies their integrated browser result.

- [ ] **Step 3: Add the scenario to the isolated foundation runner**

In `runFoundationScenario()` inside `tests/e2e/run-foundation.mjs`, replace the Playwright invocation with:

```js
run(
  "npx.cmd",
  [
    "playwright",
    "test",
    "tests/e2e/foundation.spec.ts",
    "tests/e2e/visual-responsive.spec.ts",
  ],
  env,
);
```

The visual scenario remains read-only and uses the same external-request blocking evidence as the foundation scenario.

- [ ] **Step 4: Rebuild and run the isolated visual scenario**

```powershell
docker compose build frontend
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-TerraSpace.ps1
npx.cmd playwright test tests/e2e/visual-responsive.spec.ts
powershell -NoProfile -ExecutionPolicy Bypass -File .\Stop-TerraSpace.ps1
```

Expected: all three tests PASS. The app starts with LM Studio offline and makes no external image requests.

- [ ] **Step 5: Commit automated visual coverage**

```powershell
git add tests/e2e/visual-responsive.spec.ts tests/e2e/run-foundation.mjs
git commit -m "test: cover workspace backgrounds and browser zoom"
```

---

### Task 6: Perform Populated Visual QA and Final Verification

**Files:**

- Modify after verification: `project-knowledge/Current-Status.md`
- Modify after verification: `project-knowledge/Feedback-Backlog.md`
- Modify after verification: `project-knowledge/Project-Knowledge-Log.md`
- Temporary only: screenshots under `D:\tmp\terra-space-amber-glass-qa\`

**Interfaces:**

- Consumes: the complete implementation and the owner's existing local data in read-only browser navigation.
- Produces: acceptance evidence, updated continuation state, and a clean verified branch. No Roadmap change.

- [ ] **Step 1: Run the complete frontend verification**

From `frontend/`:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected: the full Vitest suite passes, lint exits successfully, and the Next.js production build completes.

- [ ] **Step 2: Run the full isolated end-to-end suite**

From the repository root:

```powershell
npm.cmd run test:e2e
```

Expected: foundation, visual-responsive, Documents, Event Review, Events/Dashboard, and Settings scenarios all PASS; the script stops its temporary containers and LM Studio stubs.

- [ ] **Step 3: Rebuild the normal frontend and perform read-only populated QA**

Run:

```powershell
docker compose build frontend
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-TerraSpace.ps1
```

Use a visible browser at the owner's `1920 x 1080` display and actual browser page zoom controls. At 90%, 100%, 110%, 125%, and 150%:

1. Open Dashboard and confirm the globe, Situation Summary, Recent Signals, Event Register dock, Filters, marker count, and Open Events remain on one screen without overlap.
2. Spin and zoom the globe; confirm pointer alignment and MapLibre controls still work after whole-canvas scaling.
3. Open each Dashboard instrument and drawer; confirm focused depth, reduced 3px/2px parallax, Escape dismissal, and scrollable drawer content still work.
4. Open Documents, Event Review, Events, and Settings; confirm normal reflow, no global scaling, no horizontal page overflow, and readable populated panels.
5. Confirm each route has the correct unique motif, a quiet content area, unchanged logo/colors/typography, and no blue tint.
6. Confirm source documents remain serif, system labels remain mono, titles/body remain sans, and epistemic colors remain unchanged.
7. Enable reduced motion and confirm backgrounds stay static and existing motion reduction remains effective.

Save one screenshot per route at 100% plus one Dashboard screenshot each at 90%, 110%, 125%, and 150% under `D:\tmp\terra-space-amber-glass-qa\`. Do not change documents, events, settings, or database records during this pass.

- [ ] **Step 4: Verify asset and network constraints**

Run:

```powershell
Get-ChildItem .\frontend\public\backgrounds\*.webp | Select-Object Name, Length
git diff --check
```

Expected: exactly five WebP assets, each at most `665600` bytes, and no whitespace errors. Confirm the browser Network panel contains only localhost/127.0.0.1 requests during route navigation.

- [ ] **Step 5: Update Project Knowledge only after all checks pass**

Update:

- `project-knowledge/Current-Status.md` with the implemented continuation point, exact test counts, build result, e2e result, zoom levels, populated read-only QA, and asset total size.
- The two related entries in `project-knowledge/Feedback-Backlog.md` from “design resolved” to “implemented and verified,” linking both the decision and this plan.
- `project-knowledge/Project-Knowledge-Log.md` with one top entry summarizing the implementation and evidence.

Do not change `project-knowledge/Roadmap.md`; no phase or milestone changes.

- [ ] **Step 6: Validate Project Knowledge and the final diff**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
git diff --check
git status --short
```

Expected: Project Knowledge reports `0 error(s), 0 warning(s)`; `git diff --check` is clean; status contains only the intended implementation and knowledge files.

- [ ] **Step 7: Commit the verified completion record**

```powershell
git add project-knowledge/Current-Status.md project-knowledge/Feedback-Backlog.md project-knowledge/Project-Knowledge-Log.md
git commit -m "docs: record amber glass and zoom verification"
```

- [ ] **Step 8: Stop the local runtime if the owner is not actively using it**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Stop-TerraSpace.ps1
```

Expected: Terra Space containers stop cleanly; local data and generated frontend assets remain intact.

---

## Completion Criteria

- Five original local `1920 x 1080` WebP backgrounds exist, total at most `3.25 MiB`, with no blue tint, text, logo, or external runtime request.
- Status bar and sidebar use restrained glass on all routes; Dashboard HUD uses restrained stronger glass; work surfaces remain nearly opaque.
- Existing palette, typography, logo, status colors, globe behavior, reduced motion, and pointer-parallax bounds remain unchanged.
- Dashboard renders at one `1664 x 872` design canvas and applies a single bounded scale at higher zoom-equivalent viewports.
- Dashboard stays on one screen at 90%, 100%, 110%, 125%, and 150%; other routes reflow and never receive global scale.
- Automated unit, lint, production build, isolated e2e, and populated read-only visual checks all pass.
- Project Knowledge validates with zero errors and zero warnings.

## Navigation

- [Project Knowledge](../Project-knowledge-Index.md)
- [Current Status](../Current-Status.md)
- [Amber Glass Background and Browser Zoom](../decisions/Amber-Glass-Background-and-Browser-Zoom.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
- [Feedback Backlog](../Feedback-Backlog.md)
