import { expect, test } from "@playwright/test";

// Kept in sync with the response table in run-foundation.mjs (runSettingsScenario).
export const ALPHA_CONTENT = "An alpha valid body report was filed on 2026-07-10.";
export const BRAVO_CONTENT = "A bravo failing body report was filed on 2026-07-11.";

test("configures LM Studio and manages event types from Settings", async ({ page }) => {
  await page.goto("/settings");

  // The base URL is seeded from the backend's configured LM Studio URL.
  await expect(page.getByLabel("LM Studio base URL")).toHaveValue(
    "http://host.docker.internal:4183",
  );

  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page.getByText("Reachable")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Model", { exact: true }).selectOption("stub-model");
  await page.getByRole("button", { name: "Save connection" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // Create two active types, delete the unused one, and deactivate the other.
  await page.getByLabel("New event type").fill("Manual Type");
  await page.getByRole("button", { name: "Add event type" }).click();
  await expect(page.getByLabel("Rename Manual Type")).toBeVisible();

  await page.getByLabel("New event type").fill("Temp Type");
  await page.getByRole("button", { name: "Add event type" }).click();
  await expect(page.getByLabel("Rename Temp Type")).toBeVisible();
  await page.getByRole("button", { name: "Delete Temp Type" }).click();
  await expect(page.getByLabel("Rename Temp Type")).toHaveCount(0);

  // Use click (not uncheck): the checkbox is server-confirmed, so it flips only
  // after the PATCH resolves rather than synchronously on the DOM event. Waiting
  // for it to become unchecked also guarantees the deactivation persisted before
  // the scenario verifies it in SQLite.
  await page.getByLabel("Active: Manual Type").click();
  await expect(page.getByLabel("Active: Manual Type")).not.toBeChecked();
});

test("isolates a failed document in a batch and recovers it with retry", async ({ page }) => {
  await page.goto("/documents");

  await page.getByLabel("Title *", { exact: true }).fill("Alpha valid report");
  await page.getByLabel("Content *", { exact: true }).fill(ALPHA_CONTENT);
  await page.getByLabel("Document date *", { exact: true }).fill("2026-07-10");
  await page.getByRole("button", { name: "Add document" }).click();
  await expect(page.getByText("Alpha valid report")).toBeVisible();

  await page.getByLabel("Title *", { exact: true }).fill("Bravo failing report");
  await page.getByLabel("Content *", { exact: true }).fill(BRAVO_CONTENT);
  await page.getByLabel("Document date *", { exact: true }).fill("2026-07-11");
  await page.getByRole("button", { name: "Add document" }).click();
  await expect(page.getByText("Bravo failing report")).toBeVisible();

  await page.getByLabel("Select Alpha valid report").check();
  await page.getByLabel("Select Bravo failing report").check();
  await page.getByRole("button", { name: "Process 2 selected" }).click();

  // Failure isolation: one document succeeds while the other fails.
  await expect(page.getByText("Failed")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Ready for review")).toBeVisible();

  // Retry recovers the failed document (the stub succeeds on the second attempt).
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Failed")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByText("Ready for review")).toHaveCount(2);
});
