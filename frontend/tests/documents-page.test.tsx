import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/bridge-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bridge-api")>("@/lib/bridge-api");
  return {
    ...actual,
    listBridgeSources: vi.fn(),
  };
});

import DocumentsPage from "@/app/documents/page";
import * as bridgeApi from "@/lib/bridge-api";
import type { BridgeSource } from "@/lib/bridge-api";

function makeSource(overrides: Partial<BridgeSource> = {}): BridgeSource {
  return {
    id: "source-1",
    title: "French Rafale shot down drone over Latvia",
    publication_date: "2026-08-10",
    source_domain: "example.com",
    source_url: "https://example.com/article",
    author: "A reporter",
    collection_source: "manual_input",
    processing_status: "completed",
    processing_error: null,
    raw_content_text: "Raw article text.",
    cleaned_content_text: "Cleaned article text.",
    created_at: "2026-08-10T00:00:00Z",
    updated_at: "2026-08-10T00:00:00Z",
    ...overrides,
  };
}

describe("DocumentsPage (Supabase read-only Sources)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the read-only Supabase preview notice", async () => {
    vi.mocked(bridgeApi.listBridgeSources).mockResolvedValue([]);

    render(<DocumentsPage />);

    await screen.findByRole("status");
  });

  it("lists sources from Supabase with title, publication date, and status", async () => {
    const source = makeSource();
    vi.mocked(bridgeApi.listBridgeSources).mockResolvedValue([source]);

    render(<DocumentsPage />);

    await screen.findByText(source.title);
    expect(screen.getByText(/publication date: 2026-08-10/i)).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows cleaned text on demand without any edit or process control", async () => {
    const source = makeSource();
    vi.mocked(bridgeApi.listBridgeSources).mockResolvedValue([source]);

    render(<DocumentsPage />);
    await screen.findByText(source.title);

    expect(screen.queryByRole("button", { name: /add document/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /process selected/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show text/i }));

    expect(screen.getByText("Cleaned article text.")).toBeInTheDocument();
  });

  it("shows a processing error message for a failed source", async () => {
    const failed = makeSource({ processing_status: "failed", processing_error: "LM Studio timed out." });
    vi.mocked(bridgeApi.listBridgeSources).mockResolvedValue([failed]);

    render(<DocumentsPage />);

    await screen.findByText("LM Studio timed out.");
  });
});
