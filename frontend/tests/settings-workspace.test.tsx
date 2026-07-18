import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/settings-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settings-api")>("@/lib/settings-api");
  return { ...actual, getSettings: vi.fn() };
});

vi.mock("@/lib/events-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/events-api")>("@/lib/events-api");
  return { ...actual, listEventTypes: vi.fn() };
});

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, getHealth: vi.fn().mockResolvedValue({ app: "available", storage: "available", map: "available", lm_studio: "offline" }) };
});

import { SettingsWorkspace } from "@/app/settings/settings-workspace";
import * as settingsApi from "@/lib/settings-api";

const SETTINGS = {
  lm_studio_base_url: "http://host.docker.internal:1234",
  lm_studio_model: null,
  lm_studio_extraction_timeout_seconds: 300,
};

describe("SettingsWorkspace", () => {
  afterEach(() => vi.clearAllMocks());

  it("keeps a single Settings heading while loading", () => {
    vi.mocked(settingsApi.getSettings).mockReturnValue(new Promise(() => {}));

    render(<SettingsWorkspace />);

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    expect(screen.getByText(/loading settings/i)).toBeVisible();
  });

  it("shows LM Studio settings and links Event Types to Terra Sense", async () => {
    vi.mocked(settingsApi.getSettings).mockResolvedValue(SETTINGS);

    render(<SettingsWorkspace />);

    expect(await screen.findByLabelText(/base url/i)).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "LM Studio connection" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Event types" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /manage event types in terra sense/i })).toHaveAttribute(
      "href",
      "/sense/event-types",
    );
  });

  it("keeps the heading and shows an error when loading fails", async () => {
    vi.mocked(settingsApi.getSettings).mockRejectedValue(new Error("backend down"));

    render(<SettingsWorkspace />);

    expect(await screen.findByText(/unable to load settings/i)).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  });
});
