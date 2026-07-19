"use client";

import { useState } from "react";

import { StatusChip } from "@/components/status-chip";
import type { TaxonomyLevel, TaxonomyNodeRead, TaxonomyPathSegment } from "@/lib/events-api";
import { createTaxonomyNode, deleteTaxonomyNode, updateTaxonomyNode } from "@/lib/settings-api";

const CHILD_LEVEL: Record<TaxonomyLevel, TaxonomyLevel | null> = {
  domain: "category",
  category: "subcategory",
  subcategory: "event_type",
  event_type: null,
};

const LEVEL_LABEL: Record<TaxonomyLevel, string> = {
  domain: "Domain",
  category: "Category",
  subcategory: "Subcategory",
  event_type: "Event Type",
};

type TaxonomyInspectorProps = {
  node: TaxonomyNodeRead | null;
  path: TaxonomyPathSegment[];
  onMutated: (preferredId?: string) => void;
  onError: (message: string) => void;
};

export function TaxonomyInspector({ node, path, onMutated, onError }: TaxonomyInspectorProps) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(node?.name ?? "");
  const [descriptionDraft, setDescriptionDraft] = useState(node?.event_type?.description ?? "");
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [childDescription, setChildDescription] = useState("");
  const [pendingAction, setPendingAction] = useState<"delete" | "deactivate" | null>(null);

  if (!node) {
    return (
      <div className="taxonomy-inspector taxonomy-inspector-empty">
        <p>Select a node in the tree to see its details.</p>
      </div>
    );
  }

  const activeNode = node;
  const isLeaf = activeNode.level === "event_type";
  const eventType = activeNode.event_type;
  const childLevel = CHILD_LEVEL[activeNode.level];
  const hasChildren = activeNode.children.length > 0;
  const activationBlocked = isLeaf && eventType ? !eventType.is_active && !eventType.description?.trim() : false;
  const deletable = !hasChildren && !(isLeaf && eventType?.in_use);

  async function saveEdits() {
    const name = nameDraft.trim();
    if (!name) return;
    try {
      await updateTaxonomyNode(activeNode.id, {
        name,
        ...(isLeaf ? { description: descriptionDraft.trim() || null } : {}),
      });
      setEditing(false);
      onMutated(activeNode.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to save this node.");
    }
  }

  async function activate() {
    try {
      await updateTaxonomyNode(activeNode.id, { is_active: true });
      onMutated(activeNode.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to activate this event type.");
    }
  }

  async function confirmDeactivate() {
    try {
      await updateTaxonomyNode(activeNode.id, { is_active: false });
      setPendingAction(null);
      onMutated(activeNode.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to deactivate this event type.");
    }
  }

  async function addChild() {
    if (!childLevel) return;
    const name = childName.trim();
    if (!name) return;
    if (childLevel === "event_type" && !childDescription.trim()) return;
    try {
      const created = await createTaxonomyNode({
        name,
        level: childLevel,
        parent_id: activeNode.id,
        description: childLevel === "event_type" ? childDescription.trim() : undefined,
      });
      setAddingChild(false);
      setChildName("");
      setChildDescription("");
      onMutated(created.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to add this node.");
    }
  }

  async function confirmDelete() {
    try {
      await deleteTaxonomyNode(activeNode.id);
      setPendingAction(null);
      onMutated();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to delete this node.");
    }
  }

  return (
    <div className="taxonomy-inspector">
      {path.length > 0 && <p className="taxonomy-breadcrumb">{path.map((segment) => segment.name).join(" › ")}</p>}
      <p className="taxonomy-inspector-level">{LEVEL_LABEL[activeNode.level]}</p>

      {editing ? (
        <div className="taxonomy-edit-fields">
          <div className="field">
            <label htmlFor="taxonomy-name">Name</label>
            <input id="taxonomy-name" onChange={(event) => setNameDraft(event.target.value)} value={nameDraft} />
          </div>
          {isLeaf && (
            <div className="field">
              <label htmlFor="taxonomy-description">Description</label>
              <textarea
                id="taxonomy-description"
                maxLength={1000}
                onChange={(event) => setDescriptionDraft(event.target.value)}
                rows={3}
                value={descriptionDraft}
              />
            </div>
          )}
          <div className="form-actions">
            <button className="btn btn-primary" onClick={saveEdits} type="button">
              Save changes
            </button>
            <button className="btn" onClick={() => setEditing(false)} type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="taxonomy-inspector-heading">
          <h3>{activeNode.name}</h3>
          {isLeaf && eventType?.description && (
            <p className="event-type-description">{eventType.description}</p>
          )}
          <button aria-label={`Edit ${activeNode.name}`} className="btn" onClick={() => setEditing(true)} type="button">
            Edit
          </button>
        </div>
      )}

      {isLeaf && eventType && (
        <div className="taxonomy-inspector-status">
          <StatusChip
            colorVar={eventType.is_active ? "--status-confirmed" : undefined}
            label={eventType.is_active ? "Active" : "Inactive"}
            value={eventType.is_active ? "active" : "inactive"}
          />
          <label className="event-type-toggle">
            <input
              aria-label={`Active: ${activeNode.name}`}
              checked={eventType.is_active}
              disabled={activationBlocked}
              onChange={() => (eventType.is_active ? setPendingAction("deactivate") : activate())}
              type="checkbox"
            />
            <span>Enabled</span>
          </label>
          {activationBlocked && <p className="event-type-required">Add a description before activating.</p>}
          {pendingAction === "deactivate" && (
            <div className="taxonomy-confirm">
              <p>Deactivate {activeNode.name}? It will no longer be offered for review or local AI.</p>
              <button className="btn btn-destructive" onClick={confirmDeactivate} type="button">
                Confirm deactivate
              </button>
              <button className="btn" onClick={() => setPendingAction(null)} type="button">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {childLevel && (
        addingChild ? (
          <div className="field taxonomy-add-child">
            <label htmlFor="taxonomy-child-name">New {LEVEL_LABEL[childLevel].toLowerCase()} name</label>
            <input id="taxonomy-child-name" onChange={(event) => setChildName(event.target.value)} value={childName} />
            {childLevel === "event_type" && (
              <>
                <label htmlFor="taxonomy-child-description">Description</label>
                <textarea
                  id="taxonomy-child-description"
                  maxLength={1000}
                  onChange={(event) => setChildDescription(event.target.value)}
                  rows={2}
                  value={childDescription}
                />
              </>
            )}
            <div className="form-actions">
              <button
                className="btn btn-primary"
                disabled={!childName.trim() || (childLevel === "event_type" && !childDescription.trim())}
                onClick={addChild}
                type="button"
              >
                Add {LEVEL_LABEL[childLevel].toLowerCase()}
              </button>
              <button className="btn" onClick={() => setAddingChild(false)} type="button">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn" onClick={() => setAddingChild(true)} type="button">
            Add {LEVEL_LABEL[childLevel].toLowerCase()}
          </button>
        )
      )}

      {deletable && (
        <div className="taxonomy-inspector-actions">
          {pendingAction === "delete" ? (
            <div className="taxonomy-confirm">
              <p>Delete {activeNode.name}? This cannot be undone.</p>
              <button className="btn btn-destructive" onClick={confirmDelete} type="button">
                Confirm delete
              </button>
              <button className="btn" onClick={() => setPendingAction(null)} type="button">
                Cancel
              </button>
            </div>
          ) : (
            <button
              aria-label={`Delete ${activeNode.name}`}
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
