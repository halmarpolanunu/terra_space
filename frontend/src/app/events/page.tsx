import { AppShell } from "@/components/app-shell";
import { PagePlaceholder } from "@/components/page-placeholder";

export default function EventsPage() {
  return <AppShell currentPath="/events"><PagePlaceholder description="Search, filters, and details for approved events will appear here in Phase 4." phase="Phase 4" title="Events" /></AppShell>;
}
