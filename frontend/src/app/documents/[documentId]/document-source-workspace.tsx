"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { getDocument, type Document } from "@/lib/documents-api";

type DocumentSourceWorkspaceProps = { documentId: string; backToEvents: string };

export function DocumentSourceWorkspace({ documentId, backToEvents }: DocumentSourceWorkspaceProps) {
  const [document, setDocument] = useState<Document>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void getDocument(documentId)
      .then((nextDocument) => { if (active) { setDocument(nextDocument); setError(undefined); } })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load document."); });
    return () => { active = false; };
  }, [documentId]);

  return <AppShell currentPath="/documents"><section className="document-source-page" aria-labelledby="source-document-title">
    <Link className="btn" href={backToEvents}>Back to Events</Link>
    {error ? <><h1 id="source-document-title">Source document</h1><p className="document-error">{error}</p></> : document ? <>
      <p className="eyebrow">Read-only source</p><h1 id="source-document-title">{document.title}</h1>
      <p className="document-meta">Publication date: {document.publication_date}</p>
      {document.source_url && <p><a href={document.source_url} rel="noreferrer" target="_blank">Open original source</a></p>}
      <article className="source-document">{document.content}</article>
    </> : <><h1 id="source-document-title">Source document</h1><p>Loading source document…</p></>}
  </section></AppShell>;
}
