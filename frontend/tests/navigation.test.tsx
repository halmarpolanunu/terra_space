import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Navigation } from "@/components/navigation";

describe("Navigation", () => {
  it("offers four clear destinations and reachable earlier views", () => {
    render(<Navigation currentPath="/explore" />);
    for (const [label, href] of [["Home", "/home"], ["Explore", "/explore"], ["Prepare", "/prepare"], ["Settings", "/settings"]]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
    for (const href of ["/dashboard", "/events", "/event-review", "/sense/event-types", "/sense/actors"]) {
      expect(screen.getAllByRole("link").some((link) => link.getAttribute("href") === href)).toBe(true);
    }
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute("aria-current", "page");
  });

  it("highlights the parent without claiming the child is the current page", () => {
    render(<Navigation currentPath="/documents" />);
    expect(screen.getByRole("link", { name: "Prepare" })).toHaveAttribute("data-active-parent", "true");
    expect(screen.getByRole("link", { name: "Sources" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
  });
});
