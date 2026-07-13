import { expect, test } from "@playwright/test";

const pages = [
  ["/dashboard", "Dashboard"],
  ["/documents", "Documents"],
  ["/event-review", "Event Review"],
  ["/events", "Events"],
  ["/settings", "Settings"],
] as const;

test("the local foundation stays usable without LM Studio or internet", async ({ page }) => {
  const externalRequests: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.protocol === "http:" || url.protocol === "https:") {
      if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        externalRequests.push(url.toString());
        await route.abort();
        return;
      }
    }
    await route.continue();
  });

  for (const [path, heading] of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  await page.goto("/dashboard");
  await expect(page.getByText("LM Studio is offline. Check Settings and try again.")).toBeVisible();
  await expect(page.getByLabel("Offline world map").locator("canvas")).toBeVisible();
  expect(externalRequests).toEqual([]);
});
