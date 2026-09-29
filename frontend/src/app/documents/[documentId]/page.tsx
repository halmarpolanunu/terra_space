import { DocumentSourceWorkspace } from "@/app/documents/[documentId]/document-source-workspace";

type DocumentSourcePageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function DocumentSourcePage({ params }: DocumentSourcePageProps) {
  const { documentId } = await params;
  return <DocumentSourceWorkspace documentId={documentId} />;
}
