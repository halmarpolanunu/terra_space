import { expect, test, type Page } from "@playwright/test";

// Kept in sync with the quotes/titles in run-foundation.mjs's runEventReviewScenario.
const AIRSTRIKE_QUOTE = "An airstrike hit the fuel depot in Sana'a on 2026-07-10";
const CEASEFIRE_QUOTE = "A ceasefire negotiation began in the capital on 2026-09-01";
const SECOND_AIRSTRIKE_QUOTE = "A second airstrike hit the fuel depot in Sana'a on 2026-07-11";
const THIRD_AIRSTRIKE_QUOTE = "A third airstrike hit the fuel depot in Sana'a on 2026-07-07";

async function createAndProcessDocument(
  page: Page,
  title: string,
  content: string,
  documentDate: string,
) {
  await page.goto("/documents");
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Content", { exact: true }).fill(content);
  await page.getByLabel("Document date", { exact: true }).fill(documentDate);
  await page.getByRole("button", { name: "Add document" }).click();
  await expect(page.getByText(title)).toBeVisible();

  await page.getByLabel(`Select ${title}`).check();
  await page.getByRole("button", { name: /Process \d+ selected/ }).click();
  await expect(page.getByText("Ready for review")).toBeVisible({ timeout: 30_000 });
}

test("review approves, rejects, and resolves duplicate flags end to end", async ({ page }) => {
  // Approve: the AI-suggested "Airstrike" type and "Air Force" actor should
  // become active only once this event is approved.
  await createAndProcessDocument(
    page,
    "Depot airstrike report",
    `${AIRSTRIKE_QUOTE}, carried out by the Air Force.`,
    "2026-07-10",
  );
  await page.goto("/event-review");
  await expect(page.getByText("Depot airstrike")).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("No documents are waiting for review.")).toBeVisible();

  // Reject: a distinct, non-duplicate event should stay in the audit trail
  // as rejected rather than being deleted.
  await createAndProcessDocument(
    page,
    "Ceasefire report",
    `${CEASEFIRE_QUOTE}.`,
    "2026-09-01",
  );
  await page.goto("/event-review");
  await expect(page.getByText("Ceasefire talks")).toBeVisible();
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByText("No documents are waiting for review.")).toBeVisible();

  // Keep separate: a same-type/actor/location event within days of the
  // approved airstrike is flagged as a possible duplicate. Approve stays
  // disabled until the flag is resolved.
  await createAndProcessDocument(
    page,
    "Second depot airstrike report",
    `${SECOND_AIRSTRIKE_QUOTE}, again involving the Air Force.`,
    "2026-07-11",
  );
  await page.goto("/event-review");
  await expect(page.getByText("Second depot airstrike")).toBeVisible();
  await expect(page.getByText("Possible Duplicate")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Keep Separate" }).click();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("No documents are waiting for review.")).toBeVisible();

  // Link and merge: another duplicate-flagged event is merged into the
  // original approved event instead of becoming a separate approved event.
  await createAndProcessDocument(
    page,
    "Third depot airstrike report",
    `${THIRD_AIRSTRIKE_QUOTE}, once more the Air Force was involved.`,
    "2026-07-07",
  );
  await page.goto("/event-review");
  await expect(page.getByText("Third depot airstrike")).toBeVisible();
  await expect(page.getByText("Possible Duplicate")).toBeVisible();
  await page.getByRole("button", { name: "Link to This Event" }).click();
  await expect(page.getByText("No documents are waiting for review.")).toBeVisible();
});
