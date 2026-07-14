import React from "react";
import { TerraSpaceLogo } from "./TerraSpaceLogo";

export function SidebarBrand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <a href="/" aria-label="TerraSpace dashboard home">
      <TerraSpaceLogo
        variant={collapsed ? "micro" : "compact"}
        theme="dark"
        width={collapsed ? 36 : 184}
        height={collapsed ? 36 : undefined}
      />
    </a>
  );
}
