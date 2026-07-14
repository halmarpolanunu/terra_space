import { Suspense } from "react";

import { DashboardWorkspace } from "@/app/dashboard/dashboard-workspace";

export default function DashboardPage() {
  return <Suspense fallback={<main className="main-content"><h1>Dashboard</h1><p>Loading dashboard…</p></main>}><DashboardWorkspace /></Suspense>;
}
