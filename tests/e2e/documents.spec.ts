import { expect, test } from "@playwright/test";

export const STUB_DOCUMENT_CONTENT =
  "A large protest occurred at the capitol on July 10th, drawing thousands of demonstrators.";
export const STUB_EVIDENCE_QUOTE = "A large protest occurred at the capitol on July 10th";

// A minimal 1x1 PNG, kept in sync with PNG_BYTES in backend/tests/test_attachments_api.py.
const PNG_BUFFER = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753" +
    "de0000000c4944415478da6360606060000000050001a5f645400000000049454e44ae426082",
  "hex",
);

test("processing a document against LM Studio creates a draft event backed by its evidence quote", async ({
  page,
}) => {
  await page.goto("/documents");

  await page.getByLabel("Title *", { exact: true }).fill("Stub extraction report");
  await page.getByLabel("Content *", { exact: true }).fill(STUB_DOCUMENT_CONTENT);
  await page.getByLabel("Publication date *", { exact: true }).fill("2026-07-10");
  await page.getByRole("button", { name: "Add document" }).click();

  await expect(page.getByText("Stub extraction report")).toBeVisible();

  // Upload an attachment, delete it, then upload the one that should survive
  // processing (verified on disk by the runner's SQLite/Python inspection).
  const attachmentInput = page.getByLabel("Add attachment for Stub extraction report");
  await attachmentInput.setInputFiles({
    name: "discarded.png",
    mimeType: "image/png",
    buffer: PNG_BUFFER,
  });
  await expect(page.getByAltText("discarded.png")).toBeVisible();
  await page.getByRole("button", { name: "Delete discarded.png" }).click();
  await expect(page.getByAltText("discarded.png")).toHaveCount(0);

  await attachmentInput.setInputFiles({
    name: "kept.png",
    mimeType: "image/png",
    buffer: PNG_BUFFER,
  });
  await expect(page.getByAltText("kept.png")).toBeVisible();

  await page.getByLabel("Select Stub extraction report").check();
  await page.getByRole("button", { name: "Process 1 selected" }).click();

  await expect(page.getByText("Ready for review")).toBeVisible({ timeout: 30_000 });
});
