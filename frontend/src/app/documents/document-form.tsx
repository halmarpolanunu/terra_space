"use client";

import { useState, type FormEvent } from "react";

import type { DocumentDraft } from "@/lib/documents-api";

type DocumentFormProps = {
  initialValues?: DocumentDraft;
  submitLabel?: string;
  onSubmit: (draft: DocumentDraft) => void;
  onCancel?: () => void;
};

const EMPTY_DRAFT: DocumentDraft = {
  title: "",
  content: "",
  document_date: "",
  publication_date: null,
  source_url: null,
};

export function DocumentForm({
  initialValues,
  submitLabel = "Save",
  onSubmit,
  onCancel,
}: DocumentFormProps) {
  // Callers remount this form with a fresh `key` when switching documents, so
  // `initialValues` only needs to seed state once, not resync on every change.
  const [values, setValues] = useState<DocumentDraft>(initialValues ?? EMPTY_DRAFT);

  const canSubmit =
    values.title.trim() !== "" &&
    values.content.trim() !== "" &&
    values.document_date.trim() !== "";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    onSubmit({
      title: values.title,
      content: values.content,
      document_date: values.document_date,
      publication_date: values.publication_date || null,
      source_url: values.source_url || null,
    });
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <p className="panel-title">Document</p>
      <div className="field">
        <label htmlFor="document-title">Title</label>
        <input
          id="document-title"
          onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
          type="text"
          value={values.title}
        />
      </div>
      <div className="field">
        <label htmlFor="document-content">Content</label>
        <textarea
          className="serif"
          id="document-content"
          onChange={(event) => setValues((prev) => ({ ...prev, content: event.target.value }))}
          value={values.content}
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="document-date">Document date</label>
          <input
            id="document-date"
            onChange={(event) =>
              setValues((prev) => ({ ...prev, document_date: event.target.value }))
            }
            type="date"
            value={values.document_date}
          />
        </div>
        <div className="field">
          <label htmlFor="publication-date">Publication date</label>
          <input
            id="publication-date"
            onChange={(event) =>
              setValues((prev) => ({ ...prev, publication_date: event.target.value || null }))
            }
            type="date"
            value={values.publication_date ?? ""}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="source-url">Source URL</label>
        <input
          id="source-url"
          onChange={(event) =>
            setValues((prev) => ({ ...prev, source_url: event.target.value || null }))
          }
          type="text"
          value={values.source_url ?? ""}
        />
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={!canSubmit} type="submit">
          {submitLabel}
        </button>
        {onCancel && (
          <button className="btn" onClick={onCancel} type="button">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
