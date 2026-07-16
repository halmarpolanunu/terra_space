import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { Navigation } from "@/components/navigation";
import { ServiceStatusPanel } from "@/components/service-status";
import { getWorkspaceBackground } from "@/lib/workspace-backgrounds";

type AppShellProps = { currentPath: string; children: ReactNode };
type WorkspaceShellStyle = CSSProperties & {
  "--workspace-background-image": string;
};

export function AppShell({ currentPath, children }: AppShellProps) {
  const style: WorkspaceShellStyle = {
    "--workspace-background-image": `url("${getWorkspaceBackground(currentPath)}")`,
  };

  return (
    <div className="app-shell" data-route={currentPath} style={style}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="top-status-bar">
        <Link aria-label="Terra Space home" className="brand" href="/dashboard">
          <Image
            src="/brand/terraspace-micro-dark.svg"
            alt=""
            width={240}
            height={240}
            className="brand-mark"
            priority
          />
          <span className="brand-word">
            Terra<span className="brand-accent">Space</span>
          </span>
        </Link>
        <div className="system-readouts">
          <span className="system-local-readout">Local // offline-safe</span>
          <ServiceStatusPanel />
        </div>
      </header>
      <aside className="sidebar">
        <p className="sidebar-label">Workspace</p>
        <Navigation currentPath={currentPath} />
        <p className="sidebar-note">Local intelligence workspace</p>
      </aside>
      <main className="main-content" data-route={currentPath} id="main-content">
        {children}
      </main>
    </div>
  );
}
