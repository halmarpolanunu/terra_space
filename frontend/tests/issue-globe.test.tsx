import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { IssueAtlasPlace } from "@/lib/issue-atlas-model";

const { worldMapProps } = vi.hoisted(() => ({ worldMapProps: vi.fn() }));
vi.mock("@/components/world-map", () => ({ WorldMap: (props: unknown) => { worldMapProps(props); return <div role="img" aria-label="Interactive globe" />; } }));

import { IssueGlobe, buildIssueGlobeData } from "@/app/home/issue-globe";

const places: IssueAtlasPlace[] = [
  { id: "a:one", issueSourceId: "a", issueLabel: "Issue A", placeLabel: "Shared place", latitude: 1, longitude: 2, countryIso3: "ARG" },
  { id: "a:two", issueSourceId: "a", issueLabel: "Issue A", placeLabel: "Second place", latitude: 3, longitude: 4, countryIso3: "URY" },
  { id: "b:one", issueSourceId: "b", issueLabel: "Issue B", placeLabel: "Shared place", latitude: 1, longitude: 2, countryIso3: "ARG" },
];

describe("IssueGlobe", () => {
  it("keeps both Issues at a shared coordinate and highlights every selected-Issue place", () => {
    const data = buildIssueGlobeData(places);
    expect(data.pins.features).toHaveLength(1);
    expect(data.clusters).toHaveLength(1);
    expect(data.clusters[0].eventIds).toEqual(["a:one", "b:one"]);
    const onSelectIssue = vi.fn();
    const onSelectSharedPlace = vi.fn();
    render(<IssueGlobe places={places} selectedIssueSourceId="a" onSelectIssue={onSelectIssue} onSelectSharedPlace={onSelectSharedPlace} />);
    const props = worldMapProps.mock.lastCall?.[0];
    expect(props.selectedPinIds).toEqual(["a:one", "a:two"]);
    props.onClusterSelect(data.clusters[0]);
    expect(onSelectSharedPlace).toHaveBeenCalledWith("Shared place", [places[0], places[2]]);
    props.onFeatureSelect("a:two");
    expect(onSelectIssue).toHaveBeenCalledWith("a");
    fireEvent.click(screen.getByRole("button", { name: /Issue B.*Shared place/i }));
    expect(onSelectIssue).toHaveBeenCalledWith("b");
  });
});
