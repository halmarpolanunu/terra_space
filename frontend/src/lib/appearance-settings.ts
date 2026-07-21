"use client";

import { useSyncExternalStore } from "react";

/**
 * Per-device workspace appearance (background blur + ambient motion). This is
 * a cosmetic, single-device preference, so it lives in localStorage rather
 * than the backend database — no migration, no server round-trip, and it
 * still works fully offline.
 */
export type AppearanceSettings = {
  blurPx: number;
  motionEnabled: boolean;
  motionIntensity: number;
  driftSpeed: number;
  scanStrength: number;
};

// These defaults match the values tuned live with the owner on 2026-07-21.
export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  blurPx: 1,
  motionEnabled: true,
  motionIntensity: 1.5,
  driftSpeed: 2,
  scanStrength: 1.1,
};

const STORAGE_KEY = "terra-space:appearance-settings";
const CHANGE_EVENT = "terra-space:appearance-settings-change";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitize(raw: Partial<AppearanceSettings> | null | undefined): AppearanceSettings {
  const source = raw ?? {};
  return {
    blurPx: clamp(
      Number.isFinite(source.blurPx) ? (source.blurPx as number) : DEFAULT_APPEARANCE_SETTINGS.blurPx,
      0,
      8,
    ),
    motionEnabled:
      typeof source.motionEnabled === "boolean"
        ? source.motionEnabled
        : DEFAULT_APPEARANCE_SETTINGS.motionEnabled,
    motionIntensity: clamp(
      Number.isFinite(source.motionIntensity)
        ? (source.motionIntensity as number)
        : DEFAULT_APPEARANCE_SETTINGS.motionIntensity,
      0,
      2,
    ),
    driftSpeed: clamp(
      Number.isFinite(source.driftSpeed) ? (source.driftSpeed as number) : DEFAULT_APPEARANCE_SETTINGS.driftSpeed,
      0,
      2.5,
    ),
    scanStrength: clamp(
      Number.isFinite(source.scanStrength)
        ? (source.scanStrength as number)
        : DEFAULT_APPEARANCE_SETTINGS.scanStrength,
      0,
      1.5,
    ),
  };
}

// useSyncExternalStore requires getSnapshot to return a stable (===) result
// when nothing has changed, or React re-renders forever. Cache by the raw
// stored string so unrelated re-renders don't allocate a new object.
let cachedRaw: string | null | undefined;
let cachedValue: AppearanceSettings = DEFAULT_APPEARANCE_SETTINGS;

export function getAppearanceSettings(): AppearanceSettings {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE_SETTINGS;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT_APPEARANCE_SETTINGS;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  if (!raw) {
    cachedValue = DEFAULT_APPEARANCE_SETTINGS;
    return cachedValue;
  }
  try {
    cachedValue = sanitize(JSON.parse(raw) as Partial<AppearanceSettings>);
  } catch {
    cachedValue = DEFAULT_APPEARANCE_SETTINGS;
  }
  return cachedValue;
}

function persist(next: AppearanceSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private browsing, quota) — the setting simply
    // won't survive a reload; nothing else in the app depends on it.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function setAppearanceSettings(patch: Partial<AppearanceSettings>): AppearanceSettings {
  const next = sanitize({ ...getAppearanceSettings(), ...patch });
  persist(next);
  return next;
}

export function resetAppearanceSettings(): AppearanceSettings {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
  return DEFAULT_APPEARANCE_SETTINGS;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getServerSnapshot() {
  return DEFAULT_APPEARANCE_SETTINGS;
}

export function useAppearanceSettings(): AppearanceSettings {
  return useSyncExternalStore(subscribe, getAppearanceSettings, getServerSnapshot);
}
