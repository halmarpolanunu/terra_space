import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getHiddenEventIds, hideEvent, isEventHidden, unhideEvent } from "@/lib/hidden-events";

const STORAGE_KEY = "terra-space:hidden-events";

describe("hidden-events store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns nothing hidden when nothing is stored", () => {
    expect(getHiddenEventIds()).toEqual([]);
    expect(isEventHidden("event-1")).toBe(false);
  });

  it("hides an event and persists it to localStorage", () => {
    hideEvent("event-1");

    expect(getHiddenEventIds()).toEqual(["event-1"]);
    expect(isEventHidden("event-1")).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(["event-1"]);
  });

  it("hiding the same event twice is a no-op, not a duplicate", () => {
    hideEvent("event-1");
    hideEvent("event-1");

    expect(getHiddenEventIds()).toEqual(["event-1"]);
  });

  it("unhides an event", () => {
    hideEvent("event-1");
    hideEvent("event-2");

    unhideEvent("event-1");

    expect(getHiddenEventIds()).toEqual(["event-2"]);
    expect(isEventHidden("event-1")).toBe(false);
  });

  it("unhiding an event that was never hidden is a no-op", () => {
    hideEvent("event-1");

    unhideEvent("does-not-exist");

    expect(getHiddenEventIds()).toEqual(["event-1"]);
  });

  it("falls back to nothing hidden for corrupted stored JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    expect(getHiddenEventIds()).toEqual([]);
  });

  it("ignores non-array or non-string garbage instead of throwing", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: "an array" }));
    expect(getHiddenEventIds()).toEqual([]);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["event-1", 42, null]));
    expect(getHiddenEventIds()).toEqual(["event-1"]);
  });
});
