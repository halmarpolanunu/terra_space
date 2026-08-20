import { loadInitialIssueWorkspace } from "@/app/issues/issues-initial-data";
import { IssuesWorkspace } from "@/app/issues/issues-workspace";

export default async function IssuesPage() {
  const initialIssueWorkspace = await loadInitialIssueWorkspace(
    process.env.BACKEND_URL ?? "http://backend:8000",
  );
  return <IssuesWorkspace {...initialIssueWorkspace} />;
}
