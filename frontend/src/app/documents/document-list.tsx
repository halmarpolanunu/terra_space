"use client";

import { ProcessingStatusBadge } from "@/app/documents/processing-status-badge";
import type { Document } from "@/lib/documents-api";

const EDITABLE_STATUSES = new Set(["draft", "failed"]);

type DocumentListProps = {
  documents: Document[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onProcessSelected: () => void;
  onEdit?: (document: Document) => void;
  onDelete?: (id: string) => void;
};

export function DocumentList({
  documents,
  selectedIds,
  onToggleSelect,
  onProcessSelected,
  onEdit,
  onDelete,
}: DocumentListProps) {
  const selectedCount = selectedIds.size;

  return (
    <div className="panel">
      <div className="batch-actions">
        <button
          className="btn btn-primary"
          disabled={selectedCount === 0}
          onClick={onProcessSelected}
          type="button"
        >
          {selectedCount > 0 ? `Process ${selectedCount} selected` : "Process selected"}
        </button>
      </div>
      <ul className="document-list">
        {documents.map((document) => (
          <li className="document-row" key={document.id}>
            <input
              aria-label={`Select ${document.title}`}
              checked={selectedIds.has(document.id)}
              onChange={() => onToggleSelect(document.id)}
              type="checkbox"
            />
            <div className="document-row-main">
              <span className="document-title">{document.title}</span>
              <span className="document-meta">{document.document_date}</span>
              {document.processing_status === "failed" && document.processing_error && (
                <span className="document-error">{document.processing_error}</span>
              )}
            </div>
            <div className="document-row-actions">
              <ProcessingStatusBadge status={document.processing_status} />
              {onEdit && EDITABLE_STATUSES.has(document.processing_status) && (
                <button className="btn" onClick={() => onEdit(document)} type="button">
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  className="btn btn-destructive"
                  onClick={() => onDelete(document.id)}
                  type="button"
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
