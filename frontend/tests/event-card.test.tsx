import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AddEventForm } from "@/app/event-review/add-event-form";
import { EventCard } from "@/app/event-review/event-card";
import type { EventRead } from "@/lib/events-api";

function makeEvent(overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: "event-1",
    title: "Depot attack",
    summary: "A militia group reportedly attacked a fuel depot.",
    event_date: null,
    event_date_precision: null,
    epistemic_status: "claim",
    review_status: "draft",
    event_type: { id: "type-1", name: "Attack", description: null, is_active: false },
    actors: [],
    locations: [],
    sources: [{ source_id: "source-1", document_id: "doc-1", reference_label: "Doc", evidence_quote: "attacked the fuel depot" }],
    duplicate_flags: [],
    extraction_incomplete: false,
    extraction_incomplete_stages: [],
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
    ...overrides,
  };
}

describe("EventCard", () => {
  it("shows which attributes failed when extraction is incomplete", () => {
    render(
      <EventCard
        actorOptions={[]}
        approveDisabledReason={null}
        event={makeEvent({
          extraction_incomplete: true,
          extraction_incomplete_stages: ["actors", "locations"],
        })}
        eventTypeOptions={[]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText(/extraction incomplete/i)).toBeVisible();
    expect(screen.getByText(/actors, locations/i)).toBeVisible();
  });

  it("shows no incomplete-extraction note for a complete event", () => {
    render(
      <EventCard
        actorOptions={[]}
        approveDisabledReason={null}
        event={makeEvent()}
        eventTypeOptions={[]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByText(/extraction incomplete/i)).not.toBeInTheDocument();
  });

  it("shows the selected definition before approving or editing an extracted event", () => {
    const event = makeEvent({
      event_type: {
        id: "attack", name: "Attack",
        description: "Deliberate use of force against a target.",
        is_active: false,
      },
    });
    render(
      <EventCard
        actorOptions={[]}
        approveDisabledReason={null}
        event={event}
        eventTypeOptions={[event.event_type!]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("Deliberate use of force against a target.")).toBeVisible();
  });

  it("shows explicit unknown/not-stated labels instead of blank cells", () => {
    render(
      <EventCard
        actorOptions={[]}
        approveDisabledReason={null}
        event={makeEvent()}
        eventTypeOptions={[]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Event date")).toBeVisible();
    expect(screen.queryByText("Start")).not.toBeInTheDocument();
    expect(screen.queryByText("End")).not.toBeInTheDocument();
    expect(screen.queryByText("Start date")).not.toBeInTheDocument();
    expect(screen.queryByText("End date")).not.toBeInTheDocument();
    expect(screen.getAllByText("Date unknown — kept blank")).toHaveLength(1);
    expect(screen.getAllByText("Not stated").length).toBeGreaterThan(0);
  });

  it("keeps an untyped draft editable without showing a suggested-type label", () => {
    render(
      <EventCard
        actorOptions={[]}
        approveDisabledReason={null}
        event={makeEvent({ event_type: null })}
        eventTypeOptions={[{ id: "active", name: "Diplomatic Statement", description: "Official statement.", is_active: true }]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Select an active Event Type during review if appropriate.")).toBeVisible();
    expect(screen.queryByText(/Suggested/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit fields" })).toBeEnabled();
  });

  it("disables Approve when a duplicate flag is pending and enables it when not", () => {
    const { rerender } = render(
      <EventCard
        actorOptions={[]}
        approveDisabledReason="Resolve the duplicate flag below first."
        event={makeEvent()}
        eventTypeOptions={[]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /approve/i })).toBeDisabled();

    rerender(
      <EventCard
        actorOptions={[]}
        approveDisabledReason={null}
        event={makeEvent()}
        eventTypeOptions={[]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /approve/i })).toBeEnabled();
  });

  it("disables approval with the supplied description-review reason", () => {
    render(
      <EventCard
        actorOptions={[]}
        approveDisabledReason="Resolve the duplicate flag below first."
        event={makeEvent()}
        eventTypeOptions={[]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByText(
      "Resolve the duplicate flag below first.",
    )).toBeVisible();
  });

  it("calls onSave with the edited title when Edit then Save is used", () => {
    const onSave = vi.fn();
    render(
      <EventCard
        actorOptions={[]}
        approveDisabledReason={null}
        event={makeEvent({ event_date: "2026-07-10", event_date_precision: "exact" })}
        eventTypeOptions={[]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Updated title" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      title: "Updated title",
      event_date: "2026-07-10",
      event_date_precision: "exact",
    });
  });

  it("accepts a month-only event date in the review editor", () => {
    const onSave = vi.fn();
    render(
      <EventCard
        actorOptions={[]}
        approveDisabledReason={null}
        event={makeEvent()}
        eventTypeOptions={[]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByLabelText("Event date")).toHaveAttribute("type", "text");
    fireEvent.change(screen.getByLabelText("Event date"), { target: { value: "2026-07" } });
    fireEvent.change(screen.getByLabelText("Event date precision"), { target: { value: "month" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      event_date: "2026-07",
      event_date_precision: "month",
    }));
  });

  it("calls onApprove and onReject when their buttons are clicked", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <EventCard
        actorOptions={[]}
        approveDisabledReason={null}
        event={makeEvent()}
        eventTypeOptions={[]}
        onApprove={onApprove}
        onReject={onReject}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});

describe("AddEventForm", () => {
  it("shows the selected definition when manually adding a review event", () => {
    const eventType = {
      id: "protest", name: "Protest",
      description: "Collective public demonstration.",
      is_active: true,
      taxonomy_path: [
        { id: "d", name: "Test Domain", level: "domain" as const },
        { id: "c", name: "Test Category", level: "category" as const },
        { id: "s", name: "Test Subcategory", level: "subcategory" as const },
        { id: "protest", name: "Protest", level: "event_type" as const },
      ],
    };
    render(<AddEventForm eventTypeOptions={[eventType]} onCancel={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Event type"), { target: { value: "Protest" } });
    expect(screen.getByText("Collective public demonstration.")).toBeVisible();
  });

  it("keeps submit disabled until title, summary, and evidence quote are filled", () => {
    render(<AddEventForm eventTypeOptions={[]} onCancel={vi.fn()} onSubmit={vi.fn()} />);

    const submit = screen.getByRole("button", { name: /add event/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Checkpoint closure" } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/summary/i), {
      target: { value: "A checkpoint was closed." },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/evidence quote/i), {
      target: { value: "checkpoint closure near the bridge" },
    });
    expect(submit).toBeEnabled();
  });

  it("submits the entered values, defaulting epistemic status to claim", () => {
    const onSubmit = vi.fn();
    render(<AddEventForm eventTypeOptions={[]} onCancel={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Checkpoint closure" } });
    fireEvent.change(screen.getByLabelText(/summary/i), {
      target: { value: "A checkpoint was closed." },
    });
    fireEvent.change(screen.getByLabelText(/evidence quote/i), {
      target: { value: "checkpoint closure near the bridge" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add event/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Checkpoint closure",
      summary: "A checkpoint was closed.",
      evidence_quote: "checkpoint closure near the bridge",
      epistemic_status: "claim",
      event_type: undefined,
    });
  });

  it("submits only a selected full-leaf active event type", () => {
    const onSubmit = vi.fn();
    const taxonomyPath = [
      { id: "domain-1", name: "Diplomacy", level: "domain" as const },
      { id: "category-1", name: "Diplomatic Engagement", level: "category" as const },
      { id: "subcategory-1", name: "Diplomatic Communication", level: "subcategory" as const },
      { id: "active", name: "Diplomatic Statement", level: "event_type" as const },
    ];
    render(<AddEventForm eventTypeOptions={[
      { id: "active", name: "Diplomatic Statement", description: "Official statement.", is_active: true, taxonomy_path: taxonomyPath },
      { id: "inactive", name: "Legacy", description: null, is_active: false },
      { id: "unlinked", name: "Unlinked active", description: "Not part of the tree.", is_active: true },
    ]} onCancel={vi.fn()} onSubmit={onSubmit} />);

    expect(screen.queryByRole("option", { name: "Legacy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Unlinked active" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Statement" } });
    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "A statement was issued." } });
    fireEvent.change(screen.getByLabelText(/evidence quote/i), { target: { value: "statement was issued" } });
    fireEvent.change(screen.getByLabelText("Event type"), { target: { value: "Diplomatic Statement" } });
    expect(screen.getByText("Diplomacy › Diplomatic Engagement › Diplomatic Communication › Diplomatic Statement")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /add event/i }));

    expect(onSubmit.mock.calls[0][0].event_type).toEqual({ existing: "Diplomatic Statement" });
  });
});
