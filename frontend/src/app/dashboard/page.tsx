import { AppShell } from "@/components/app-shell";
import { PagePlaceholder } from "@/components/page-placeholder";
import { ServiceStatusPanel } from "@/components/service-status";
import { WorldMap } from "@/components/world-map";

export default function DashboardPage() {
  return <AppShell currentPath="/dashboard"><PagePlaceholder description="Approved event summaries, map, timeline, and filters will appear here in Phase 4." phase="Phase 4" title="Dashboard" /><ServiceStatusPanel /><WorldMap /></AppShell>;
}
