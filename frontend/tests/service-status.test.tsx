import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ServiceStatus } from "@/components/service-status";

describe("ServiceStatus", () => {
  it("shows labeled offline and missing states without relying on color alone", () => {
    render(
      <ServiceStatus
        health={{ app: "available", storage: "available", map: "missing", lm_studio: "offline" }}
      />,
    );

    expect(screen.getByText("LM Studio", { exact: true })).toBeVisible();
    expect(screen.getByText("Offline", { exact: true })).toBeVisible();
    expect(screen.getByText("Map missing", { exact: true })).toBeVisible();
  });

  it("reports an unreachable backend in words", () => {
    render(<ServiceStatus error="Terra Space backend is unavailable." />);

    expect(screen.getByText("Backend unavailable", { exact: true })).toBeVisible();
  });

  it("does not report an LM Studio health-check error as online", () => {
    render(
      <ServiceStatus
        health={{ app: "available", storage: "available", map: "available", lm_studio: "error" }}
      />,
    );

    expect(screen.getByText("Error", { exact: true })).toBeVisible();
    expect(screen.queryByText("Online", { exact: true })).not.toBeInTheDocument();
  });
});
