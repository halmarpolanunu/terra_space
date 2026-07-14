"use client";

import type { ChangeEvent } from "react";

import type { ActorRead, EventTypeRead } from "@/lib/events-api";
import {
  emptyEventFilters,
  hasActiveEventFilters,
  type EventFilters,
  type EventSort,
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

const EPITEMIC_OPTIONS = [
  ["confirmed", "Confirmed"],
  ["claim", "Claim"],
  ["rumor", "Rumor"],
  ["denied", "Denied"],
] as const;

const SORT_OPTIONS: [EventSort, string][] = [
  ["", "Date (newest first)"],
  ["date_desc", "Date (newest first)"],
  ["date_asc", "Date (oldest first)"],
  ["created_desc", "Recently created"],
  ["title_asc", "Title (A–Z)"],
];

export function EventFilterBar({
  value,
  eventTypeOptions,
  actorOptions,
  documentOptions,
  onChange,
}: EventFilterBarProps) {
  function update(key: keyof EventFilters) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ ...value, [key]: event.target.value } as EventFilters);
    };
  }

  return (
    <form className="event-filter-bar" onSubmit={(event) => event.preventDefault()}>
      <div className="field">
        <label htmlFor="event-filter-search">Search</label>
        <input id="event-filter-search" onChange={update("q")} type="search" value={value.q} />
      </div>
      <div className="field">
        <label htmlFor="event-filter-date-from">Start date</label>
        <input id="event-filter-date-from" onChange={update("date_from")} type="date" value={value.date_from} />
      </div>
      <div className="field">
        <label htmlFor="event-filter-date-to">End date</label>
        <input id="event-filter-date-to" onChange={update("date_to")} type="date" value={value.date_to} />
      </div>
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
          {EPITEMIC_OPTIONS.map(([optionValue, label]) => (
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
      <div className="field">
        <label htmlFor="event-filter-country">Country</label>
        <input id="event-filter-country" onChange={update("country")} value={value.country} />
      </div>
      <div className="field">
        <label htmlFor="event-filter-admin1">Province or state</label>
        <input id="event-filter-admin1" onChange={update("admin1")} value={value.admin1} />
      </div>
      <div className="field">
        <label htmlFor="event-filter-city">City or regency</label>
        <input id="event-filter-city" onChange={update("city_regency")} value={value.city_regency} />
      </div>
      <div className="field">
        <label htmlFor="event-filter-document">Source document</label>
        <select id="event-filter-document" onChange={update("document_id")} value={value.document_id}>
          <option value="">All documents</option>
          {documentOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.title}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="event-filter-sort">Sort order</label>
        <select id="event-filter-sort" onChange={update("sort")} value={value.sort}>
          {SORT_OPTIONS.map(([optionValue, label], index) => (
            <option key={`${optionValue}-${index}`} value={optionValue}>{label}</option>
          ))}
        </select>
      </div>
      {hasActiveEventFilters(value) && (
        <button className="btn" onClick={() => onChange(emptyEventFilters())} type="button">
          Clear filters
        </button>
      )}
    </form>
  );
}

export type { DocumentOption };
