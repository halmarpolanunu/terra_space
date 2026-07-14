import type { EventTypeRead } from "@/lib/events-api";

export type Settings = {
  lm_studio_base_url: string;
  lm_studio_model: string | null;
};

export type SettingsUpdate = Partial<{
  lm_studio_base_url: string;
  lm_studio_model: string | null;
}>;

export type LmStudioTestResult = {
  reachable: boolean;
  models: string[];
  message: string;
};

const API_ROOT = "/api/backend/api";

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getSettings(): Promise<Settings> {
  const response = await fetch(`${API_ROOT}/settings`);
  return parseOrThrow<Settings>(response);
}

export async function updateSettings(patch: SettingsUpdate): Promise<Settings> {
  const response = await fetch(`${API_ROOT}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseOrThrow<Settings>(response);
}

export async function testLmStudio(baseUrl?: string): Promise<LmStudioTestResult> {
  const response = await fetch(`${API_ROOT}/settings/lm-studio/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(baseUrl ? { base_url: baseUrl } : {}),
  });
  return parseOrThrow<LmStudioTestResult>(response);
}

export async function createEventType(name: string): Promise<EventTypeRead> {
  const response = await fetch(`${API_ROOT}/event-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseOrThrow<EventTypeRead>(response);
}

export async function updateEventType(
  id: string,
  patch: Partial<{ name: string; is_active: boolean }>,
): Promise<EventTypeRead> {
  const response = await fetch(`${API_ROOT}/event-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseOrThrow<EventTypeRead>(response);
}

export async function deleteEventType(id: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/event-types/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
}
