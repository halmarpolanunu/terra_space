import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RelationshipPanel } from "@/app/issues/relationship-panel";

describe("RelationshipPanel", () => {
  it("plainly reports an event without fully supported actor relationships", () => {
    render(<RelationshipPanel relationships={[]} onSelect={vi.fn()} />);

    expect(screen.getByText("No supported actor relationships")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("selects a relationship and exposes its exact endpoints and evidence", () => {
    const onSelect = vi.fn();
    render(
      <RelationshipPanel
        onSelect={onSelect}
        relationships={[{
          id: "relationship-1",
          evidence_quote: "The Jakarta delegation met the Manila delegation.",
          source: {
            role: "source",
            actor_name: "Jakarta delegation",
            evidence_quote: "The Jakarta delegation",
            location: { id: "jakarta", label: "Jakarta, Indonesia", latitude: -6.2088, longitude: 106.8456, evidence_quote: "in Jakarta" },
          },
          target: {
            role: "target",
            actor_name: "Manila delegation",
            evidence_quote: "the Manila delegation",
            location: { id: "manila", label: "Manila, Philippines", latitude: 14.5995, longitude: 120.9842, evidence_quote: "in Manila" },
          },
        }]}
        selectedRelationshipId="relationship-1"
      />,
    );

    const control = screen.getByRole("button", { name: /jakarta delegation.*manila delegation/i });
    expect(control).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Jakarta delegation")).toBeVisible();
    expect(screen.getByText(/Jakarta delegation.*Jakarta, Indonesia/)).toBeVisible();
    expect(screen.getByText("Manila delegation")).toBeVisible();
    expect(screen.getByText(/Manila delegation.*Manila, Philippines/)).toBeVisible();
    expect(screen.getByText("The Jakarta delegation met the Manila delegation.")).toBeVisible();

    fireEvent.click(control);
    expect(onSelect).toHaveBeenCalledWith("relationship-1");
  });
});
