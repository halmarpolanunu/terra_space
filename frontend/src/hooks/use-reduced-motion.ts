"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onPreferenceChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  const updatePreference = () => onPreferenceChange();

  mediaQuery.addEventListener("change", updatePreference);
  return () => mediaQuery.removeEventListener("change", updatePreference);
}

function getReducedMotionSnapshot() {
  return typeof window.matchMedia === "function"
    ? window.matchMedia(REDUCED_MOTION_QUERY).matches
    : false;
}

function getServerReducedMotionSnapshot() {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
}
