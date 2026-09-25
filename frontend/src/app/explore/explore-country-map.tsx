"use client";

import { WorldMap } from "@/components/world-map";
import type { ExploreCountry } from "@/lib/explore-country-model";

type Props = {
  countries: ExploreCountry[];
  selectedCode: string | null;
  onSelectCountry: (code: string) => void;
};

export function ExploreCountryMap({ countries, selectedCode, onSelectCountry }: Props) {
  const selected = countries.find((country) => country.code === selectedCode);
  return <WorldMap autoRotate={false} initialZoom={1.5} focusCoordinates={selected?.anchor}
    clusters={countries.map((country) => ({
      coordinates: country.anchor,
      count: country.issueCount,
      eventIds: [country.code],
      locationLabel: country.name,
      ariaLabel: `${country.issueCount} Main Issues with verified related event locations in ${country.name}`,
      selected: country.code === selectedCode,
    }))}
    onClusterSelect={(marker) => onSelectCountry(marker.eventIds[0])} />;
}
