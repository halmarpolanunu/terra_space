import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppearanceSettings } from "@/app/settings/appearance-settings";
import { DEFAULT_APPEARANCE_SETTINGS } from "@/lib/appearance-settings";

describe("AppearanceSettings panel", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows the tuned defaults on first render", () => {
    render(<AppearanceSettings />);

    expect(screen.getByLabelText(/background blur/i)).toHaveValue(
      String(DEFAULT_APPEARANCE_SETTINGS.blurPx),
    );
    expect(screen.getByRole("checkbox", { name: /background motion/i })).toBeChecked();
    expect(screen.getByLabelText(/motion intensity/i)).toHaveValue("150");
    expect(screen.getByLabelText(/drift speed/i)).toHaveValue("2");
    expect(screen.getByLabelText(/scan band/i)).toHaveValue("110");
  });

  it("moving the blur slider updates the shown value and persists it", () => {
    render(<AppearanceSettings />);

    fireEvent.change(screen.getByLabelText(/background blur/i), { target: { value: "5" } });

    expect(screen.getByText("5px")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("terra-space:appearance-settings")!).blurPx).toBe(
      5,
    );
  });

  it("turning motion off disables the motion-only sliders but not blur", () => {
    render(<AppearanceSettings />);

    fireEvent.click(screen.getByRole("checkbox", { name: /background motion/i }));

    expect(screen.getByLabelText(/motion intensity/i)).toBeDisabled();
    expect(screen.getByLabelText(/drift speed/i)).toBeDisabled();
    expect(screen.getByLabelText(/scan band/i)).toBeDisabled();
    expect(screen.getByLabelText(/background blur/i)).toBeEnabled();
  });

  it("reset button is disabled at defaults and restores defaults after a change", () => {
    render(<AppearanceSettings />);

    const resetButton = screen.getByRole("button", { name: /reset to defaults/i });
    expect(resetButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/background blur/i), { target: { value: "6" } });
    expect(resetButton).toBeEnabled();

    fireEvent.click(resetButton);
    expect(screen.getByLabelText(/background blur/i)).toHaveValue(
      String(DEFAULT_APPEARANCE_SETTINGS.blurPx),
    );
    expect(resetButton).toBeDisabled();
  });
});
