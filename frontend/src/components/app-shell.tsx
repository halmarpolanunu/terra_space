import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { Navigation } from "@/components/navigation";
import { WorkspaceAmbiance } from "@/components/workspace-ambiance";
import { getWorkspaceBackground } from "@/lib/workspace-backgrounds";

type AppShellProps = { currentPath: string; children: ReactNode; presentation?: boolean };
type WorkspaceShellStyle = CSSProperties & {
  "--workspace-background-image": string;
};

export function AppShell({ currentPath, children, presentation = false }: AppShellProps) {
  const cinematic = currentPath === "/home" || currentPath === "/explore" || currentPath === "/prepare";
  const style: WorkspaceShellStyle = {
    "--workspace-background-image": `url("${getWorkspaceBackground(currentPath)}")`,
  };

  return (
    <div className="app-shell" data-route={currentPath} data-cinematic={cinematic || undefined} data-presentation={presentation || undefined} style={style}>
      <WorkspaceAmbiance />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="top-status-bar">
        <Link aria-label="Terra Space home" className="brand" href="/home">
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
        {cinematic && !presentation && <div className="header-navigation"><Navigation currentPath={currentPath} /></div>}
        <div className="system-readouts">
          <span className="system-local-readout">Local // offline-safe</span>
        </div>
      </header>
      {!cinematic && <aside className="sidebar">
        <p className="sidebar-label">Workspace</p>
        <Navigation currentPath={currentPath} />
        <p className="sidebar-note">Local intelligence workspace</p>
      </aside>}
      <main className="main-content" data-route={currentPath} id="main-content">
        {children}
      </main>
    </div>
  );
}
