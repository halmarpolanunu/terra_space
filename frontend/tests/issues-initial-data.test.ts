import { afterEach, describe, expect, it, vi } from "vitest";

import { loadInitialIssueWorkspace } from "@/app/issues/issues-initial-data";

describe("loadInitialIssueWorkspace", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads the first validated Issue and every related event server-side", async () => {
    const issue = {
      id: "issue-1", source_id: "source-1", source_title: "Safe source", label: "Safe Issue",
      summary: "Summary", evidence_quote: "Evidence", processed_at: "2026-08-16T00:00:00Z", created_at: "2026-08-16T00:00:00Z",
    };
    const detail = { ...issue, events: [{ id: "event-1", title: "Safe event", evidence_quote: "Event evidence", created_at: "2026-08-16T00:00:00Z" }] };
    const event = { ...detail.events[0], relationships: [] };
    const responses = [[issue], detail, event];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(responses.shift()), { status: 200 })));

    await expect(loadInitialIssueWorkspace("http://preview-api:8001")).resolves.toEqual({
      initialIssues: [issue], initialIssue: detail, initialEvents: [event],
    });
  });

  it("preserves an unavailable Issue API error instead of treating it as no valid Issues", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ detail: "The validated Issue analysis is not configured on this backend." }), { status: 503 })),
    );

    await expect(loadInitialIssueWorkspace("http://preview-api:8001")).resolves.toEqual({
      initialError: "The validated Issue analysis is not configured on this backend.",
    });
  });
});
