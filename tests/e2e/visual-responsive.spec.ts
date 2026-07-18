import { expect, test, type Page } from "@playwright/test";

const routes = [
  ["/dashboard", "Dashboard", "dashboard.webp"], ["/documents", "Documents", "documents.webp"],
  ["/event-review", "Event Review", "event-review.webp"], ["/events", "Events", "events.webp"],
  ["/settings", "Settings", "settings.webp"],
  ["/sense", "Terra Sense", "sense.webp"], ["/sense/event-types", "Event Types", "sense.webp"],
] as const;
const zoomViewports = [[90, 2133, 1033], [100, 1920, 930], [110, 1745, 845], [125, 1536, 744], [150, 1280, 620]] as const;

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test("every menu uses its local amber background and readable shell material", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => { const url = new URL(request.url()); if (["http:", "https:"].includes(url.protocol) && !["localhost", "127.0.0.1"].includes(url.hostname)) externalRequests.push(url.href); });
  for (const [route, heading, asset] of routes) {
    await page.goto(route); await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    const shell = page.locator(".app-shell"); await expect(shell).toHaveAttribute("data-route", route);
    expect(await shell.evaluate((element) => getComputedStyle(element).getPropertyValue("--workspace-background-image"))).toContain(asset);
    await expect(page.locator(".top-status-bar")).toHaveCSS("backdrop-filter", /blur/);
    await expect(page.locator(".sidebar")).toHaveCSS("backdrop-filter", /blur/);
  }
  expect(externalRequests).toEqual([]);
});

test("the complete Dashboard deck shrinks at effective browser-zoom viewports", async ({ page }) => {
  for (const [zoom, width, height] of zoomViewports) {
    await page.setViewportSize({ width, height }); await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Situation summary" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Recent signals" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Event register/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Filters/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Events" })).toBeVisible();
    if (zoom >= 110) await expect(page.locator(".command-deck-canvas")).not.toHaveAttribute("data-command-deck-scale", "1.0000");
    const scale = Number(await page.locator(".command-deck-canvas").getAttribute("data-command-deck-scale"));
    expect(scale).toBeGreaterThan(0); expect(scale).toBeLessThanOrEqual(1);
    if (zoom <= 100) expect(scale).toBeCloseTo(1, 2); if (zoom >= 110) expect(scale).toBeLessThan(1);
    await expectNoPageOverflow(page);
  }
});

test("workflow routes reflow rather than globally shrinking", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 620 });
  for (const [route, heading] of routes.filter(([route]) => route !== "/dashboard")) {
    await page.goto(route); await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    await expect(page.locator(".command-deck-canvas")).toHaveCount(0); await expectNoPageOverflow(page);
  }
});

test("Terra Sense navigation and pipeline use one column at narrow widths", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 });
  for (const [route, heading] of routes.filter(([route]) => route === "/sense" || route === "/sense/event-types")) {
    await page.goto(route); await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    await expectNoPageOverflow(page);
  }
  await page.goto("/sense");
  await expect(page.locator(".sense-flow-stages")).toHaveCSS("flex-direction", "column");
  await expect(page.locator(".app-shell")).toHaveCSS("grid-template-columns", /640px/);
});
