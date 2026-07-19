import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/settings-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settings-api")>("@/lib/settings-api");
  return {
    ...actual,
    createTaxonomyNode: vi.fn(),
    updateTaxonomyNode: vi.fn(),
    deleteTaxonomyNode: vi.fn(),
  };
});

vi.mock("@/lib/events-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/events-api")>("@/lib/events-api");
  return { ...actual, listEventTaxonomy: vi.fn() };
});

import { EventTypeSettings } from "@/app/settings/event-type-settings";
import { EventTypesWorkspace } from "@/app/sense/event-types-workspace";
import * as settingsApi from "@/lib/settings-api";
import * as eventsApi from "@/lib/events-api";
import type { TaxonomyNodeRead } from "@/lib/events-api";

function buildTree(): TaxonomyNodeRead[] {
  return [
    {
      id: "domain-1",
      name: "Security & Conflict",
      level: "domain",
      parent_id: null,
      event_type: null,
      children: [
        {
          id: "category-1",
          name: "Signalling & Posture",
          level: "category",
          parent_id: "domain-1",
          event_type: null,
          children: [
            {
              id: "subcategory-1",
              name: "Security Signalling",
              level: "subcategory",
              parent_id: "category-1",
              event_type: null,
              children: [
                {
                  id: "leaf-1",
                  name: "Security Statement / Threat",
                  level: "event_type",
                  parent_id: "subcategory-1",
                  event_type: {
                    id: "type-1",
                    name: "Security Statement / Threat",
                    description: "Use for a public statement about security posture.",
                    is_active: true,
                    in_use: true,
                  },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "domain-2",
      name: "Diplomacy",
      level: "domain",
      parent_id: null,
      event_type: null,
      children: [
        {
          id: "category-2",
          name: "Diplomatic Engagement",
          level: "category",
          parent_id: "domain-2",
          event_type: null,
          children: [
            {
              id: "subcategory-2",
              name: "Diplomatic Communication",
              level: "subcategory",
              parent_id: "category-2",
              event_type: null,
              children: [
                {
                  id: "leaf-2",
                  name: "Diplomatic Statement",
                  level: "event_type",
                  parent_id: "subcategory-2",
                  event_type: {
                    id: "type-2",
                    name: "Diplomatic Statement",
                    description: null,
                    is_active: false,
                    in_use: false,
                  },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

describe("EventTypeSettings", () => {
  afterEach(() => vi.clearAllMocks());

  it("default-expands domains, selects the first leaf, and shows its details only in the inspector", () => {
    render(<EventTypeSettings nodes={buildTree()} />);

    expect(screen.getByLabelText("Event taxonomy tree")).toBeVisible();
    expect(screen.getByText("Signalling & Posture")).toBeVisible();
    expect(screen.getByText("Diplomatic Engagement")).toBeVisible();
    expect(screen.queryByText("Security Signalling")).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Security Statement / Threat" })).toBeVisible();
    expect(
      screen.getByText("Use for a public statement about security posture."),
    ).toBeVisible();
    expect(
      screen.getByText("Security & Conflict › Signalling & Posture › Security Signalling"),
    ).toBeVisible();
  });

  it("selects a different node from the tree and updates the inspector", () => {
    render(<EventTypeSettings nodes={buildTree()} />);

    fireEvent.click(screen.getByText("Diplomatic Engagement"));
    expect(screen.getByRole("heading", { name: "Diplomatic Engagement" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Security Statement / Threat" })).not.toBeInTheDocument();
  });

  it("searches by name or description and expands matching ancestors", () => {
    render(<EventTypeSettings nodes={buildTree()} />);

    fireEvent.change(screen.getByLabelText("Search taxonomy"), {
      target: { value: "Diplomatic Statement" },
    });

    expect(screen.queryByText("Security & Conflict")).not.toBeInTheDocument();
    expect(screen.getByText("Diplomacy")).toBeVisible();
    expect(screen.getByText("Diplomatic Communication")).toBeVisible();
    expect(screen.getByText("Diplomatic Statement")).toBeVisible();
  });

  it("hides edit fields until Edit is clicked, then saves the name and description together", async () => {
    const updatedTree = buildTree();
    updatedTree[0].children[0].children[0].children[0].name = "Security Statement (renamed)";
    updatedTree[0].children[0].children[0].children[0].event_type = {
      id: "type-1",
      name: "Security Statement (renamed)",
      description: "Updated definition.",
      is_active: true,
      in_use: true,
    };
    vi.mocked(settingsApi.updateTaxonomyNode).mockResolvedValue(
      updatedTree[0].children[0].children[0].children[0],
    );
    vi.mocked(eventsApi.listEventTaxonomy).mockResolvedValue(updatedTree);

    render(<EventTypeSettings nodes={buildTree()} />);

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit Security Statement / Threat" }));

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Security Statement (renamed)" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Updated definition." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(settingsApi.updateTaxonomyNode).toHaveBeenCalledWith("leaf-1", {
        name: "Security Statement (renamed)",
        description: "Updated definition.",
      }),
    );
    expect(await screen.findByRole("heading", { name: "Security Statement (renamed)" })).toBeVisible();
  });

  it("blocks activation and explains when a leaf has no saved description", () => {
    render(<EventTypeSettings nodes={buildTree()} />);
    fireEvent.click(screen.getByText("Diplomatic Engagement"));
    fireEvent.click(screen.getByText("Diplomatic Communication"));
    fireEvent.click(screen.getByText("Diplomatic Statement"));

    expect(screen.getByLabelText("Active: Diplomatic Statement")).toBeDisabled();
    expect(screen.getByText("Add a description before activating.")).toBeVisible();
  });

  it("requires confirmation before deactivating an active leaf", async () => {
    vi.mocked(settingsApi.updateTaxonomyNode).mockResolvedValue(buildTree()[0].children[0].children[0].children[0]);
    vi.mocked(eventsApi.listEventTaxonomy).mockResolvedValue(buildTree());

    render(<EventTypeSettings nodes={buildTree()} />);

    fireEvent.click(screen.getByLabelText("Active: Security Statement / Threat"));
    expect(
      screen.getByText(/deactivate security statement \/ threat\?/i),
    ).toBeVisible();
    expect(settingsApi.updateTaxonomyNode).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm deactivate" }));

    await waitFor(() =>
      expect(settingsApi.updateTaxonomyNode).toHaveBeenCalledWith("leaf-1", { is_active: false }),
    );
  });

  it("adds a child node at only the next valid level", async () => {
    const tree = buildTree();
    const newSubcategory: TaxonomyNodeRead = {
      id: "subcategory-3",
      name: "New subcategory",
      level: "subcategory",
      parent_id: "category-1",
      event_type: null,
      children: [],
    };
    vi.mocked(settingsApi.createTaxonomyNode).mockResolvedValue(newSubcategory);
    const nextTree = buildTree();
    nextTree[0].children[0].children.push(newSubcategory);
    vi.mocked(eventsApi.listEventTaxonomy).mockResolvedValue(nextTree);

    render(<EventTypeSettings nodes={tree} />);

    fireEvent.click(screen.getByText("Signalling & Posture"));
    expect(screen.queryByRole("button", { name: /add event type/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add subcategory" }));
    fireEvent.change(screen.getByLabelText("New subcategory name"), {
      target: { value: "New subcategory" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add subcategory" }));

    await waitFor(() =>
      expect(settingsApi.createTaxonomyNode).toHaveBeenCalledWith({
        name: "New subcategory",
        level: "subcategory",
        parent_id: "category-1",
        description: undefined,
      }),
    );
  });

  it("never offers an add-child action for an event_type leaf", () => {
    render(<EventTypeSettings nodes={buildTree()} />);
    expect(screen.queryByRole("button", { name: /^Add /i })).not.toBeInTheDocument();
  });

  it("hides Delete for an in-use leaf and for a node with children", () => {
    render(<EventTypeSettings nodes={buildTree()} />);
    expect(screen.queryByRole("button", { name: "Delete Security Statement / Threat" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Security & Conflict"));
    expect(screen.queryByRole("button", { name: "Delete Security & Conflict" })).not.toBeInTheDocument();
  });

  it("deletes an unused leaf only after confirmation", async () => {
    vi.mocked(settingsApi.deleteTaxonomyNode).mockResolvedValue();
    const nextTree = [buildTree()[0]];
    vi.mocked(eventsApi.listEventTaxonomy).mockResolvedValue(nextTree);

    render(<EventTypeSettings nodes={buildTree()} />);
    fireEvent.click(screen.getByText("Diplomatic Engagement"));
    fireEvent.click(screen.getByText("Diplomatic Communication"));
    fireEvent.click(screen.getByText("Diplomatic Statement"));

    fireEvent.click(screen.getByRole("button", { name: "Delete Diplomatic Statement" }));
    expect(screen.getByText(/delete diplomatic statement\? this cannot be undone\./i)).toBeVisible();
    expect(settingsApi.deleteTaxonomyNode).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => expect(settingsApi.deleteTaxonomyNode).toHaveBeenCalledWith("leaf-2"));
  });
});

describe("EventTypesWorkspace", () => {
  afterEach(() => vi.clearAllMocks());

  it("loads the taxonomy tree and shows the Event Taxonomy heading with a tree and inspector", async () => {
    vi.mocked(eventsApi.listEventTaxonomy).mockResolvedValue(buildTree());

    render(<EventTypesWorkspace />);

    expect(await screen.findByRole("heading", { level: 1, name: "Event Taxonomy" })).toBeVisible();
    expect(screen.getByLabelText("Event taxonomy tree")).toBeVisible();
    expect(screen.getByRole("button", { name: "Edit Security Statement / Threat" })).toBeVisible();
  });

  it("shows an error when the taxonomy cannot be loaded", async () => {
    vi.mocked(eventsApi.listEventTaxonomy).mockRejectedValue(new Error("offline"));

    render(<EventTypesWorkspace />);

    expect(await screen.findByText(/unable to load the event taxonomy/i)).toBeVisible();
  });
});
