import { AppShell } from "@/components/app-shell";
import { PagePlaceholder } from "@/components/page-placeholder";

export default function DashboardPage() {
  return <AppShell currentPath="/dashboard"><PagePlaceholder description="Approved event summaries, map, timeline, and filters will appear here in Phase 4." phase="Phase 4" title="Dashboard" /></AppShell>;
}
