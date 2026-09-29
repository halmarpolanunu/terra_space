import { Suspense } from "react";
import { ExploreWorkspace } from "./explore-workspace";

export default function ExplorePage() {
  return <Suspense fallback={<p>Loading Explore…</p>}><ExploreWorkspace /></Suspense>;
}
