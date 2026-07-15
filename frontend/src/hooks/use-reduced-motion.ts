"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onPreferenceChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  const updatePreference = () => onPreferenceChange();

  mediaQuery.addEventListener("change", updatePreference);
  return () => mediaQuery.removeEventListener("change", updatePreference);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
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
