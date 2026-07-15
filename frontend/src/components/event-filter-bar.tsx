"use client";

import { useId, useState, type ChangeEvent } from "react";

import type { ActorRead, EventTypeRead } from "@/lib/events-api";
import {
  ACTIVE_FILTER_KEYS,
  clearEventFilters,
  hasActiveEventFilters,
  type EventFilters,
} from "@/lib/event-filters";

type DocumentOption = {
  id: string;
  title: string;
};

type EventFilterBarProps = {
  value: EventFilters;
  eventTypeOptions: EventTypeRead[];
  actorOptions: ActorRead[];
  documentOptions: DocumentOption[];
  onChange: (filters: EventFilters) => void;
};

const EPISTEMIC_OPTIONS = [
  ["confirmed", "Confirmed"],
  ["claim", "Claim"],
  ["rumor", "Rumor"],
  ["denied", "Denied"],
] as const;

export function EventFilterBar({
  value,
  eventTypeOptions,
  actorOptions,
  documentOptions,
  onChange,
}: EventFilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const optionsId = useId();
  const activeCount = ACTIVE_FILTER_KEYS.filter((key) => Boolean(value[key].trim())).length;

  function update(key: keyof EventFilters) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ ...value, [key]: event.target.value } as EventFilters);
    };
  }

  return (
    <form className="event-filter-bar" onSubmit={(event) => event.preventDefault()}>
      <div className="event-filter-toolbar">
        <div className="field event-filter-search">
          <label htmlFor="event-filter-search">Search title &amp; summary</label>
          <input
            id="event-filter-search"
            onChange={update("q")}
            placeholder="Search title or summary…"
            type="search"
            value={value.q}
          />
        </div>
        <button
          aria-controls={optionsId}
          aria-expanded={expanded}
          className="btn event-filter-toggle"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "Hide filters" : "Filters"}
          {activeCount > 0 && <span className="filter-active-count">{activeCount} active</span>}
        </button>
        {hasActiveEventFilters(value) && (
          <button className="btn event-filter-clear" onClick={() => onChange(clearEventFilters(value))} type="button">
            Clear filters
          </button>
        )}
      </div>

      <div className="event-filter-options" hidden={!expanded} id={optionsId}>
        <fieldset className="filter-group filter-group-date">
          <legend className="filter-group-label">Date range</legend>
          <div className="filter-group-fields">
            <div className="field">
              <label htmlFor="event-filter-date-from">Start date</label>
              <input id="event-filter-date-from" onChange={update("date_from")} type="date" value={value.date_from} />
            </div>
            <div className="field">
              <label htmlFor="event-filter-date-to">End date</label>
              <input id="event-filter-date-to" onChange={update("date_to")} type="date" value={value.date_to} />
            </div>
          </div>
        </fieldset>

        <fieldset className="filter-group filter-group-classification">
          <legend className="filter-group-label">Classification</legend>
          <div className="filter-group-fields">
            <div className="field">
              <label htmlFor="event-filter-type">Event type</label>
              <select id="event-filter-type" onChange={update("event_type_id")} value={value.event_type_id}>
                <option value="">All event types</option>
                {eventTypeOptions.filter((option) => option.is_active).map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="event-filter-epistemic">Epistemic status</label>
              <select id="event-filter-epistemic" onChange={update("epistemic_status")} value={value.epistemic_status}>
                <option value="">All statuses</option>
                {EPISTEMIC_OPTIONS.map(([optionValue, label]) => (
                  <option key={optionValue} value={optionValue}>{label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="event-filter-actor">Actor</label>
              <select id="event-filter-actor" onChange={update("actor_id")} value={value.actor_id}>
                <option value="">All actors</option>
                {actorOptions.filter((option) => option.is_active).map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="filter-group filter-group-location">
          <legend className="filter-group-label">Location</legend>
          <div className="filter-group-fields">
            <div className="field">
              <label htmlFor="event-filter-country">Country</label>
              <input id="event-filter-country" onChange={update("country")} placeholder="Any country" value={value.country} />
            </div>
            <div className="field">
              <label htmlFor="event-filter-admin1">Province or state</label>
              <input id="event-filter-admin1" onChange={update("admin1")} placeholder="Any province or state" value={value.admin1} />
            </div>
            <div className="field">
              <label htmlFor="event-filter-city">City or regency</label>
              <input id="event-filter-city" onChange={update("city_regency")} placeholder="Any city or regency" value={value.city_regency} />
            </div>
          </div>
        </fieldset>

        <fieldset className="filter-group filter-group-source">
          <legend className="filter-group-label">Source</legend>
          <div className="filter-group-fields">
            <div className="field">
              <label htmlFor="event-filter-document">Source document</label>
              <select id="event-filter-document" onChange={update("document_id")} value={value.document_id}>
                <option value="">All documents</option>
                {documentOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.title}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>
      </div>
    </form>
  );
}

export type { DocumentOption };
