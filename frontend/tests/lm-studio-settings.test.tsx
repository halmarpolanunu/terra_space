import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/settings-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settings-api")>("@/lib/settings-api");
  return { ...actual, updateSettings: vi.fn(), testLmStudio: vi.fn() };
});

import { LmStudioSettings } from "@/app/settings/lm-studio-settings";
import * as settingsApi from "@/lib/settings-api";

const SETTINGS = {
  lm_studio_base_url: "http://host.docker.internal:1234",
  lm_studio_model: null,
  lm_studio_extraction_timeout_seconds: 300,
};

describe("LmStudioSettings", () => {
  afterEach(() => vi.clearAllMocks());

  it("loads the current base URL and model from its props", () => {
    render(<LmStudioSettings settings={{ ...SETTINGS, lm_studio_model: "saved-model" }} />);

    expect(screen.getByLabelText(/base url/i)).toHaveValue("http://host.docker.internal:1234");
    expect(screen.getByLabelText(/^model$/i)).toHaveValue("saved-model");
    expect(screen.getByLabelText(/timeout per ai call/i)).toHaveValue("300");
  });

  it("groups the connection test with the URL it checks", () => {
    render(<LmStudioSettings settings={SETTINGS} />);

    const row = screen.getByLabelText(/base url/i).closest(".settings-connection-row");
    expect(row).not.toBeNull();
    expect(within(row!).getByRole("button", { name: /test connection/i })).toBeVisible();
  });

  it("tests the connection and shows the returned models", async () => {
    vi.mocked(settingsApi.testLmStudio).mockResolvedValue({
      reachable: true,
      models: ["model-a", "model-b"],
      message: "Connected. 2 model(s) available.",
    });
    render(<LmStudioSettings settings={SETTINGS} />);

    fireEvent.click(screen.getByRole("button", { name: /test connection/i }));

    const message = await screen.findByText("Connected. 2 model(s) available.");
    expect(message).toBeVisible();
    expect(message.closest(".settings-status")).toHaveAttribute(
      "data-motion-item",
      "connection-status",
    );
    const model = screen.getByLabelText(/^model$/i);
    expect(within(model).getByRole("option", { name: "model-a" })).toBeInTheDocument();
    expect(within(model).getByRole("option", { name: "model-b" })).toBeInTheDocument();
  });

  it("saves the chosen model", async () => {
    vi.mocked(settingsApi.testLmStudio).mockResolvedValue({
      reachable: true,
      models: ["model-a", "model-b"],
      message: "Connected. 2 model(s) available.",
    });
    vi.mocked(settingsApi.updateSettings).mockResolvedValue({ ...SETTINGS, lm_studio_model: "model-b" });
    render(<LmStudioSettings settings={SETTINGS} />);

    fireEvent.click(screen.getByRole("button", { name: /test connection/i }));
    await screen.findByText("Connected. 2 model(s) available.");
    fireEvent.change(screen.getByLabelText(/^model$/i), { target: { value: "model-b" } });
    fireEvent.click(screen.getByRole("button", { name: /^save/i }));

    await waitFor(() =>
      expect(settingsApi.updateSettings).toHaveBeenCalledWith({
        lm_studio_base_url: "http://host.docker.internal:1234",
        lm_studio_model: "model-b",
        lm_studio_extraction_timeout_seconds: 300,
      }),
    );
    expect(await screen.findByRole("status")).toHaveAttribute("data-motion-item", "save-status");
  });

  it("saves the selected ten-minute timeout", async () => {
    vi.mocked(settingsApi.updateSettings).mockResolvedValue({
      ...SETTINGS,
      lm_studio_extraction_timeout_seconds: 600,
    });
    render(<LmStudioSettings settings={SETTINGS} />);

    fireEvent.change(screen.getByLabelText(/timeout per ai call/i), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: /^save/i }));

    await waitFor(() =>
      expect(settingsApi.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ lm_studio_extraction_timeout_seconds: 600 }),
      ),
    );
  });

  it("saves a null model when Auto-detect is chosen", async () => {
    vi.mocked(settingsApi.updateSettings).mockResolvedValue(SETTINGS);
    render(<LmStudioSettings settings={{ ...SETTINGS, lm_studio_model: "saved-model" }} />);

    fireEvent.change(screen.getByLabelText(/^model$/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /^save/i }));

    await waitFor(() =>
      expect(settingsApi.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ lm_studio_model: null }),
      ),
    );
  });

  it("still lets the user save when the connection test reports offline", async () => {
    vi.mocked(settingsApi.testLmStudio).mockResolvedValue({
      reachable: false,
      models: [],
      message: "LM Studio is offline or unreachable.",
    });
    vi.mocked(settingsApi.updateSettings).mockResolvedValue(SETTINGS);
    render(<LmStudioSettings settings={SETTINGS} />);

    fireEvent.click(screen.getByRole("button", { name: /test connection/i }));
    expect(await screen.findByText("LM Studio is offline or unreachable.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /^save/i }));
    await waitFor(() => expect(settingsApi.updateSettings).toHaveBeenCalled());
  });
});
