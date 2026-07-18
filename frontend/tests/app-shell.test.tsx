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

    expect(screen.getByText("Terra Insight")).toBeVisible();
    expect(screen.getByText("Terra Sense")).toBeVisible();
    expect(screen.getByText("Settings")).toBeVisible();
    expect(screen.getByRole("link", { current: "page" })).toHaveAttribute(
      "href",
      "/sense/event-types",
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("renders the permanent local and LM Studio readouts above every page", async () => {
    render(
      <AppShell currentPath="/dashboard">
        <h1>Dashboard</h1>
      </AppShell>,
    );

    const statusBar = screen.getByRole("banner");
    expect(within(statusBar).getByText("Local // offline-safe")).toBeVisible();
    expect(await within(statusBar).findByText("Offline", { exact: true })).toBeVisible();
    expect(within(statusBar).getByText("LM Studio", { exact: true })).toBeVisible();
    expect(within(statusBar).getByRole("link", { name: "Terra Space home" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("main")).toHaveAttribute("data-route", "/dashboard");
    const shell = document.querySelector(".app-shell");
    expect(shell).toHaveAttribute("data-route", "/dashboard");
    expect(shell?.getAttribute("style")).toContain(
      '--workspace-background-image: url("/backgrounds/dashboard.webp")',
    );
  });
});
