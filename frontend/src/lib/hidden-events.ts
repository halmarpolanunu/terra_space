"use client";

import { useSyncExternalStore } from "react";

/**
 * Browser-only "hide this event" preference (see
 * decisions/Automatic-Event-Visibility-With-Manual-Filtering.md). This intentionally never talks
 * to the backend or Supabase — it is a personal, per-browser preference, like
 * appearance-settings.ts, so it resets if the owner clears this browser's storage or opens Terra
 * Space in a different browser. Once the Terra Space Supabase Application Transition Plan adds
 * real edit/reject/archive authority, this should be replaced by that plan's real reject/archive
 * action instead of kept alongside it.
 */

const STORAGE_KEY = "terra-space:hidden-events";
const CHANGE_EVENT = "terra-space:hidden-events-change";

// useSyncExternalStore requires getSnapshot to return a stable (===) result when nothing has
// changed, or React re-renders forever (same reason as appearance-settings.ts). Cache by the raw
// stored string so unrelated re-renders don't allocate a new array.
let cachedRaw: string | null | undefined;
let cachedIds: string[] = [];

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (raw === cachedRaw) return cachedIds;
  cachedRaw = raw;
  if (!raw) {
    cachedIds = [];
    return cachedIds;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    cachedIds = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    cachedIds = [];
  }
  return cachedIds;
}

function persist(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable (private browsing, quota) — the hide action simply won't persist.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getHiddenEventIds(): string[] {
  return readIds();
}

export function isEventHidden(id: string): boolean {
  return readIds().includes(id);
}

export function hideEvent(id: string): void {
  const ids = readIds();
  if (ids.includes(id)) return;
  persist([...ids, id]);
}

export function unhideEvent(id: string): void {
  const ids = readIds();
  if (!ids.includes(id)) return;
  persist(ids.filter((existing) => existing !== id));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getServerSnapshot(): string[] {
  return [];
}

/** Live list of hidden event IDs; re-renders the caller when a hide/unhide happens anywhere. */
export function useHiddenEventIds(): string[] {
  return useSyncExternalStore(subscribe, getHiddenEventIds, getServerSnapshot);
}
