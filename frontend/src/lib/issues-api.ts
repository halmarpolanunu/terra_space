export type IssueListItem = {
  id: string;
  source_id: string;
  source_title: string;
  label: string;
  summary: string;
  evidence_quote: string;
  processed_at: string;
  created_at: string;
};

export type IssueEventRead = {
  id: string;
  title: string;
  evidence_quote: string;
  created_at: string;
};

export type IssueDetail = IssueListItem & {
  events: IssueEventRead[];
};

export type ActorLocationRead = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  evidence_quote: string;
};

export type ActorEndpointRead = {
  role: "source" | "target";
  actor_name: string;
  evidence_quote: string;
  location: ActorLocationRead;
};

export type ActorRelationshipRead = {
  id: string;
  evidence_quote: string;
  source: ActorEndpointRead;
  target: ActorEndpointRead;
};

export type IssueEventDetail = IssueEventRead & {
  relationships: ActorRelationshipRead[];
};

const API_ROOT = "/api/backend/api";

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/** Read the current validated Issue for each article. This client intentionally has no mutations. */
export async function listIssues(): Promise<IssueListItem[]> {
  return parseOrThrow<IssueListItem[]>(await fetch(`${API_ROOT}/issues`));
}

export async function getIssue(issueId: string): Promise<IssueDetail> {
  return parseOrThrow<IssueDetail>(await fetch(`${API_ROOT}/issues/${encodeURIComponent(issueId)}`));
}

export async function getIssueEvent(issueId: string, eventId: string): Promise<IssueEventDetail> {
  return parseOrThrow<IssueEventDetail>(
    await fetch(`${API_ROOT}/issues/${encodeURIComponent(issueId)}/events/${encodeURIComponent(eventId)}`),
  );
}
