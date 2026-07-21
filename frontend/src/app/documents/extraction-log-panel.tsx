"use client";

import { useEffect, useState } from "react";

import { listExtractionLog, type ExtractionLogEntry } from "@/lib/documents-api";

type ExtractionLogPanelProps = { documentId: string };

const STAGE_LABEL: Record<string, string> = {
  signal_parser: "Signal Parser",
  event_type: "Event Type",
  event_date: "Event Date",
  locations: "Locations",
  actors: "Actors",
  persistence: "Persistence",
};

export function ExtractionLogPanel({ documentId }: ExtractionLogPanelProps) {
  const [entries, setEntries] = useState<ExtractionLogEntry[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void listExtractionLog(documentId)
      .then((next) => {
        if (!active) return;
        setEntries(next);
        setError(undefined);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load the extraction log.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [documentId]);

  if (error) {
    return <p className="document-error">{error}</p>;
  }
  if (entries === undefined) {
    return <p>Loading extraction log…</p>;
  }
  if (entries.length === 0) {
    return <p className="settings-hint">No extraction log entries yet.</p>;
  }

  return (
    <ul aria-label="Extraction log" className="extraction-log-list">
      {entries.map((entry) => (
        <li className="extraction-log-entry" data-outcome={entry.outcome} key={entry.id}>
          <span className="extraction-log-stage">{STAGE_LABEL[entry.stage] ?? entry.stage}</span>
          <span className="extraction-log-outcome">{entry.outcome}</span>
          {entry.candidate_index !== null && (
            <span className="extraction-log-candidate">
              Candidate {entry.candidate_index + 1}
            </span>
          )}
          <span className="extraction-log-detail">{entry.detail}</span>
        </li>
      ))}
    </ul>
  );
}
