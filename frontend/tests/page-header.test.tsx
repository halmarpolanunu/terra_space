import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "@/components/page-header";

describe("PageHeader", () => {
  it("renders the shared eyebrow, title, description, and optional action pattern", () => {
    render(
      <PageHeader
        action={<a href="/explore">Open Explore</a>}
        description="One filtered view across the local intelligence workspace."
        eyebrow="Approved intelligence"
        title="Explore"
        titleId="explore-title"
      />,
    );

    expect(screen.getByText("Approved intelligence")).toHaveClass("eyebrow");
    expect(screen.getByRole("heading", { level: 1, name: "Explore" })).toHaveAttribute(
      "id",
      "explore-title",
    );
    expect(
      screen.getByText("One filtered view across the local intelligence workspace."),
    ).toHaveClass("page-header-description");
    expect(screen.getByRole("link", { name: "Open Explore" })).toHaveAttribute(
      "href",
      "/explore",
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
