export type ProcessingStatus =
  | "draft"
  | "queued"
  | "processing"
  | "ready_for_review"
  | "completed"
  | "failed";

export type Document = {
  id: string;
  title: string;
  content: string;
  document_date: string;
  publication_date: string | null;
  source_url: string | null;
  input_date: string;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentDraft = {
  title: string;
  content: string;
  document_date: string;
  publication_date: string | null;
  source_url: string | null;
};

const BASE_URL = "/api/backend/api/documents";

async function parseOrThrow(response: Response): Promise<Document> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<Document>;
}

export async function listDocuments(): Promise<Document[]> {
  const response = await fetch(BASE_URL);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<Document[]>;
}

export async function createDocument(draft: DocumentDraft): Promise<Document> {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  return parseOrThrow(response);
}

export async function updateDocument(
  id: string,
  patch: Partial<DocumentDraft>,
): Promise<Document> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseOrThrow(response);
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}
