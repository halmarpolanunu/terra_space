import { Suspense } from "react";

import { EventsWorkspace } from "@/app/events/events-workspace";

export default function EventsPage() {
  return <Suspense fallback={<main className="main-content"><h1>Events</h1><p>Loading events…</p></main>}><EventsWorkspace /></Suspense>;
}
