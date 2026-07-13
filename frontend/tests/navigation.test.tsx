import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Navigation } from "@/components/navigation";

describe("Navigation", () => {
  it("shows the five Terra Space pages", () => {
    render(<Navigation currentPath="/documents" />);

    const links = screen.getAllByRole("link");

    expect(links).toHaveLength(5);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Documents" })).toHaveAttribute(
      "href",
      "/documents",
    );
    expect(screen.getByRole("link", { name: "Event Review" })).toHaveAttribute(
      "href",
      "/event-review",
    );
    expect(screen.getByRole("link", { name: "Events" })).toHaveAttribute(
      "href",
      "/events",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("marks the current page for assistive technology", () => {
    render(<Navigation currentPath="/documents" />);

    expect(screen.getByRole("link", { name: "Documents" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
