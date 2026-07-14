import { DocumentSourceWorkspace } from "@/app/documents/[documentId]/document-source-workspace";

type DocumentSourcePageProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

function eventsPath(from: string | string[] | undefined): string {
  return typeof from === "string" && from.startsWith("/events") ? from : "/events";
}

export default async function DocumentSourcePage({ params, searchParams }: DocumentSourcePageProps) {
  const [{ documentId }, query] = await Promise.all([params, searchParams]);
  return <DocumentSourceWorkspace backToEvents={eventsPath(query.from)} documentId={documentId} />;
}
