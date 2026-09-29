import { Suspense } from "react";
import { HomeWorkspace } from "./home-workspace";

export default function HomePage() {
  return <Suspense fallback={<p>Loading Home…</p>}><HomeWorkspace /></Suspense>;
}
