"use client";

import type { ActorRelationshipRead } from "@/lib/issues-api";

type RelationshipPanelProps = {
  relationships: ActorRelationshipRead[];
  selectedRelationshipId?: string;
  onSelect: (relationshipId: string) => void;
};

export function RelationshipPanel({
  relationships,
  selectedRelationshipId,
  onSelect,
}: RelationshipPanelProps) {
  if (relationships.length === 0) {
    return <p className="issues-empty-state">No supported actor relationships</p>;
  }

  return (
    <section aria-label="Supported actor relationships" className="relationship-panel">
      <p className="field-label">Supported actor relationships</p>
      <ul className="relationship-list">
        {relationships.map((relationship) => {
          const selected = relationship.id === selectedRelationshipId;
          return (
            <li className="relationship-list-item" key={relationship.id}>
              <button
                aria-pressed={selected}
                className="relationship-select"
                onClick={() => onSelect(relationship.id)}
                type="button"
              >
                <span className="relationship-source">{relationship.source.actor_name}</span>
                <span aria-hidden="true" className="relationship-arrow">→</span>
                <span className="relationship-target">{relationship.target.actor_name}</span>
              </button>
              <div className="relationship-details">
                <p><span className="relationship-role relationship-source">Source</span> {relationship.source.actor_name} · {relationship.source.location.label}</p>
                <p><span className="relationship-role relationship-target">Target</span> {relationship.target.actor_name} · {relationship.target.location.label}</p>
                <blockquote className="evidence-quote">{relationship.evidence_quote}</blockquote>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
