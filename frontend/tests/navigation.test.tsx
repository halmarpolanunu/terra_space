import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Navigation } from "@/components/navigation";

describe("Navigation", () => {
  it("places Issues second in Terra Insight, after Dashboard and before Events", () => {
    render(<Navigation currentPath="/documents" />);

    const links = screen.getAllByRole("link");

    expect(screen.getByText("Terra Insight")).toBeVisible();
    expect(screen.getByText("Terra Sense")).toBeVisible();
    expect(screen.getByText("Settings")).toBeVisible();
    expect(links).toHaveLength(9);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard",
      "/issues",
      "/events",
      "/sense",
      "/documents",
      "/event-review",
      "/sense/event-types",
      "/sense/actors",
      "/settings",
    ]);
  });

  it("marks the current page for assistive technology", () => {
    render(<Navigation currentPath="/documents" />);

    expect(screen.getByRole("link", { name: "Sources" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it.each(["/documents", "/event-review", "/sense/event-types"])(
    "marks only the precise active route %s",
    (currentPath) => {
      render(<Navigation currentPath={currentPath} />);

      expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
      expect(screen.getByRole("link", { current: "page" })).toHaveAttribute(
        "href",
        currentPath,
      );
    },
  );

  it("shows the nine-item navigation sequence", () => {
    render(<Navigation currentPath="/dashboard" />);

    ["01", "02", "03", "04", "05", "06", "07", "08", "09"].forEach((number) => {
      expect(screen.getByText(number)).toHaveAttribute("aria-hidden", "true");
    });
  });
});
