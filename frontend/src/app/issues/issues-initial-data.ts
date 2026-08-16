import type { IssueDetail, IssueEventDetail, IssueListItem } from "@/lib/issues-api";

type InitialIssueWorkspace = {
  initialIssues: IssueListItem[];
  initialIssue?: IssueDetail;
  initialEvent?: IssueEventDetail;
};

async function getJson<T>(apiRoot: string, path: string): Promise<T | undefined> {
  try {
    const response = await fetch(`${apiRoot}/api/issues${path}`, { cache: "no-store" });
    return response.ok ? (await response.json() as T) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Provides the first validated Issue from the server so the analysis view is useful before any
 * browser-side refresh occurs. The browser can still fetch later selections normally.
 */
export async function loadInitialIssueWorkspace(apiRoot: string): Promise<InitialIssueWorkspace> {
  const initialIssues = await getJson<IssueListItem[]>(apiRoot, "") ?? [];
  const firstIssueId = initialIssues[0]?.id;
  if (!firstIssueId) return { initialIssues };

  const initialIssue = await getJson<IssueDetail>(apiRoot, `/${encodeURIComponent(firstIssueId)}`);
  const firstEventId = initialIssue?.events[0]?.id;
  if (!initialIssue || !firstEventId) return { initialIssues, initialIssue };

  const initialEvent = await getJson<IssueEventDetail>(
    apiRoot,
    `/${encodeURIComponent(firstIssueId)}/events/${encodeURIComponent(firstEventId)}`,
  );
  return { initialIssues, initialIssue, initialEvent };
}
