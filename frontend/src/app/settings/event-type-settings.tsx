"use client";

import { useState } from "react";

import { TaxonomyInspector } from "@/app/sense/taxonomy-inspector";
import { TaxonomyTree } from "@/app/sense/taxonomy-tree";
import { FramedPanel } from "@/components/framed-panel";
import { listEventTaxonomy, type TaxonomyNodeRead, type TaxonomyPathSegment } from "@/lib/events-api";

type EventTypeSettingsProps = {
  nodes: TaxonomyNodeRead[];
};

function findFirstLeaf(nodes: TaxonomyNodeRead[]): TaxonomyNodeRead | null {
  for (const node of nodes) {
    if (node.level === "event_type") return node;
    const found = findFirstLeaf(node.children);
    if (found) return found;
  }
  return null;
}

function findPath(nodes: TaxonomyNodeRead[], id: string): TaxonomyNodeRead[] | null {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const found = findPath(node.children, id);
    if (found) return [node, ...found];
  }
  return null;
}

export function EventTypeSettings({ nodes: initialNodes }: EventTypeSettingsProps) {
  const [nodes, setNodes] = useState<TaxonomyNodeRead[]>(initialNodes);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => findFirstLeaf(initialNodes)?.id ?? null,
  );
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initialNodes.filter((node) => node.level === "domain").map((node) => node.id)),
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();

  const path = selectedId ? findPath(nodes, selectedId) : null;
  const selectedNode = path ? path[path.length - 1] : null;
  const breadcrumb: TaxonomyPathSegment[] = path
    ? path.slice(0, -1).map((segment) => ({ id: segment.id, name: segment.name, level: segment.level }))
    : [];

  async function reload(preferredId?: string) {
    try {
      const next = await listEventTaxonomy();
      setNodes(next);
      setError(undefined);
      if (preferredId && findPath(next, preferredId)) {
        setSelectedId(preferredId);
      } else if (!selectedId || !findPath(next, selectedId)) {
        setSelectedId(findFirstLeaf(next)?.id ?? null);
      }
    } catch (reloadError) {
      setError(
        reloadError instanceof Error ? reloadError.message : "Unable to reload the Event Taxonomy.",
      );
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectNode(node: TaxonomyNodeRead) {
    setSelectedId(node.id);
    if (node.children.length > 0) {
      setExpanded((current) => new Set(current).add(node.id));
    }
  }

  return (
    <FramedPanel className="taxonomy-workspace-panel">
      <p className="settings-hint">
        Only the Event Type leaf can be assigned to an event or selected by local AI. Domains,
        categories, and subcategories organize the taxonomy and are never event values themselves.
      </p>
      <div className="taxonomy-workspace">
        <TaxonomyTree
          expanded={expanded}
          nodes={nodes}
          onQueryChange={setQuery}
          onSelect={selectNode}
          onToggle={toggleExpanded}
          query={query}
          selectedId={selectedId}
        />
        <TaxonomyInspector
          key={selectedNode?.id ?? "none"}
          node={selectedNode}
          onError={setError}
          onMutated={reload}
          path={breadcrumb}
        />
      </div>
      {error && <p className="document-error">{error}</p>}
    </FramedPanel>
  );
}
