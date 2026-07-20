"use client";

import { useState } from "react";

import { StatusChip } from "@/components/status-chip";
import {
  addActorAlias,
  deleteActorManagement,
  removeActorAlias,
  updateActorManagement,
  type ActorManagementRead,
} from "@/lib/actors-api";

type ActorInspectorProps = {
  actor: ActorManagementRead | null;
  onMutated: (preferredId?: string) => void;
  onError: (message: string) => void;
};

export function ActorInspector({ actor, onMutated, onError }: ActorInspectorProps) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(actor?.name ?? "");
  const [pendingAction, setPendingAction] = useState<"delete" | "deactivate" | null>(null);
  const [aliasDraft, setAliasDraft] = useState("");
  const [pendingAliasDeleteId, setPendingAliasDeleteId] = useState<string | null>(null);

  if (!actor) {
    return (
      <div className="taxonomy-inspector taxonomy-inspector-empty">
        <p>Select an actor to see its details.</p>
      </div>
    );
  }

  const activeActor = actor;

  async function saveName() {
    const name = nameDraft.trim();
    if (!name) return;
    try {
      await updateActorManagement(activeActor.id, { name });
      setEditing(false);
      onMutated(activeActor.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to save this actor.");
    }
  }

  async function activate() {
    try {
      await updateActorManagement(activeActor.id, { is_active: true });
      onMutated(activeActor.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to activate this actor.");
    }
  }

  async function confirmDeactivate() {
    try {
      await updateActorManagement(activeActor.id, { is_active: false });
      setPendingAction(null);
      onMutated(activeActor.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to deactivate this actor.");
    }
  }

  async function addAlias() {
    const alias = aliasDraft.trim();
    if (!alias) return;
    try {
      await addActorAlias(activeActor.id, alias);
      setAliasDraft("");
      onMutated(activeActor.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to add this alias.");
    }
  }

  async function confirmRemoveAlias(aliasId: string) {
    try {
      await removeActorAlias(activeActor.id, aliasId);
      setPendingAliasDeleteId(null);
      onMutated(activeActor.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to remove this alias.");
    }
  }

  async function confirmDelete() {
    try {
      await deleteActorManagement(activeActor.id);
      setPendingAction(null);
      onMutated();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to delete this actor.");
    }
  }

  return (
    <div className="taxonomy-inspector">
      {editing ? (
        <div className="taxonomy-edit-fields">
          <div className="field">
            <label htmlFor="actor-name">Name</label>
            <input
              id="actor-name"
              onChange={(event) => setNameDraft(event.target.value)}
              value={nameDraft}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={saveName} type="button">
              Save changes
            </button>
            <button className="btn" onClick={() => setEditing(false)} type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="taxonomy-inspector-heading">
          <h3>{activeActor.name}</h3>
          <button
            aria-label={`Edit ${activeActor.name}`}
            className="btn"
            onClick={() => {
              setNameDraft(activeActor.name);
              setEditing(true);
            }}
            type="button"
          >
            Edit
          </button>
        </div>
      )}

      <div className="taxonomy-inspector-status">
        <StatusChip
          colorVar={activeActor.is_active ? "--status-confirmed" : undefined}
          label={activeActor.is_active ? "Active" : "Inactive"}
          value={activeActor.is_active ? "active" : "inactive"}
        />
        <label className="event-type-toggle">
          <input
            aria-label={`Active: ${activeActor.name}`}
            checked={activeActor.is_active}
            onChange={() => (activeActor.is_active ? setPendingAction("deactivate") : activate())}
            type="checkbox"
          />
          <span>Enabled</span>
        </label>
        {pendingAction === "deactivate" && (
          <div className="taxonomy-confirm">
            <p>
              Deactivate {activeActor.name}? It will no longer be offered for review or local AI
              matching.
            </p>
            <button className="btn btn-destructive" onClick={confirmDeactivate} type="button">
              Confirm deactivate
            </button>
            <button className="btn" onClick={() => setPendingAction(null)} type="button">
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="actor-aliases">
        <h4>Aliases</h4>
        <p className="settings-hint">
          Local AI only ever sees canonical actor names, never aliases. An alias just tells Terra
          Space that an extracted name like &ldquo;US&rdquo; means this same actor.
        </p>
        {activeActor.aliases.length > 0 && (
          <ul className="actor-alias-list">
            {activeActor.aliases.map((alias) => (
              <li key={alias.id}>
                <span>{alias.alias}</span>
                {pendingAliasDeleteId === alias.id ? (
                  <span className="taxonomy-confirm actor-alias-confirm">
                    <button
                      className="btn btn-destructive"
                      onClick={() => confirmRemoveAlias(alias.id)}
                      type="button"
                    >
                      Confirm remove
                    </button>
                    <button
                      className="btn"
                      onClick={() => setPendingAliasDeleteId(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    aria-label={`Remove alias ${alias.alias}`}
                    className="btn"
                    onClick={() => setPendingAliasDeleteId(alias.id)}
                    type="button"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="field taxonomy-add-child">
          <label htmlFor="actor-new-alias">New alias</label>
          <input
            id="actor-new-alias"
            onChange={(event) => setAliasDraft(event.target.value)}
            value={aliasDraft}
          />
          <div className="form-actions">
            <button
              className="btn btn-primary"
              disabled={!aliasDraft.trim()}
              onClick={addAlias}
              type="button"
            >
              Add alias
            </button>
          </div>
        </div>
      </div>

      {!activeActor.in_use && (
        <div className="taxonomy-inspector-actions">
          {pendingAction === "delete" ? (
            <div className="taxonomy-confirm">
              <p>Delete {activeActor.name}? This cannot be undone.</p>
              <button className="btn btn-destructive" onClick={confirmDelete} type="button">
                Confirm delete
              </button>
              <button className="btn" onClick={() => setPendingAction(null)} type="button">
                Cancel
              </button>
            </div>
          ) : (
            <button
              aria-label={`Delete ${activeActor.name}`}
              className="btn btn-destructive"
              onClick={() => setPendingAction("delete")}
              type="button"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
