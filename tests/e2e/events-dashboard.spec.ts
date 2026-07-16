import { expect, test, type Page } from "@playwright/test";

// Kept in sync with run-foundation.mjs's runEventsDashboardScenario.
export const JAKARTA_QUOTE = "A Jakarta field observation was recorded on 2026-07-10";
export const LOS_ANGELES_QUOTE = "A Los Angeles field observation was recorded on 2026-07-12";
export const UNKNOWN_DATE_QUOTE = "An undated briefing was received from the field";
export const UNMATCHED_QUOTE = "A report named an unknown location without a country";
export const REJECTED_QUOTE = "A rejected observation should remain out of approved views";

async function createAndProcessDocument(
  page: Page,
  title: string,
  content: string,
  documentDate: string,
) {
  await page.goto("/documents");
  await page.getByLabel("Title *", { exact: true }).fill(title);
  await page.getByLabel("Content *", { exact: true }).fill(content);
  await page.getByLabel("Document date *", { exact: true }).fill(documentDate);
  await page.getByRole("button", { name: "Add document" }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.getByLabel(`Select ${title}`).check();
  await page.getByRole("button", { name: /Process \d+ selected/ }).click();
  await expect(page.getByText("Ready for review")).toBeVisible({ timeout: 30_000 });
}

async function reviewDocument(page: Page, eventTitle: string, action: "approve" | "reject") {
  await page.goto("/event-review");
  await expect(page.getByText(eventTitle, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: action === "approve" ? "Approve" : "Reject", exact: true }).click();
  await expect(page.getByText("No documents are waiting for review.")).toBeVisible();
}

test("approved Events and Dashboard stay synchronized through filters, editing, and source reading", async ({ page }) => {
  await createAndProcessDocument(
    page,
    "Jakarta observation source",
    `${JAKARTA_QUOTE}.`,
    "2026-07-10",
  );
  await reviewDocument(page, "Jakarta field observation", "approve");

  await createAndProcessDocument(
    page,
    "Los Angeles observation source",
    `${LOS_ANGELES_QUOTE}.`,
    "2026-07-12",
  );
  await reviewDocument(page, "Los Angeles field observation", "approve");

  await createAndProcessDocument(
    page,
    "Unknown-date briefing source",
    `${UNKNOWN_DATE_QUOTE}.`,
    "2026-07-13",
  );
  await reviewDocument(page, "Unknown-date briefing", "approve");

  await createAndProcessDocument(
    page,
    "Unmatched location source",
    `${UNMATCHED_QUOTE}.`,
    "2026-07-14",
  );
  await reviewDocument(page, "Unmatched location report", "approve");

  await createAndProcessDocument(
    page,
    "Rejected observation source",
    `${REJECTED_QUOTE}.`,
    "2026-07-15",
  );
  await reviewDocument(page, "Rejected observation", "reject");

  await page.goto("/dashboard");
  await page.getByLabel("Event type").selectOption({ label: "Observation" });
  await expect(page).toHaveURL(/\/dashboard\?event_type_id=/);

  const summary = page.locator(".dashboard-summary");
  await expect(summary.getByText("Total events")).toBeVisible();
  await expect(summary.locator("dd").first()).toHaveText("2");
  await expect(page.locator("[aria-label='Offline world map']")).toBeVisible();
  await expect(page.getByText("Map markers: 2", { exact: true })).toBeVisible();
  await expect(page.locator(".event-timeline li")).toHaveCount(2);
  await expect(page.locator(".event-list-row")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Jakarta field observation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Los Angeles field observation" })).toBeVisible();
  await expect(page.getByText("Rejected observation", { exact: true })).not.toBeVisible();

  await page.getByRole("link", { name: "Open Events" }).click();
  await expect(page).toHaveURL(/\/events\?event_type_id=/);
  await expect(page.locator(".event-list-row")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Jakarta field observation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Los Angeles field observation" })).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.locator(".event-list-row")).toHaveCount(4);
  await expect(page.getByText("Rejected observation", { exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: "Jakarta field observation" }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title *", { exact: true }).fill("Jakarta observation updated");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Jakarta observation updated" })).toBeVisible();

  await page.getByRole("link", { name: "Jakarta observation source" }).click();
  await expect(page.getByRole("heading", { name: "Jakarta observation source" })).toBeVisible();
  await expect(page.getByText(`${JAKARTA_QUOTE}.`, { exact: true })).toBeVisible();
});
