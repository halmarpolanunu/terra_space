"use client";

import { useEffect, useState } from "react";

import { SourceBridgeList } from "@/app/documents/source-bridge-list";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ReadOnlyBridgeNotice } from "@/components/read-only-bridge-notice";
import { listBridgeSources, type BridgeSource } from "@/lib/bridge-api";

// This route reads Supabase's phase1_sources directly and read-only; see
// project-knowledge/plans/2026-08-11-supabase-read-only-bridge-design.md. Adding, editing,
// uploading attachments, processing, retrying, and deleting sources are all out of scope for
// this preview and are not available here.
export default function DocumentsPage() {
  const [sources, setSources] = useState<BridgeSource[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    listBridgeSources()
      .then((result) => {
        if (!active) return;
        setSources(result);
        setError(undefined);
      })
      .catch((fetchError: Error) => {
        if (active) setError(fetchError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell currentPath="/documents">
      <section aria-labelledby="documents-title" className="documents-page">
        <PageHeader
          description="Read-only view of the local Supabase pipeline's collected source articles."
          eyebrow="Read-only Supabase preview"
          title="Sources"
          titleId="documents-title"
        />
        <ReadOnlyBridgeNotice />
        {error && <p role="alert">{error}</p>}
        <SourceBridgeList sources={sources} />
      </section>
    </AppShell>
  );
}
