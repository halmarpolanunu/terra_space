import type { TaxonomyLevel, TaxonomyNodeRead } from "@/lib/events-api";

export type Settings = {
  lm_studio_base_url: string;
  lm_studio_model: string | null;
  lm_studio_extraction_timeout_seconds: number;
};

export type SettingsUpdate = Partial<{
  lm_studio_base_url: string;
  lm_studio_model: string | null;
  lm_studio_extraction_timeout_seconds: number;
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

export type TaxonomyNodeCreate = {
  name: string;
  level: TaxonomyLevel;
  parent_id?: string | null;
  description?: string | null;
};

export type TaxonomyNodeUpdatePatch = Partial<{
  name: string;
  description: string | null;
  is_active: boolean;
}>;

export async function createTaxonomyNode(payload: TaxonomyNodeCreate): Promise<TaxonomyNodeRead> {
  const response = await fetch(`${API_ROOT}/event-taxonomy/nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<TaxonomyNodeRead>(response);
}

export async function updateTaxonomyNode(
  id: string,
  patch: TaxonomyNodeUpdatePatch,
): Promise<TaxonomyNodeRead> {
  const response = await fetch(`${API_ROOT}/event-taxonomy/nodes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseOrThrow<TaxonomyNodeRead>(response);
}

export async function deleteTaxonomyNode(id: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/event-taxonomy/nodes/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
}
