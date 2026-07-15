import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "@/components/page-header";

describe("PageHeader", () => {
  it("renders the shared eyebrow, title, description, and optional action pattern", () => {
    render(
      <PageHeader
        action={<a href="/events">Open events</a>}
        description="One filtered view across the local intelligence workspace."
        eyebrow="Approved intelligence"
        title="Dashboard"
        titleId="dashboard-title"
      />,
    );

    expect(screen.getByText("Approved intelligence")).toHaveClass("eyebrow");
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toHaveAttribute(
      "id",
      "dashboard-title",
    );
    expect(
      screen.getByText("One filtered view across the local intelligence workspace."),
    ).toHaveClass("page-header-description");
    expect(screen.getByRole("link", { name: "Open events" })).toHaveAttribute(
      "href",
      "/events",
    );
  });

  it("omits the action region when no action is supplied", () => {
    render(
      <PageHeader
        description="Configure local processing and event types."
        eyebrow="Local configuration"
        title="Settings"
        titleId="settings-title"
      />,
    );

    expect(screen.queryByTestId("page-header-actions")).not.toBeInTheDocument();
  });
});
