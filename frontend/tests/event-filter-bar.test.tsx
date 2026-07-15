import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EventFilterBar } from "@/components/event-filter-bar";
import {
  emptyEventFilters,
  hasActiveEventFilters,
  parseEventFilters,
  toEventFilterSearch,
} from "@/lib/event-filters";
import { getDashboardSummary, listEvents } from "@/lib/events-api";

describe("event filter URL state", () => {
  it("parses a copied Dashboard query and serializes it in canonical order", () => {
    const filters = parseEventFilters(
      "?sort=date_asc&city_regency=Gaza&q=river+crossing&actor_id=actor-1&date_from=2026-01-01",
    );

    expect(filters).toMatchObject({
      q: "river crossing",
      date_from: "2026-01-01",
      actor_id: "actor-1",
      city_regency: "Gaza",
      sort: "date_asc",
    });
    expect(toEventFilterSearch(filters)).toBe(
      "q=river+crossing&date_from=2026-01-01&actor_id=actor-1&city_regency=Gaza&sort=date_asc",
    );
  });

  it("removes only the cleared filter value", () => {
    const filters = parseEventFilters("?q=checkpoint&actor_id=actor-1&sort=date_desc");

    expect(toEventFilterSearch({ ...filters, q: "" })).toBe(
      "actor_id=actor-1&sort=date_desc",
    );
  });

  it("uses the shared serializer for events and Dashboard summary requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);
    const filters = { ...emptyEventFilters(), q: "bridge crossing", sort: "title_asc" };

    await listEvents(filters);
    await getDashboardSummary(filters);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/backend/api/events?q=bridge+crossing&sort=title_asc&review_status=approved",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/backend/api/events/dashboard-summary?q=bridge+crossing&sort=title_asc",
    );
    vi.unstubAllGlobals();
  });

  it("does not treat sort order alone as a filter that excluded empty results", () => {
    expect(
      hasActiveEventFilters({ ...emptyEventFilters(), sort: "title_asc" }),
    ).toBe(false);
    expect(
      hasActiveEventFilters({ ...emptyEventFilters(), q: "bridge", sort: "title_asc" }),
    ).toBe(true);
  });
});

describe("EventFilterBar", () => {
  it("can reveal advanced controls immediately when mounted inside a dedicated filters drawer", () => {
    render(
      <EventFilterBar
        actorOptions={[]}
        documentOptions={[]}
        eventTypeOptions={[]}
        initiallyExpanded
        onChange={vi.fn()}
        value={emptyEventFilters()}
      />,
    );

    expect(screen.getByRole("button", { name: "Hide filters" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByLabelText("Country")).toBeVisible();
  });

  it("labels every shared Roadmap filter and only shows Clear filters when active", () => {
    const { rerender } = render(
      <EventFilterBar
        actorOptions={[]}
        documentOptions={[]}
        eventTypeOptions={[]}
        onChange={vi.fn()}
        value={emptyEventFilters()}
      />,
    );

    expect(screen.getByLabelText("Search title & summary")).toBeVisible();
    const disclosure = screen.getByRole("button", { name: /^filters/i });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("combobox", { name: "Event type" })).not.toBeInTheDocument();

    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "true");

    [
      "Search title & summary",
      "Start date",
      "End date",
      "Event type",
      "Epistemic status",
      "Actor",
      "Country",
      "Province or state",
      "City or regency",
      "Source document",
    ].forEach((label) => expect(screen.getByLabelText(label)).toBeInTheDocument());
    expect(screen.getByLabelText("Country")).toHaveAttribute("placeholder", "Any country");
    expect(screen.getByLabelText("Province or state")).toHaveAttribute(
      "placeholder",
      "Any province or state",
    );
    expect(screen.getByLabelText("City or regency")).toHaveAttribute(
      "placeholder",
      "Any city or regency",
    );
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();

    rerender(
      <EventFilterBar
        actorOptions={[]}
        documentOptions={[]}
        eventTypeOptions={[]}
        onChange={vi.fn()}
        value={{ ...emptyEventFilters(), country: "Sudan" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
    expect(screen.getByText("1 active")).toBeVisible();
  });

  it("keeps advanced values when the compact filter disclosure closes and reopens", () => {
    render(
      <EventFilterBar
        actorOptions={[]}
        documentOptions={[]}
        eventTypeOptions={[]}
        onChange={vi.fn()}
        value={{ ...emptyEventFilters(), country: "Indonesia" }}
      />,
    );

    const disclosure = screen.getByRole("button", { name: /^filters/i });
    fireEvent.click(disclosure);
    expect(screen.getByLabelText("Country")).toHaveValue("Indonesia");
    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(disclosure);
    expect(screen.getByLabelText("Country")).toHaveValue("Indonesia");
  });

  it("clears filter values without changing the separate sort choice", () => {
    const onChange = vi.fn();
    render(
      <EventFilterBar
        actorOptions={[]}
        documentOptions={[]}
        eventTypeOptions={[]}
        onChange={onChange}
        value={{ ...emptyEventFilters(), country: "Indonesia", sort: "title_asc" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onChange).toHaveBeenCalledWith({
      ...emptyEventFilters(),
      sort: "title_asc",
    });
  });

  it("emits the complete next filter object for every control change", () => {
    const onChange = vi.fn();
    render(
      <EventFilterBar
        actorOptions={[{ id: "actor-1", name: "River Watch", is_active: true }]}
        documentOptions={[{ id: "doc-1", title: "Field report" }]}
        eventTypeOptions={[{ id: "type-1", name: "Attack", is_active: true }]}
        onChange={onChange}
        value={{ ...emptyEventFilters(), actor_id: "actor-1", country: "Sudan" }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Event type"), { target: { value: "type-1" } });

    expect(onChange).toHaveBeenCalledWith({
      ...emptyEventFilters(),
      actor_id: "actor-1",
      country: "Sudan",
      event_type_id: "type-1",
    });
  });
});
