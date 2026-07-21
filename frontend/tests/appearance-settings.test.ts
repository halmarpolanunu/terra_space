import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_APPEARANCE_SETTINGS,
  getAppearanceSettings,
  resetAppearanceSettings,
  setAppearanceSettings,
} from "@/lib/appearance-settings";

const STORAGE_KEY = "terra-space:appearance-settings";

describe("appearance-settings store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns the tuned defaults when nothing is stored", () => {
    expect(getAppearanceSettings()).toEqual(DEFAULT_APPEARANCE_SETTINGS);
  });

  it("persists a patch to localStorage and returns the merged result", () => {
    const next = setAppearanceSettings({ blurPx: 4, motionEnabled: false });

    expect(next).toEqual({ ...DEFAULT_APPEARANCE_SETTINGS, blurPx: 4, motionEnabled: false });
    expect(getAppearanceSettings()).toEqual(next);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(next);
  });

  it("clamps out-of-range values instead of storing them verbatim", () => {
    const next = setAppearanceSettings({
      blurPx: 999,
      motionIntensity: -5,
      driftSpeed: 100,
      scanStrength: -1,
    });

    expect(next.blurPx).toBe(8);
    expect(next.motionIntensity).toBe(0);
    expect(next.driftSpeed).toBe(2.5);
    expect(next.scanStrength).toBe(0);
  });

  it("falls back to defaults for corrupted stored JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    expect(getAppearanceSettings()).toEqual(DEFAULT_APPEARANCE_SETTINGS);
  });

  it("ignores unknown/garbage fields via sanitize rather than storing them", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ blurPx: "not-a-number", motionEnabled: "yes" }),
    );

    expect(getAppearanceSettings()).toEqual(DEFAULT_APPEARANCE_SETTINGS);
  });

  it("resets to defaults and clears storage", () => {
    setAppearanceSettings({ blurPx: 6 });
    const reset = resetAppearanceSettings();

    expect(reset).toEqual(DEFAULT_APPEARANCE_SETTINGS);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getAppearanceSettings()).toEqual(DEFAULT_APPEARANCE_SETTINGS);
  });

  it("returns the same object reference when the stored value has not changed", () => {
    setAppearanceSettings({ blurPx: 2 });
    const first = getAppearanceSettings();
    const second = getAppearanceSettings();

    expect(first).toBe(second);
  });
});
