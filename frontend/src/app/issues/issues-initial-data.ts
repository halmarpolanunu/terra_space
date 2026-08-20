import type { IssueDetail, IssueEventDetail, IssueListItem } from "@/lib/issues-api";

type InitialIssueWorkspace = {
  initialIssues?: IssueListItem[];
  initialIssue?: IssueDetail;
  initialEvents?: IssueEventDetail[];
  initialError?: string;
};

type InitialFetchResult<T> = { value?: T; error?: string };

async function getJson<T>(apiRoot: string, path: string): Promise<InitialFetchResult<T>> {
  try {
    const response = await fetch(`${apiRoot}/api/issues${path}`, { cache: "no-store" });
    if (response.ok) return { value: await response.json() as T };
    const body = await response.json().catch(() => null);
    return { error: body?.detail ?? `Request failed with status ${response.status}` };
  } catch {
    return { error: "The validated Issue analysis could not be loaded." };
  }
}

/**
 * Provides the first validated Issue from the server so the analysis view is useful before any
 * browser-side refresh occurs. The browser can still fetch later selections normally.
 */
export async function loadInitialIssueWorkspace(apiRoot: string): Promise<InitialIssueWorkspace> {
  const initialIssuesResult = await getJson<IssueListItem[]>(apiRoot, "");
  if (initialIssuesResult.error) return { initialError: initialIssuesResult.error };
  const initialIssues = initialIssuesResult.value ?? [];
  const firstIssueId = initialIssues[0]?.id;
  if (!firstIssueId) return { initialIssues };

  const initialIssue = (await getJson<IssueDetail>(apiRoot, `/${encodeURIComponent(firstIssueId)}`)).value;
  if (!initialIssue) return { initialIssues };

  const initialEvents = await Promise.all(
    initialIssue.events.map((event) => getJson<IssueEventDetail>(
      apiRoot,
      `/${encodeURIComponent(firstIssueId)}/events/${encodeURIComponent(event.id)}`,
    )),
  );
  return {
    initialIssues,
    initialIssue,
    initialEvents: initialEvents
      .map((result) => result.value)
      .filter((event): event is IssueEventDetail => Boolean(event)),
  };
}
