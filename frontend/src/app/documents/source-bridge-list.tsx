"use client";

import { useState } from "react";

import { ProcessingStatusBadge } from "@/app/documents/processing-status-badge";
import { FramedPanel } from "@/components/framed-panel";
import type { BridgeSource } from "@/lib/bridge-api";

type SourceBridgeListProps = {
  sources: BridgeSource[];
};

/** Read-only Phase 1 source list for the Supabase bridge. Shows title, publication date, and
 * cleaned/raw text where available, per
 * project-knowledge/plans/2026-08-11-supabase-read-only-bridge-design.md. No add, edit, upload,
 * process, retry, or delete controls -- those act on SQLite documents, which this route no
 * longer reads from. */
export function SourceBridgeList({ sources }: SourceBridgeListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <FramedPanel meta={`${sources.length} total`} title="Phase 1 sources">
      {sources.length === 0 ? (
        <div className="event-empty-state">
          <p>No sources have been collected yet.</p>
        </div>
      ) : (
        <ul className="document-list">
          {sources.map((source) => {
            const expanded = expandedIds.has(source.id);
            const text = source.cleaned_content_text ?? source.raw_content_text;
            const textLabel = source.cleaned_content_text ? "Cleaned text" : "Raw text (not yet cleaned)";
            return (
              <li className="document-row" key={source.id}>
                <div className="document-row-main">
                  <span className="document-title">{source.title}</span>
                  <span className="document-meta">
                    Publication date: {source.publication_date} · {source.source_domain}
                  </span>
                  {source.processing_status === "failed" && source.processing_error && (
                    <span className="document-error">{source.processing_error}</span>
                  )}
                  {expanded && (
                    <div className="event-read-only-note">
                      <p className="field-label">{textLabel}</p>
                      <p>{text}</p>
                    </div>
                  )}
                </div>
                <div className="document-row-actions">
                  <ProcessingStatusBadge status={source.processing_status} />
                  <button className="btn" onClick={() => toggle(source.id)} type="button">
                    {expanded ? "Hide text" : "Show text"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </FramedPanel>
  );
}
