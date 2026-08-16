import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/issues-api", () => ({
  listIssues: vi.fn(),
  getIssue: vi.fn(),
  getIssueEvent: vi.fn(),
}));

import { IssuesWorkspace } from "@/app/issues/issues-workspace";
import * as issuesApi from "@/lib/issues-api";
import type { IssueDetail, IssueEventDetail, IssueListItem } from "@/lib/issues-api";

const processedAt = "2026-08-16T10:00:00Z";

function makeIssue(overrides: Partial<IssueListItem> = {}): IssueListItem {
  return {
    id: "issue-new",
    source_id: "source-new",
    source_title: "Newer source article",
    label: "Border security discussion",
    summary: "Officials discussed security arrangements.",
    evidence_quote: "Officials discussed security arrangements at the border.",
    processed_at: processedAt,
    created_at: processedAt,
    ...overrides,
  };
}

function makeDetail(overrides: Partial<IssueDetail> = {}): IssueDetail {
  return {
    ...makeIssue(),
    events: [{
      id: "event-new",
      title: "Officials meet at the border",
      evidence_quote: "Officials met at the border.",
      created_at: processedAt,
    }],
    ...overrides,
  };
}

function makeEventDetail(overrides: Partial<IssueEventDetail> = {}): IssueEventDetail {
  return {
    id: "event-new",
    title: "Officials meet at the border",
    evidence_quote: "Officials met at the border.",
    created_at: processedAt,
    relationships: [],
    ...overrides,
  };
}

describe("IssuesWorkspace", () => {
  afterEach(() => vi.clearAllMocks());

  it("selects the newest article-level Issue and sends only its events to the globe slot", async () => {
    const newest = makeIssue();
    const older = makeIssue({
      id: "issue-old",
      source_id: "source-old",
      source_title: "Older source article",
      label: "Earlier diplomatic meeting",
      processed_at: "2026-08-15T10:00:00Z",
    });
    vi.mocked(issuesApi.listIssues).mockResolvedValue([newest, older]);
    vi.mocked(issuesApi.getIssue).mockResolvedValue(makeDetail());
    vi.mocked(issuesApi.getIssueEvent).mockResolvedValue(makeEventDetail());

    render(<IssuesWorkspace />);

    expect(await screen.findByRole("heading", { name: "Border security discussion" })).toBeVisible();
    expect(issuesApi.getIssue).toHaveBeenCalledWith("issue-new");
    expect(screen.getByRole("button", { name: /border security discussion/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("issues-globe-slot")).toHaveAttribute("data-event-ids", "event-new");
    expect(screen.getAllByText("Newer source article")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /earlier diplomatic meeting/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("loads only the newly selected Issue's events", async () => {
    const newest = makeIssue();
    const older = makeIssue({ id: "issue-old", source_id: "source-old", label: "Earlier diplomatic meeting" });
    vi.mocked(issuesApi.listIssues).mockResolvedValue([newest, older]);
    vi.mocked(issuesApi.getIssue)
      .mockResolvedValueOnce(makeDetail())
      .mockResolvedValueOnce(makeDetail({ ...older, events: [{ id: "event-old", title: "Earlier meeting", evidence_quote: "Earlier meeting.", created_at: processedAt }] }));
    vi.mocked(issuesApi.getIssueEvent).mockResolvedValue(makeEventDetail());

    render(<IssuesWorkspace />);
    await screen.findByRole("heading", { name: "Border security discussion" });
    fireEvent.click(screen.getByRole("button", { name: /earlier diplomatic meeting/i }));

    await waitFor(() => expect(issuesApi.getIssue).toHaveBeenLastCalledWith("issue-old"));
    expect(await screen.findByRole("heading", { name: "Earlier diplomatic meeting" })).toBeVisible();
    expect(screen.getByTestId("issues-globe-slot")).toHaveAttribute("data-event-ids", "event-old");
  });

  it("honestly reports an Issue with no mapped events", async () => {
    vi.mocked(issuesApi.listIssues).mockResolvedValue([makeIssue()]);
    vi.mocked(issuesApi.getIssue).mockResolvedValue(makeDetail({ events: [] }));

    render(<IssuesWorkspace />);

    expect((await screen.findAllByText("No mapped events yet")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Officials meet at the border")).not.toBeInTheDocument();
  });

  it("shows a clear backend error without offering a correction action", async () => {
    vi.mocked(issuesApi.listIssues).mockRejectedValue(new Error("Backend unavailable"));

    render(<IssuesWorkspace />);

    expect(await screen.findByText("Backend unavailable", { selector: ".document-error" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /edit|review|approve|reject/i })).not.toBeInTheDocument();
  });
});
