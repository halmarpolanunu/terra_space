import { Suspense } from "react";

import { IssuesWorkspace } from "@/app/issues/issues-workspace";

export default function IssuesPage() {
  return (
    <Suspense fallback={<main className="main-content"><h1>Issues</h1><p>Loading Issues…</p></main>}>
      <IssuesWorkspace />
    </Suspense>
  );
}
