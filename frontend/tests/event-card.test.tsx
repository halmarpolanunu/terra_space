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
    start_date: null,
    start_date_precision: null,
    end_date: null,
    end_date_precision: null,
    epistemic_status: "claim",
    review_status: "draft",
    event_type: { id: "type-1", name: "Attack", description: null, is_active: false },
    actors: [],
    locations: [],
    sources: [{ source_id: "source-1", document_id: "doc-1", reference_label: "Doc", evidence_quote: "attacked the fuel depot" }],
    duplicate_flags: [],
    created_at: "2026-07-14T00:00:00Z",
    updated_at: "2026-07-14T00:00:00Z",
    ...overrides,
  };
}

describe("EventCard", () => {
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

    expect(screen.getAllByText("Date unknown — kept blank").length).toBe(2);
    expect(screen.getAllByText("Not stated").length).toBeGreaterThan(0);
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

  it("calls onSave with the edited title when Edit then Save is used", () => {
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
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Updated title" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ title: "Updated title" });
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
});
