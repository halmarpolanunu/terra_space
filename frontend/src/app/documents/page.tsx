"use client";

import { useEffect, useState } from "react";

import { DocumentForm } from "@/app/documents/document-form";
import { DocumentList } from "@/app/documents/document-list";
import { AppShell } from "@/components/app-shell";
import {
  createDocument,
  deleteDocument,
  listDocuments,
  updateDocument,
  type Document,
  type DocumentDraft,
} from "@/lib/documents-api";

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

  useEffect(() => {
    refresh();
  }, []);

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

  function handleProcessSelected() {}

  return (
    <AppShell currentPath="/documents">
      <section className="documents-page">
        <div>
          <p className="eyebrow">Phase 2</p>
          <h1>Documents</h1>
        </div>
        {error && <p role="alert">{error}</p>}
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
          onEdit={setEditingDocument}
          onProcessSelected={handleProcessSelected}
          onToggleSelect={handleToggleSelect}
          selectedIds={selectedIds}
        />
      </section>
    </AppShell>
  );
}
