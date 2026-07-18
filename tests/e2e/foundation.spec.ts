import { expect, test } from "@playwright/test";

const pages = [
  ["/dashboard", "Dashboard"],
  ["/documents", "Documents"],
  ["/event-review", "Event Review"],
  ["/events", "Events"],
  ["/settings", "Settings"],
  ["/sense", "Terra Sense"],
  ["/sense/event-types", "Event Types"],
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
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  }

  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /LM Studio.*Offline/i })).toBeVisible();
  await expect(page.getByLabel("Offline world map").locator("canvas")).toBeVisible();
  expect(externalRequests).toEqual([]);
});

test("the Documents page can create, list, and edit drafts while LM Studio is offline", async ({
  page,
}) => {
  await page.goto("/documents");
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();

  await page.getByLabel("Title *", { exact: true }).fill("Offline draft");
  await page.getByLabel("Content *", { exact: true }).fill("Body text while LM Studio is offline.");
  await page.getByLabel("Document date *", { exact: true }).fill("2026-07-14");
  await page.getByRole("button", { name: "Add document" }).click();

  await expect(page.getByText("Offline draft", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await page.getByLabel("Title *", { exact: true }).fill("Offline draft (edited)");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Offline draft (edited)")).toBeVisible();
});
