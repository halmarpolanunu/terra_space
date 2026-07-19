import { expect, test, type Page } from "@playwright/test";

const UNMATCHED_QUOTE = "A local official announced new port rules on 2026-07-10";

async function createActiveEventType(page: Page) {
  await page.goto("/sense/event-types");
  await page.getByLabel("New event type").fill("Diplomatic Statement");
  await page.getByLabel("New event type description").fill("An official public statement by a diplomatic actor.");
  await page.getByRole("button", { name: "Add event type" }).click();
  await expect(page.getByText("Diplomatic Statement")).toBeVisible();
}

async function createAndProcessDocument(page: Page) {
  await page.goto("/documents");
  await page.getByLabel("Title *", { exact: true }).fill("Untyped extraction report");
  await page.getByLabel("Content *", { exact: true }).fill(`${UNMATCHED_QUOTE}.`);
  await page.getByLabel("Publication date *", { exact: true }).fill("2026-07-10");
  await page.getByRole("button", { name: "Add document" }).click();
  await page.getByLabel("Select Untyped extraction report").check();
  await page.getByRole("button", { name: /Process \d+ selected/ }).click();
  await expect(page.getByText("Ready for review")).toBeVisible({ timeout: 30_000 });
}

test("an unmatched AI type stays blank and can be assigned manually before approval", async ({ page }) => {
  await createActiveEventType(page);
  await createAndProcessDocument(page);

  await page.goto("/event-review");
  await expect(page.getByText("Untyped port-rules announcement")).toBeVisible();
  await expect(page.getByText("Not stated")).toBeVisible();
  await expect(page.getByText("Select an active Event Type during review if appropriate.")).toBeVisible();
  await expect(page.getByText(/Suggested/)).toHaveCount(0);

  await page.getByRole("button", { name: "Edit fields" }).click();
  await page.getByLabel("Event type").selectOption({ label: "Diplomatic Statement" });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Diplomatic Statement")).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("No documents are waiting for review.")).toBeVisible();
});
