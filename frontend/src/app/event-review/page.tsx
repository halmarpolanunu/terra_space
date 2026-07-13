import { AppShell } from "@/components/app-shell";
import { PagePlaceholder } from "@/components/page-placeholder";

export default function EventReviewPage() {
  return <AppShell currentPath="/event-review"><PagePlaceholder description="Review, correction, and duplicate decisions for extracted events will appear here in Phase 3." phase="Phase 3" title="Event Review" /></AppShell>;
}
