"use client";

import { useState } from "react";

import { FramedPanel } from "@/components/framed-panel";
import { StatusChip } from "@/components/status-chip";
import type { EventTypeRead } from "@/lib/events-api";
import { createEventType, deleteEventType, updateEventType } from "@/lib/settings-api";

type EventTypeSettingsProps = {
  eventTypes: EventTypeRead[];
};

type TypeDraft = {
  name: string;
  description: string;
};

export function EventTypeSettings({ eventTypes }: EventTypeSettingsProps) {
  const [types, setTypes] = useState<EventTypeRead[]>(eventTypes);
  const [drafts, setDrafts] = useState<Record<string, TypeDraft>>({});
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState<string>();

  function replaceType(updated: EventTypeRead) {
    setTypes((current) => current.map((type) => (type.id === updated.id ? updated : type)));
    setDrafts((current) => {
      const next = { ...current };
      delete next[updated.id];
      return next;
    });
  }

  function draftFor(type: EventTypeRead): TypeDraft {
    return (
      drafts[type.id] ?? {
        name: type.name,
        description: type.description ?? "",
      }
    );
  }

  function updateDraft(type: EventTypeRead, patch: Partial<TypeDraft>) {
    setDrafts((current) => {
      const currentDraft = current[type.id] ?? {
        name: type.name,
        description: type.description ?? "",
      };
      return {
        ...current,
        [type.id]: { ...currentDraft, ...patch },
      };
    });
  }

  async function add() {
    const name = newName.trim();
    const description = newDescription.trim();
    if (!name || !description) return;
    setError(undefined);
    try {
      const created = await createEventType(name, description);
      setTypes((current) => [...current, created]);
      setNewName("");
      setNewDescription("");
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

  async function save(type: EventTypeRead) {
    const draft = draftFor(type);
    const name = draft.name.trim();
    const description = draft.description.trim() || null;
    if (!name) return;
    setError(undefined);
    try {
      replaceType(await updateEventType(type.id, { name, description }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this type.");
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
        <div className="field settings-type-description-field">
          <label htmlFor="new-event-type-description">New event type description</label>
          <textarea
            id="new-event-type-description"
            maxLength={1000}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="Explain when this type should be used"
            rows={2}
            value={newDescription}
          />
        </div>
        <button
          className="btn btn-primary"
          disabled={!newName.trim() || !newDescription.trim()}
          onClick={add}
          type="button"
        >
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
        {types.map((type) => {
          const draft = draftFor(type);
          const activationBlocked = !type.is_active && !type.description?.trim();

          return (
            <li className="event-type-row" data-motion-item="event-type-row" key={type.id}>
              <div className="event-type-fields">
                <input
                  aria-label={`Rename ${type.name}`}
                  onChange={(event) => updateDraft(type, { name: event.target.value })}
                  value={draft.name}
                />
                <textarea
                  aria-label={`Description for ${type.name}`}
                  maxLength={1000}
                  onChange={(event) => updateDraft(type, { description: event.target.value })}
                  placeholder="Explain when this type should be used"
                  rows={2}
                  value={draft.description}
                />
              </div>
              <div className="event-type-state">
                <StatusChip
                  colorVar={type.is_active ? "--status-confirmed" : undefined}
                  label={type.is_active ? "Active" : "Suggested"}
                  value={type.is_active ? "active" : "suggested"}
                />
                <label className="event-type-toggle">
                  <input
                    aria-label={`Active: ${type.name}`}
                    checked={type.is_active}
                    disabled={activationBlocked}
                    onChange={() => toggle(type)}
                    type="checkbox"
                  />
                  <span>Enabled</span>
                </label>
                {activationBlocked && (
                  <p className="event-type-required">Add a description before activating.</p>
                )}
              </div>
              <div className="event-type-actions">
                <button
                  aria-label={`Save changes for ${type.name}`}
                  className="btn"
                  onClick={() => save(type)}
                  type="button"
                >
                  Save changes
                </button>
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
              </div>
            </li>
          );
        })}
      </ul>
      )}

      {error && <p className="document-error">{error}</p>}
    </FramedPanel>
  );
}
