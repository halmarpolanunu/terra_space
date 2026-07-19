export type ProcessingStatus =
  | "draft"
  | "queued"
  | "processing"
  | "ready_for_review"
  | "completed"
  | "failed";

export type Attachment = {
  id: string;
  original_name: string;
  media_type: string;
  size_bytes: number;
  created_at: string;
};

export type Document = {
  id: string;
  title: string;
  content: string;
  publication_date: string;
  source_url: string | null;
  input_date: string;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
};

export type DocumentDraft = {
  title: string;
  content: string;
  publication_date: string;
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

export async function listDocuments(processingStatus?: ProcessingStatus): Promise<Document[]> {
  const url = processingStatus
    ? `${BASE_URL}?processing_status=${processingStatus}`
    : BASE_URL;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<Document[]>;
}

export async function getDocument(id: string): Promise<Document> {
  const response = await fetch(`${BASE_URL}/${id}`);
  return parseOrThrow(response);
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

export type ProcessResponse = {
  status: "queued" | "confirmation_required";
  document_ids: string[];
};

async function parseProcessResponse(response: Response): Promise<ProcessResponse> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<ProcessResponse>;
}

export async function processDocuments(
  documentIds: string[],
  confirmReprocess = false,
): Promise<ProcessResponse> {
  const response = await fetch(`${BASE_URL}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_ids: documentIds, confirm_reprocess: confirmReprocess }),
  });
  return parseProcessResponse(response);
}

export async function retryDocument(id: string): Promise<ProcessResponse> {
  const response = await fetch(`${BASE_URL}/${id}/retry`, { method: "POST" });
  return parseProcessResponse(response);
}

export function attachmentFileUrl(documentId: string, attachmentId: string): string {
  return `${BASE_URL}/${documentId}/attachments/${attachmentId}/file`;
}

export async function uploadAttachment(documentId: string, file: File): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  const uploadResponse = await fetch(`${BASE_URL}/${documentId}/attachments`, {
    method: "POST",
    body: formData,
  });
  if (!uploadResponse.ok) {
    const body = await uploadResponse.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${uploadResponse.status}`);
  }
  return getDocument(documentId);
}

export async function deleteAttachment(documentId: string, attachmentId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/${documentId}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
}
