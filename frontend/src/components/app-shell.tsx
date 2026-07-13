import type { ReactNode } from "react";

import { Navigation } from "@/components/navigation";

type AppShellProps = { currentPath: string; children: ReactNode };

export function AppShell({ currentPath, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <p className="brand">Terra Space</p>
        <Navigation currentPath={currentPath} />
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
