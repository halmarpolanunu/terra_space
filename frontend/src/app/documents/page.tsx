"use client";

import { useEffect, useRef, useState } from "react";

import { DocumentForm } from "@/app/documents/document-form";
import { DocumentList } from "@/app/documents/document-list";
import { ReprocessConfirmDialog } from "@/app/documents/reprocess-confirm-dialog";
import { AppShell } from "@/components/app-shell";
import {
  createDocument,
  deleteAttachment,
  deleteDocument,
  listDocuments,
  processDocuments,
  retryDocument,
  updateDocument,
  uploadAttachment,
  type Document,
  type DocumentDraft,
} from "@/lib/documents-api";

const POLL_INTERVAL_MS = 1500;
const ACTIVE_STATUSES = new Set(["queued", "processing"]);

function toDraft(document: Document): DocumentDraft {
  return {
    title: document.title,
    content: document.content,
    document_date: document.document_date,
    publication_date: document.publication_date,
    source_url: document.source_url,
  };
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [error, setError] = useState<string>();
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<string[] | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (pollingIds.size === 0) {
      return;
    }
    pollTimer.current = setInterval(async () => {
      const latest = await listDocuments();
      setDocuments(latest);
      const stillActive = latest.some(
        (document) => pollingIds.has(document.id) && ACTIVE_STATUSES.has(document.processing_status),
      );
      if (!stillActive) {
        setPollingIds(new Set());
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
      }
    };
  }, [pollingIds]);

  async function refresh() {
    try {
      setDocuments(await listDocuments());
      setError(undefined);
    } catch {
      setError("Terra Space backend is unavailable.");
    }
  }

  async function handleSubmit(draft: DocumentDraft) {
    try {
      if (editingDocument) {
        await updateDocument(editingDocument.id, draft);
      } else {
        await createDocument(draft);
      }
      setEditingDocument(null);
      await refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not save the document.",
      );
    }
  }

  async function handleDelete(id: string) {
    await deleteDocument(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await refresh();
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleProcessSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }
    try {
      const response = await processDocuments(ids);
      if (response.status === "confirmation_required") {
        setConfirmation(response.document_ids);
        return;
      }
      setSelectedIds(new Set());
      setPollingIds(new Set(response.document_ids));
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not start processing.",
      );
    }
  }

  async function handleConfirmReprocess() {
    if (!confirmation) {
      return;
    }
    const ids = confirmation;
    setConfirmation(null);
    try {
      const response = await processDocuments(ids, true);
      setSelectedIds(new Set());
      setPollingIds(new Set(response.document_ids));
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not start processing.",
      );
    }
  }

  async function handleRetry(id: string) {
    try {
      const response = await retryDocument(id);
      setPollingIds(new Set(response.document_ids));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not retry the document.");
    }
  }

  async function handleUploadAttachment(documentId: string, file: File) {
    try {
      const updated = await uploadAttachment(documentId, file);
      setDocuments((current) =>
        current.map((document) => (document.id === updated.id ? updated : document)),
      );
      setError(undefined);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Could not upload the attachment.",
      );
    }
  }

  async function handleDeleteAttachment(documentId: string, attachmentId: string) {
    try {
      await deleteAttachment(documentId, attachmentId);
      setDocuments((current) =>
        current.map((document) =>
          document.id === documentId
            ? {
                ...document,
                attachments: document.attachments.filter(
                  (attachment) => attachment.id !== attachmentId,
                ),
              }
            : document,
        ),
      );
      setError(undefined);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Could not delete the attachment.",
      );
    }
  }

  return (
    <AppShell currentPath="/documents">
      <section className="documents-page">
        <div>
          <p className="eyebrow">Phase 2</p>
          <h1>Documents</h1>
        </div>
        {error && <p role="alert">{error}</p>}
        {confirmation && (
          <ReprocessConfirmDialog
            count={confirmation.length}
            onCancel={() => setConfirmation(null)}
            onConfirm={handleConfirmReprocess}
          />
        )}
        <DocumentForm
          initialValues={editingDocument ? toDraft(editingDocument) : undefined}
          key={editingDocument?.id ?? "new"}
          onCancel={editingDocument ? () => setEditingDocument(null) : undefined}
          onSubmit={handleSubmit}
          submitLabel={editingDocument ? "Save changes" : "Add document"}
        />
        <DocumentList
          documents={documents}
          onDelete={handleDelete}
          onDeleteAttachment={handleDeleteAttachment}
          onEdit={setEditingDocument}
          onProcessSelected={handleProcessSelected}
          onRetry={handleRetry}
          onToggleSelect={handleToggleSelect}
          onUploadAttachment={handleUploadAttachment}
          selectedIds={selectedIds}
        />
      </section>
    </AppShell>
  );
}
