"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type CommandDeckPanel =
  | "summary"
  | "signals"
  | "register"
  | "filters"
  | "detail"
  | null;

export type LayeredCommandDeckProps = {
  activeFilterCount: number;
  activePanel: CommandDeckPanel;
  detail?: ReactNode;
  eventCount: number;
  eventsHref: string;
  eyebrow: string;
  filters: ReactNode;
  globe: ReactNode;
  markerCount: number;
  onActivePanelChange: (panel: CommandDeckPanel) => void;
  register: ReactNode;
  signals: ReactNode;
  sortLabel: string;
  stageLabel: string;
  summary: ReactNode;
  title: string;
};

type InstrumentProps = {
  active: boolean;
  children: ReactNode;
  className: string;
  label: string;
  onActivate: () => void;
};

function Instrument({
  active,
  children,
  className,
  label,
  onActivate,
}: InstrumentProps) {
  return (
    <aside
      className={`panel command-deck-instrument ${className}`}
      data-active={active || undefined}
    >
      <button
        aria-label={label}
        aria-pressed={active}
        className="command-deck-instrument__trigger"
        onClick={onActivate}
        type="button"
      >
        <span>{label}</span>
        <span aria-hidden="true" className="command-deck-instrument__glyph">+</span>
      </button>
      <div className="command-deck-instrument__body">{children}</div>
    </aside>
  );
}

export function LayeredCommandDeck({
  activeFilterCount,
  activePanel,
  detail,
  eventCount,
  eventsHref,
  eyebrow,
  filters,
  globe,
  markerCount,
  onActivePanelChange,
  register,
  signals,
  sortLabel,
  stageLabel,
  summary,
  title,
}: LayeredCommandDeckProps) {
  const drawer = activePanel === "filters"
    ? filters
    : activePanel === "register"
      ? register
      : activePanel === "detail"
        ? detail
        : null;

  function togglePanel(panel: Exclude<CommandDeckPanel, "detail" | null>) {
    onActivePanelChange(activePanel === panel ? null : panel);
  }

  return (
    <div
      aria-label={stageLabel}
      className="layered-command-deck"
      data-panel={activePanel ?? "rest"}
      role="region"
    >
      <header className="command-deck-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 id="dashboard-title">{title}</h1>
          <p className="command-deck-stage-label">{stageLabel}</p>
        </div>
        <p aria-live="polite" className="command-deck-marker-count">
          {`Markers · ${markerCount}`}
        </p>
      </header>

      <div className="command-deck-globe">{globe}</div>

      <Instrument
        active={activePanel === "summary"}
        className="command-deck-instrument--summary command-deck-summary"
        label="Situation summary"
        onActivate={() => togglePanel("summary")}
      >
        {summary}
      </Instrument>

      <Instrument
        active={activePanel === "signals"}
        className="command-deck-instrument--signals"
        label="Recent signals"
        onActivate={() => togglePanel("signals")}
      >
        {signals}
      </Instrument>

      <nav aria-label="Dashboard controls" className="panel command-deck-dock">
        <button
          aria-controls="command-deck-drawer"
          aria-expanded={activePanel === "register"}
          className="command-deck-dock__control"
          onClick={() => togglePanel("register")}
          type="button"
        >
          Event register <span aria-hidden="true">·</span> {eventCount}
        </button>
        <span className="command-deck-dock__readout">
          {`Sort · ${sortLabel}`}
        </span>
        <button
          aria-controls="command-deck-drawer"
          aria-expanded={activePanel === "filters"}
          className="command-deck-dock__control"
          onClick={() => togglePanel("filters")}
          type="button"
        >
          Filters <span aria-hidden="true">·</span> {activeFilterCount}
        </button>
        <Link className="btn btn-primary command-deck-dock__link" href={eventsHref}>
          Open Events
        </Link>
      </nav>

      {drawer && (
        <section
          aria-label={activePanel === "detail" ? "Selected event" : `${activePanel} panel`}
          className="panel command-deck-drawer"
          id="command-deck-drawer"
        >
          {drawer}
        </section>
      )}
    </div>
  );
}
