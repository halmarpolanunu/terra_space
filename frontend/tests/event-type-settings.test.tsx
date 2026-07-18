import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/settings-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settings-api")>("@/lib/settings-api");
  return { ...actual, createEventType: vi.fn(), updateEventType: vi.fn(), deleteEventType: vi.fn() };
});

vi.mock("@/lib/events-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/events-api")>("@/lib/events-api");
  return { ...actual, listEventTypes: vi.fn() };
});

import { EventTypeSettings } from "@/app/settings/event-type-settings";
import { EventTypesWorkspace } from "@/app/sense/event-types-workspace";
import * as settingsApi from "@/lib/settings-api";
import * as eventsApi from "@/lib/events-api";
import type { EventTypeRead } from "@/lib/events-api";

const TYPES: EventTypeRead[] = [
  { id: "type-active", name: "Protest", description: null, is_active: true, in_use: true },
  {
    id: "type-suggested",
    name: "Skirmish",
    description: "Use for a brief armed clash between opposing forces.",
    is_active: false,
    in_use: false,
  },
];

describe("EventTypeSettings", () => {
  afterEach(() => vi.clearAllMocks());

  it("distinguishes active and inactive types", () => {
    render(<EventTypeSettings eventTypes={TYPES} />);

    expect(screen.getByText("Active")).toBeVisible();
    expect(screen.getByText("Inactive")).toBeVisible();
    expect(screen.getByLabelText("Rename Protest").closest("li")).toHaveAttribute(
      "data-motion-item",
      "event-type-row",
    );
  });

  it("orients the user when no event types exist", () => {
    render(<EventTypeSettings eventTypes={[]} />);

    expect(screen.getByText(/no event types yet/i)).toBeVisible();
    expect(screen.getByText(/add an event type here before using it in event review/i)).toBeVisible();
    expect(screen.getByLabelText("New event type")).toBeVisible();
  });

  it("creates an active type with a required description", async () => {
    vi.mocked(settingsApi.createEventType).mockResolvedValue({
      id: "type-new",
      name: "Airstrike",
      description: "Use for attacks delivered by military aircraft.",
      is_active: true,
      in_use: false,
    });
    render(<EventTypeSettings eventTypes={TYPES} />);

    fireEvent.change(screen.getByLabelText("New event type"), {
      target: { value: "Airstrike" },
    });
    fireEvent.change(screen.getByLabelText("New event type description"), {
      target: { value: "Use for attacks delivered by military aircraft." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add event type" }));

    await waitFor(() =>
      expect(settingsApi.createEventType).toHaveBeenCalledWith(
        "Airstrike",
        "Use for attacks delivered by military aircraft.",
      ),
    );
    expect(await screen.findByLabelText("Rename Airstrike")).toBeVisible();
  });

  it("blocks activation and explains when a suggested type has no description", () => {
    render(
      <EventTypeSettings
        eventTypes={[
          {
            id: "suggested",
            name: "New type",
            description: null,
            is_active: false,
            in_use: false,
          },
        ]}
      />,
    );

    expect(screen.getByLabelText("Active: New type")).toBeDisabled();
    expect(screen.getByText("Add a description before activating.")).toBeVisible();
  });

  it("keeps activation blocked until the description is saved", () => {
    render(
      <EventTypeSettings
        eventTypes={[
          {
            id: "suggested",
            name: "New type",
            description: null,
            is_active: false,
            in_use: false,
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Description for New type"), {
      target: { value: "Use for newly classified events." },
    });

    expect(screen.getByLabelText("Active: New type")).toBeDisabled();
    expect(screen.getByText("Add a description before activating.")).toBeVisible();
  });

  it("toggles a type active flag", async () => {
    vi.mocked(settingsApi.updateEventType).mockResolvedValue({ ...TYPES[0], is_active: false });
    render(<EventTypeSettings eventTypes={TYPES} />);

    fireEvent.click(screen.getByLabelText("Active: Protest"));

    await waitFor(() =>
      expect(settingsApi.updateEventType).toHaveBeenCalledWith("type-active", { is_active: false }),
    );
  });

  it("saves a name and description together", async () => {
    vi.mocked(settingsApi.updateEventType).mockResolvedValue({
      ...TYPES[0],
      description: "Collective public demonstration.",
    });
    render(<EventTypeSettings eventTypes={TYPES} />);

    fireEvent.change(screen.getByLabelText("Description for Protest"), {
      target: { value: "Collective public demonstration." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes for Protest" }));

    await waitFor(() =>
      expect(settingsApi.updateEventType).toHaveBeenCalledWith("type-active", {
        name: "Protest",
        description: "Collective public demonstration.",
      }),
    );
  });

  it("offers delete only for unreferenced types", async () => {
    vi.mocked(settingsApi.deleteEventType).mockResolvedValue();
    render(<EventTypeSettings eventTypes={TYPES} />);

    expect(screen.queryByRole("button", { name: "Delete Protest" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete Skirmish" }));

    await waitFor(() => expect(settingsApi.deleteEventType).toHaveBeenCalledWith("type-suggested"));
  });
});

describe("EventTypesWorkspace", () => {
  afterEach(() => vi.clearAllMocks());

  it("loads existing types and provides their management controls in Terra Sense", async () => {
    vi.mocked(eventsApi.listEventTypes).mockResolvedValue(TYPES);

    render(<EventTypesWorkspace />);

    expect(await screen.findByRole("heading", { level: 1, name: "Event Types" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Add event type" })).toBeVisible();
    expect(screen.getByLabelText("Rename Protest")).toBeVisible();
    expect(screen.getByLabelText("Active: Protest")).toBeVisible();
    expect(screen.getByLabelText("Active: Skirmish")).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete Skirmish" })).toBeVisible();
  });
});
