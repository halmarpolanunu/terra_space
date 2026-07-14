import { expect, test } from "@playwright/test";

export const STUB_DOCUMENT_CONTENT =
  "A large protest occurred at the capitol on July 10th, drawing thousands of demonstrators.";
export const STUB_EVIDENCE_QUOTE = "A large protest occurred at the capitol on July 10th";

test("processing a document against LM Studio creates a draft event backed by its evidence quote", async ({
  page,
}) => {
  await page.goto("/documents");

  await page.getByLabel("Title", { exact: true }).fill("Stub extraction report");
  await page.getByLabel("Content", { exact: true }).fill(STUB_DOCUMENT_CONTENT);
  await page.getByLabel("Document date", { exact: true }).fill("2026-07-10");
  await page.getByRole("button", { name: "Add document" }).click();

  await expect(page.getByText("Stub extraction report")).toBeVisible();

  await page.getByLabel("Select Stub extraction report").check();
  await page.getByRole("button", { name: "Process 1 selected" }).click();

  await expect(page.getByText("Ready for review")).toBeVisible({ timeout: 30_000 });
});
