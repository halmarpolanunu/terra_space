export type ServiceState = "available" | "missing" | "offline" | "error";

export type HealthResponse = {
  app: ServiceState;
  storage: ServiceState;
  map: ServiceState;
  lm_studio: ServiceState;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/backend/api/health");
  if (!response.ok) {
    throw new Error("Terra Space backend is unavailable.");
  }
  return response.json() as Promise<HealthResponse>;
}
