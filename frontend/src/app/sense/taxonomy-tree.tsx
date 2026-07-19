"use client";

import type { TaxonomyNodeRead } from "@/lib/events-api";

type TaxonomyTreeProps = {
  nodes: TaxonomyNodeRead[];
  selectedId: string | null;
  expanded: Set<string>;
  query: string;
  onSelect: (node: TaxonomyNodeRead) => void;
  onToggle: (id: string) => void;
  onQueryChange: (query: string) => void;
};

function matchesQuery(node: TaxonomyNodeRead, query: string): boolean {
  const haystack = `${node.name} ${node.event_type?.description ?? ""}`.toLocaleLowerCase();
  return haystack.includes(query.toLocaleLowerCase());
}

type SearchState = { visible: Set<string>; forceOpen: Set<string> };

function computeSearchState(nodes: TaxonomyNodeRead[], query: string): SearchState {
  const visible = new Set<string>();
  const forceOpen = new Set<string>();

  function walk(node: TaxonomyNodeRead): boolean {
    const anyChildMatches = node.children.map(walk).some(Boolean);
    const ownMatch = matchesQuery(node, query);
    if (ownMatch || anyChildMatches) {
      visible.add(node.id);
    }
    if (anyChildMatches) {
      forceOpen.add(node.id);
    }
    return ownMatch || anyChildMatches;
  }

  nodes.forEach(walk);
  return { visible, forceOpen };
}

export function TaxonomyTree({
  nodes,
  selectedId,
  expanded,
  query,
  onSelect,
  onToggle,
  onQueryChange,
}: TaxonomyTreeProps) {
  const trimmedQuery = query.trim();
  const searchState = trimmedQuery ? computeSearchState(nodes, trimmedQuery) : null;

  function renderNode(node: TaxonomyNodeRead) {
    if (searchState && !searchState.visible.has(node.id)) {
      return null;
    }
    const hasChildren = node.children.length > 0;
    const isOpen = hasChildren && (expanded.has(node.id) || Boolean(searchState?.forceOpen.has(node.id)));
    const inactiveLeaf = node.level === "event_type" && node.event_type && !node.event_type.is_active;

    return (
      <li className="taxonomy-tree-node" key={node.id}>
        <div className="taxonomy-tree-row">
          {hasChildren ? (
            <button
              aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
              className="taxonomy-tree-toggle"
              onClick={() => onToggle(node.id)}
              type="button"
            >
              {isOpen ? "−" : "+"}
            </button>
          ) : (
            <span className="taxonomy-tree-toggle-spacer" />
          )}
          <button
            aria-current={node.id === selectedId ? "true" : undefined}
            className="taxonomy-tree-label"
            data-inactive={inactiveLeaf ? "true" : undefined}
            data-selected={node.id === selectedId ? "true" : undefined}
            onClick={() => onSelect(node)}
            type="button"
          >
            {node.name}
          </button>
        </div>
        {hasChildren && isOpen && (
          <ul className="taxonomy-tree-children">
            {node.children.map((child) => renderNode(child))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="taxonomy-tree">
      <div className="field taxonomy-tree-search">
        <label htmlFor="taxonomy-search">Search taxonomy</label>
        <input
          id="taxonomy-search"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name or description"
          value={query}
        />
      </div>
      <ul aria-label="Event taxonomy tree" className="taxonomy-tree-list" role="tree">
        {nodes.map((node) => renderNode(node))}
      </ul>
      {searchState && searchState.visible.size === 0 && (
        <p className="taxonomy-tree-empty">No matches for &ldquo;{trimmedQuery}&rdquo;.</p>
      )}
    </div>
  );
}
