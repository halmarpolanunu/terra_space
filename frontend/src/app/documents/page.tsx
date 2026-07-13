import { AppShell } from "@/components/app-shell";
import { PagePlaceholder } from "@/components/page-placeholder";

export default function DocumentsPage() {
  return <AppShell currentPath="/documents"><PagePlaceholder description="Document drafting, selection, and batch processing will appear here in Phase 2." phase="Phase 2" title="Documents" /></AppShell>;
}
