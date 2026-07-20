export type ActorAliasRead = {
  id: string;
  alias: string;
};

export type ActorManagementRead = {
  id: string;
  name: string;
  is_active: boolean;
  in_use: boolean;
  aliases: ActorAliasRead[];
};

export type ActorUpdatePatch = Partial<{
  name: string;
  is_active: boolean;
}>;

const API_ROOT = "/api/backend/api";

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function ensureOk(response: Response): Promise<void> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
}

export async function listActorManagement(): Promise<ActorManagementRead[]> {
  const response = await fetch(`${API_ROOT}/actor-management`);
  return parseOrThrow<ActorManagementRead[]>(response);
}

export async function updateActorManagement(
  id: string,
  patch: ActorUpdatePatch,
): Promise<ActorManagementRead> {
  const response = await fetch(`${API_ROOT}/actor-management/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseOrThrow<ActorManagementRead>(response);
}

export async function deleteActorManagement(id: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/actor-management/${id}`, { method: "DELETE" });
  await ensureOk(response);
}

export async function addActorAlias(actorId: string, alias: string): Promise<ActorAliasRead> {
  const response = await fetch(`${API_ROOT}/actor-management/${actorId}/aliases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alias }),
  });
  return parseOrThrow<ActorAliasRead>(response);
}

export async function removeActorAlias(actorId: string, aliasId: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/actor-management/${actorId}/aliases/${aliasId}`, {
    method: "DELETE",
  });
  await ensureOk(response);
}
