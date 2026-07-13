"use client";

import { useEffect, useState } from "react";

import { getHealth, type HealthResponse } from "@/lib/api";

type ServiceStatusProps = {
  health?: HealthResponse;
  error?: string;
};

export function ServiceStatus({ health, error }: ServiceStatusProps) {
  if (error) {
    return <p role="alert">{error}</p>;
  }
  if (!health) {
    return <p>Checking local services…</p>;
  }
  return (
    <div aria-live="polite">
      {health.lm_studio === "offline" && (
        <p>LM Studio is offline. Check Settings and try again.</p>
      )}
      {health.map === "missing" && <p>Map package is not installed.</p>}
      {health.storage === "error" && <p>Local storage is unavailable.</p>}
      {health.lm_studio === "available" && <p>LM Studio is available.</p>}
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
