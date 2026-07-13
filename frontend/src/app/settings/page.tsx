import { AppShell } from "@/components/app-shell";
import { PagePlaceholder } from "@/components/page-placeholder";
import { ServiceStatusPanel } from "@/components/service-status";

export default function SettingsPage() {
  return <AppShell currentPath="/settings"><PagePlaceholder description="LM Studio connection and event type settings will appear here in Phase 5." phase="Phase 5" title="Settings" /><ServiceStatusPanel /></AppShell>;
}
