"use client";

import Image from "next/image";

import { ProcessingStatusBadge } from "@/app/documents/processing-status-badge";
import { FramedPanel } from "@/components/framed-panel";
import { attachmentFileUrl, type Document } from "@/lib/documents-api";

const EDITABLE_STATUSES = new Set(["draft", "failed"]);

type DocumentListProps = {
  documents: Document[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onProcessSelected: () => void;
  onEdit?: (document: Document) => void;
  onDelete?: (id: string) => void;
  onRetry?: (id: string) => void;
  onUploadAttachment?: (documentId: string, file: File) => void;
  onDeleteAttachment?: (documentId: string, attachmentId: string) => void;
};

export function DocumentList({
  documents,
  selectedIds,
  onToggleSelect,
  onProcessSelected,
  onEdit,
  onDelete,
  onRetry,
  onUploadAttachment,
  onDeleteAttachment,
}: DocumentListProps) {
  const selectedCount = selectedIds.size;

  return (
    <FramedPanel meta={`${documents.length} total`} title="Document queue">
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
      {documents.length === 0 ? (
        <div className="event-empty-state">
          <p>No documents yet — add your first document above.</p>
        </div>
      ) : (
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
              <span className="document-meta">Dated {document.document_date} · {document.attachments.length} attachment{document.attachments.length === 1 ? "" : "s"}</span>
              {document.processing_status === "failed" && document.processing_error && (
                <span className="document-error">{document.processing_error}</span>
              )}
              {(document.attachments.length > 0 ||
                (onUploadAttachment && EDITABLE_STATUSES.has(document.processing_status))) && (
                <div className="attachment-list">
                  {document.attachments.map((attachment) => (
                    <div className="attachment-thumb" key={attachment.id}>
                      <Image
                        alt={attachment.original_name}
                        fill
                        sizes="60px"
                        src={attachmentFileUrl(document.id, attachment.id)}
                        unoptimized
                      />
                      {onDeleteAttachment && EDITABLE_STATUSES.has(document.processing_status) && (
                        <button
                          aria-label={`Delete ${attachment.original_name}`}
                          className="attachment-delete"
                          onClick={() => onDeleteAttachment(document.id, attachment.id)}
                          type="button"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {onUploadAttachment && EDITABLE_STATUSES.has(document.processing_status) && (
                    <label className="attachment-add">
                      Add attachment
                      <input
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        aria-label={`Add attachment for ${document.title}`}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            onUploadAttachment(document.id, file);
                          }
                          event.target.value = "";
                        }}
                        type="file"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
            <div className="document-row-actions">
              <ProcessingStatusBadge status={document.processing_status} />
              {onRetry && document.processing_status === "failed" && (
                <button className="btn" onClick={() => onRetry(document.id)} type="button">
                  Retry
                </button>
              )}
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
      )}
    </FramedPanel>
  );
}
