import type { ReactNode } from "react";
import Image from "next/image";

import { Navigation } from "@/components/navigation";

type AppShellProps = { currentPath: string; children: ReactNode };

export function AppShell({ currentPath, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <p className="brand">
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
        </p>
        <Navigation currentPath={currentPath} />
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
