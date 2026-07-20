import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actors-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/actors-api")>("@/lib/actors-api");
  return {
    ...actual,
    listActorManagement: vi.fn(),
    updateActorManagement: vi.fn(),
    deleteActorManagement: vi.fn(),
    addActorAlias: vi.fn(),
    removeActorAlias: vi.fn(),
  };
});

import { ActorsWorkspace } from "@/app/sense/actors-workspace";
import * as actorsApi from "@/lib/actors-api";
import type { ActorManagementRead } from "@/lib/actors-api";

function buildActors(): ActorManagementRead[] {
  return [
    {
      id: "actor-1",
      name: "United States",
      is_active: true,
      in_use: true,
      aliases: [{ id: "alias-1", alias: "US" }],
    },
    {
      id: "actor-2",
      name: "Suggested Group",
      is_active: false,
      in_use: false,
      aliases: [],
    },
  ];
}

describe("ActorsWorkspace", () => {
  afterEach(() => vi.clearAllMocks());

  it("loads actors and shows the Actors heading with a list and inspector", async () => {
    vi.mocked(actorsApi.listActorManagement).mockResolvedValue(buildActors());

    render(<ActorsWorkspace />);

    expect(await screen.findByRole("heading", { level: 1, name: "Actors" })).toBeVisible();
    expect(screen.getByLabelText("Actors list")).toBeVisible();
    expect(screen.getByRole("heading", { name: "United States" })).toBeVisible();
  });

  it("shows an error when actors cannot be loaded", async () => {
    vi.mocked(actorsApi.listActorManagement).mockRejectedValue(new Error("offline"));

    render(<ActorsWorkspace />);

    expect(await screen.findByText(/unable to load actors/i)).toBeVisible();
  });

  it("selects a different actor from the list and updates the inspector", async () => {
    vi.mocked(actorsApi.listActorManagement).mockResolvedValue(buildActors());
    render(<ActorsWorkspace />);
    await screen.findByRole("heading", { name: "United States" });

    fireEvent.click(screen.getByText("Suggested Group"));

    expect(screen.getByRole("heading", { name: "Suggested Group" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "United States" })).not.toBeInTheDocument();
  });

  it("searches by name or alias", async () => {
    vi.mocked(actorsApi.listActorManagement).mockResolvedValue(buildActors());
    render(<ActorsWorkspace />);
    await screen.findByRole("heading", { name: "United States" });

    fireEvent.change(screen.getByLabelText("Search actors"), { target: { value: "US" } });

    const list = within(screen.getByLabelText("Actors list"));
    expect(list.getByText("United States")).toBeVisible();
    expect(list.queryByText("Suggested Group")).not.toBeInTheDocument();
  });

  it("hides the name field until Edit is clicked, then saves the new name", async () => {
    const actors = buildActors();
    vi.mocked(actorsApi.listActorManagement).mockResolvedValue(actors);
    const renamed = { ...actors[0], name: "USA" };
    vi.mocked(actorsApi.updateActorManagement).mockResolvedValue(renamed);
    render(<ActorsWorkspace />);
    await screen.findByRole("heading", { name: "United States" });

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit United States" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "USA" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(actorsApi.updateActorManagement).toHaveBeenCalledWith("actor-1", { name: "USA" }),
    );
  });

  it("activates an inactive actor immediately, without confirmation", async () => {
    const actors = buildActors();
    vi.mocked(actorsApi.listActorManagement).mockResolvedValue(actors);
    vi.mocked(actorsApi.updateActorManagement).mockResolvedValue({
      ...actors[1],
      is_active: true,
    });
    render(<ActorsWorkspace />);
    await screen.findByRole("heading", { name: "United States" });
    fireEvent.click(screen.getByText("Suggested Group"));

    fireEvent.click(screen.getByLabelText("Active: Suggested Group"));

    await waitFor(() =>
      expect(actorsApi.updateActorManagement).toHaveBeenCalledWith("actor-2", {
        is_active: true,
      }),
    );
  });

  it("requires confirmation before deactivating an active actor", async () => {
    const actors = buildActors();
    vi.mocked(actorsApi.listActorManagement).mockResolvedValue(actors);
    vi.mocked(actorsApi.updateActorManagement).mockResolvedValue({
      ...actors[0],
      is_active: false,
    });
    render(<ActorsWorkspace />);
    await screen.findByRole("heading", { name: "United States" });

    fireEvent.click(screen.getByLabelText("Active: United States"));
    expect(screen.getByText(/deactivate united states\?/i)).toBeVisible();
    expect(actorsApi.updateActorManagement).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm deactivate" }));

    await waitFor(() =>
      expect(actorsApi.updateActorManagement).toHaveBeenCalledWith("actor-1", {
        is_active: false,
      }),
    );
  });

  it("adds a new alias", async () => {
    const actors = buildActors();
    vi.mocked(actorsApi.listActorManagement).mockResolvedValue(actors);
    vi.mocked(actorsApi.addActorAlias).mockResolvedValue({ id: "alias-2", alias: "U.S." });
    render(<ActorsWorkspace />);
    await screen.findByRole("heading", { name: "United States" });

    fireEvent.change(screen.getByLabelText("New alias"), { target: { value: "U.S." } });
    fireEvent.click(screen.getByRole("button", { name: "Add alias" }));

    await waitFor(() =>
      expect(actorsApi.addActorAlias).toHaveBeenCalledWith("actor-1", "U.S."),
    );
  });

  it("removes an alias only after confirmation", async () => {
    const actors = buildActors();
    vi.mocked(actorsApi.listActorManagement).mockResolvedValue(actors);
    vi.mocked(actorsApi.removeActorAlias).mockResolvedValue(undefined);
    render(<ActorsWorkspace />);
    await screen.findByRole("heading", { name: "United States" });

    fireEvent.click(screen.getByRole("button", { name: "Remove alias US" }));
    expect(screen.getByRole("button", { name: "Confirm remove" })).toBeVisible();
    expect(actorsApi.removeActorAlias).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm remove" }));

    await waitFor(() =>
      expect(actorsApi.removeActorAlias).toHaveBeenCalledWith("actor-1", "alias-1"),
    );
  });

  it("hides Delete for an in-use actor", async () => {
    vi.mocked(actorsApi.listActorManagement).mockResolvedValue(buildActors());
    render(<ActorsWorkspace />);
    await screen.findByRole("heading", { name: "United States" });

    expect(
      screen.queryByRole("button", { name: "Delete United States" }),
    ).not.toBeInTheDocument();
  });

  it("deletes an unused actor only after confirmation", async () => {
    const actors = buildActors();
    vi.mocked(actorsApi.listActorManagement).mockResolvedValue(actors);
    vi.mocked(actorsApi.deleteActorManagement).mockResolvedValue(undefined);
    render(<ActorsWorkspace />);
    await screen.findByRole("heading", { name: "United States" });
    fireEvent.click(screen.getByText("Suggested Group"));

    fireEvent.click(screen.getByRole("button", { name: "Delete Suggested Group" }));
    expect(screen.getByText(/delete suggested group\? this cannot be undone\./i)).toBeVisible();
    expect(actorsApi.deleteActorManagement).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => expect(actorsApi.deleteActorManagement).toHaveBeenCalledWith("actor-2"));
  });
});
