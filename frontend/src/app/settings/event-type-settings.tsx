"use client";

import { useState } from "react";

import { FramedPanel } from "@/components/framed-panel";
import { StatusChip } from "@/components/status-chip";
import type { EventTypeRead } from "@/lib/events-api";
import { createEventType, deleteEventType, updateEventType } from "@/lib/settings-api";

type EventTypeSettingsProps = {
  eventTypes: EventTypeRead[];
};

export function EventTypeSettings({ eventTypes }: EventTypeSettingsProps) {
  const [types, setTypes] = useState<EventTypeRead[]>(eventTypes);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string>();

  function replaceType(updated: EventTypeRead) {
    setTypes((current) => current.map((type) => (type.id === updated.id ? updated : type)));
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setError(undefined);
    try {
      const created = await createEventType(name);
      setTypes((current) => [...current, created]);
      setNewName("");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Unable to add this event type.");
    }
  }

  async function toggle(type: EventTypeRead) {
    setError(undefined);
    try {
      replaceType(await updateEventType(type.id, { is_active: !type.is_active }));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update this type.");
    }
  }

  async function rename(type: EventTypeRead) {
    const name = (drafts[type.id] ?? type.name).trim();
    if (!name || name === type.name) return;
    setError(undefined);
    try {
      replaceType(await updateEventType(type.id, { name }));
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Unable to rename this type.");
    }
  }

  async function remove(type: EventTypeRead) {
    setError(undefined);
    try {
      await deleteEventType(type.id);
      setTypes((current) => current.filter((row) => row.id !== type.id));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to delete this type.");
    }
  }

  return (
    <FramedPanel className="settings-panel" title="Event types">
      <p className="settings-hint">
        Active types guide extraction and appear in the review and edit pickers. Suggested types
        came from the AI and stay inactive until you activate them. Deactivating keeps events that
        already use a type. A type can be deleted only when no event uses it.
      </p>

      <div className="settings-add-type">
        <div className="field">
          <label htmlFor="new-event-type">New event type</label>
          <input
            id="new-event-type"
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Border movement"
            value={newName}
          />
        </div>
        <button className="btn btn-primary" onClick={add} type="button">
          Add event type
        </button>
      </div>

      {types.length === 0 ? (
        <div className="event-empty-state event-type-empty-state">
          <p>No event types yet — add one above.</p>
          <p>Types suggested by the AI will also appear here for activation.</p>
        </div>
      ) : (
      <ul className="event-type-list">
        {types.map((type) => (
          <li className="event-type-row" data-motion-item="event-type-row" key={type.id}>
            <input
              aria-label={`Rename ${type.name}`}
              defaultValue={type.name}
              onChange={(event) =>
                setDrafts((current) => ({ ...current, [type.id]: event.target.value }))
              }
            />
            <StatusChip
              colorVar={type.is_active ? "--status-confirmed" : undefined}
              label={type.is_active ? "Active" : "Suggested"}
              value={type.is_active ? "active" : "suggested"}
            />
            <button aria-label={`Save name for ${type.name}`} className="btn" onClick={() => rename(type)} type="button">
              Save name
            </button>
            <label className="event-type-toggle">
              <input
                aria-label={`Active: ${type.name}`}
                checked={type.is_active}
                onChange={() => toggle(type)}
                type="checkbox"
              />
              <span>Enabled</span>
            </label>
            {!type.in_use && (
              <button
                aria-label={`Delete ${type.name}`}
                className="btn btn-destructive"
                onClick={() => remove(type)}
                type="button"
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
      )}

      {error && <p className="document-error">{error}</p>}
    </FramedPanel>
  );
}
