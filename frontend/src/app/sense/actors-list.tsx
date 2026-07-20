"use client";

import type { ActorManagementRead } from "@/lib/actors-api";

type ActorsListProps = {
  actors: ActorManagementRead[];
  selectedId: string | null;
  query: string;
  onSelect: (actor: ActorManagementRead) => void;
  onQueryChange: (query: string) => void;
};

function matchesQuery(actor: ActorManagementRead, query: string): boolean {
  const haystack = `${actor.name} ${actor.aliases.map((alias) => alias.alias).join(" ")}`.toLocaleLowerCase();
  return haystack.includes(query.toLocaleLowerCase());
}

export function ActorsList({ actors, selectedId, query, onSelect, onQueryChange }: ActorsListProps) {
  const trimmedQuery = query.trim();
  const visible = trimmedQuery ? actors.filter((actor) => matchesQuery(actor, trimmedQuery)) : actors;

  return (
    <div className="taxonomy-tree">
      <div className="field taxonomy-tree-search">
        <label htmlFor="actors-search">Search actors</label>
        <input
          id="actors-search"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name or alias"
          value={query}
        />
      </div>
      <ul aria-label="Actors list" className="taxonomy-tree-list">
        {visible.map((actor) => (
          <li className="taxonomy-tree-node" key={actor.id}>
            <div className="taxonomy-tree-row">
              <span className="taxonomy-tree-toggle-spacer" />
              <button
                aria-current={actor.id === selectedId ? "true" : undefined}
                className="taxonomy-tree-label"
                data-inactive={!actor.is_active ? "true" : undefined}
                data-selected={actor.id === selectedId ? "true" : undefined}
                onClick={() => onSelect(actor)}
                type="button"
              >
                {actor.name}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {trimmedQuery && visible.length === 0 && (
        <p className="taxonomy-tree-empty">No matches for &ldquo;{trimmedQuery}&rdquo;.</p>
      )}
    </div>
  );
}
