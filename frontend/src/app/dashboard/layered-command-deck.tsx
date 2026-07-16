"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

export type CommandDeckPanel =
  | "summary"
  | "signals"
  | "register"
  | "filters"
  | "detail"
  | "list"
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
  list?: ReactNode;
  markerCount: number;
  onActivePanelChange: (panel: CommandDeckPanel) => void;
  parallaxEnabled: boolean;
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
        aria-expanded={active}
        aria-label={label}
        className="command-deck-instrument__trigger"
        onClick={onActivate}
        type="button"
      >
        <span>{label}</span>
        <span aria-hidden="true" className="command-deck-instrument__glyph">
          {active ? "−" : "+"}
        </span>
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
  list,
  markerCount,
  onActivePanelChange,
  parallaxEnabled,
  register,
  signals,
  sortLabel,
  stageLabel,
  summary,
  title,
}: LayeredCommandDeckProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const canUseParallax = parallaxEnabled && !reducedMotion;
  const drawer = activePanel === "filters"
    ? filters
    : activePanel === "register"
      ? register
      : activePanel === "detail"
        ? detail
        : activePanel === "list"
          ? list
          : null;

  useEffect(() => {
    const stage = stageRef.current;
    if (!canUseParallax && stage?.style.getPropertyValue("--deck-parallax-x")) {
      stage.style.setProperty("--deck-parallax-x", "0px");
      stage.style.setProperty("--deck-parallax-y", "0px");
    }
  }, [canUseParallax]);

  function togglePanel(panel: Exclude<CommandDeckPanel, "detail" | null>) {
    onActivePanelChange(activePanel === panel ? null : panel);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && activePanel) {
      onActivePanelChange(null);
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!canUseParallax) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const normalizedX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    const normalizedY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
    event.currentTarget.style.setProperty("--deck-parallax-x", `${(normalizedX * 3).toFixed(2)}px`);
    event.currentTarget.style.setProperty("--deck-parallax-y", `${(normalizedY * 2).toFixed(2)}px`);
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (!canUseParallax) return;
    event.currentTarget.style.setProperty("--deck-parallax-x", "0px");
    event.currentTarget.style.setProperty("--deck-parallax-y", "0px");
  }

  return (
    <div
      aria-label={stageLabel}
      className="layered-command-deck"
      data-panel={activePanel ?? "rest"}
      data-parallax-enabled={canUseParallax}
      onKeyDown={handleKeyDown}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      ref={stageRef}
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
