import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ServiceStatus } from "@/components/service-status";

describe("ServiceStatus", () => {
  it("explains how to recover when LM Studio is offline", () => {
    render(
      <ServiceStatus
        health={{ app: "available", storage: "available", map: "missing", lm_studio: "offline" }}
      />,
    );

    expect(screen.getByText("LM Studio is offline. Check Settings and try again.")).toBeVisible();
    expect(screen.getByText("Map package is not installed.")).toBeVisible();
  });

  it("reports an unreachable backend in words", () => {
    render(<ServiceStatus error="Terra Space backend is unavailable." />);

    expect(screen.getByText("Terra Space backend is unavailable.")).toBeVisible();
  });
});
