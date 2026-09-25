import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getHealth: vi.fn().mockResolvedValue({
      app: "available",
      storage: "available",
      map: "available",
      lm_studio: "offline",
    }),
  };
});

import { AppShell } from "@/components/app-shell";

describe("AppShell", () => {
  it("includes the grouped navigation without changing the shell landmarks", () => {
    render(
      <AppShell currentPath="/sense/event-types">
        <h1>Event Types</h1>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "Explore" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Prepare" })).toBeVisible();
    expect(screen.getByText("Settings")).toBeVisible();
    expect(screen.getByRole("link", { current: "page" })).toHaveAttribute(
      "href",
      "/sense/event-types",
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("keeps only the local-workspace readout above every page", () => {
    render(
      <AppShell currentPath="/home">
        <h1>Home</h1>
      </AppShell>,
    );

    const statusBar = screen.getByRole("banner");
    expect(within(statusBar).getByText("Local // offline-safe")).toBeVisible();
    expect(within(statusBar).queryByText("LM Studio", { exact: true })).not.toBeInTheDocument();
    expect(within(statusBar).queryByText("Offline", { exact: true })).not.toBeInTheDocument();
    expect(within(statusBar).getByRole("link", { name: "Terra Space home" })).toHaveAttribute(
      "href",
      "/home",
    );
    expect(screen.getByRole("main")).toHaveAttribute("data-route", "/home");
    const shell = document.querySelector(".app-shell");
    expect(shell).toHaveAttribute("data-route", "/home");
    expect(shell?.getAttribute("style")).toContain(
      '--workspace-background-image: url("/backgrounds/dashboard.webp")',
    );
  });
});
