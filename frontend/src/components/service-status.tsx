"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getHealth, type HealthResponse } from "@/lib/api";

type ServiceStatusProps = {
  health?: HealthResponse;
  error?: string;
};

export function ServiceStatus({ health, error }: ServiceStatusProps) {
  if (error) {
    return (
      <span className="service-readout" data-state="error" role="alert" title={error}>
        <span className="service-dot" aria-hidden="true" />
        <span>Backend unavailable</span>
      </span>
    );
  }
  if (!health) {
    return (
      <span className="service-readout" data-state="checking">
        <span>LM Studio</span>
        <span className="service-dot" aria-hidden="true" />
        <span>Checking</span>
      </span>
    );
  }
  const lmStudioLabel =
    health.lm_studio === "offline"
      ? "Offline"
      : health.lm_studio === "error"
        ? "Error"
        : "Unavailable";
  return (
    <div aria-live="polite" className="service-readouts">
      {health.lm_studio !== "available" ? (
        <Link
          aria-label={`LM Studio ${lmStudioLabel.toLowerCase()}. Open Settings`}
          className="service-readout service-readout-link"
          data-state={health.lm_studio === "offline" ? "offline" : "error"}
          href="/settings"
        >
          <span>LM Studio</span>
          <span className="service-dot" aria-hidden="true" />
          <span>{lmStudioLabel}</span>
        </Link>
      ) : (
        <span className="service-readout" data-state="available">
          <span>LM Studio</span>
          <span className="service-dot" aria-hidden="true" />
          <span>Online</span>
        </span>
      )}
      {health.map === "missing" && (
        <span className="service-readout" data-state="warning">
          <span className="service-dot" aria-hidden="true" />
          <span>Map missing</span>
        </span>
      )}
      {health.storage === "error" && (
        <span className="service-readout" data-state="error">
          <span className="service-dot" aria-hidden="true" />
          <span>Storage error</span>
        </span>
      )}
    </div>
  );
}

export function ServiceStatusPanel() {
  const [health, setHealth] = useState<HealthResponse>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setError("Terra Space backend is unavailable."));
  }, []);

  return <ServiceStatus error={error} health={health} />;
}
