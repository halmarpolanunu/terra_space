"use client";

import { useEffect, useState } from "react";

import { PipelineSummary, calculatePipelineCounts, type PipelineCounts } from "@/app/sense/pipeline-summary";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { listDocuments } from "@/lib/documents-api";
import { listEventsByReviewStatus } from "@/lib/events-api";

export function SenseWorkspace() {
  const [counts, setCounts] = useState<PipelineCounts | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void Promise.all([
      listDocuments(),
      listEventsByReviewStatus("draft"),
      listEventsByReviewStatus("approved"),
    ]).then(([documents, draftEvents, approvedEvents]) => {
      if (!active) return;
      setCounts(calculatePipelineCounts(documents, draftEvents, approvedEvents));
      setError(undefined);
    }).catch(() => {
      if (active) setError("Terra Space backend is unavailable. Try again after it starts.");
    });
    return () => { active = false; };
  }, []);

  return (
    <AppShell currentPath="/sense">
      <section aria-labelledby="sense-title" className="sense-page">
        <PageHeader
          eyebrow="Local preparation flow"
          title="Terra Sense"
          titleId="sense-title"
          description="Follow local source documents through processing, human review, and approval."
        />
        {error && <p className="document-error" role="alert">{error}</p>}
        <PipelineSummary counts={counts} />
      </section>
    </AppShell>
  );
}
