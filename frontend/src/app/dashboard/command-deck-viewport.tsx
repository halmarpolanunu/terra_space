"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export const COMMAND_DECK_REFERENCE_WIDTH = 1664;
export const COMMAND_DECK_REFERENCE_HEIGHT = 872;

type CommandDeckViewportProps = { children: ReactNode };
type CommandDeckCanvasStyle = CSSProperties & { "--command-deck-scale": number };

export function calculateCommandDeckScale(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 1;
  return Math.min(1, width / COMMAND_DECK_REFERENCE_WIDTH, height / COMMAND_DECK_REFERENCE_HEIGHT);
}

export function CommandDeckViewport({ children }: CommandDeckViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(calculateCommandDeckScale(entry.contentRect.width, entry.contentRect.height));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const style: CommandDeckCanvasStyle = { "--command-deck-scale": scale };
  return <div className="command-deck-viewport" ref={viewportRef}><div className="command-deck-canvas" data-command-deck-scale={scale.toFixed(4)} style={style}>{children}</div></div>;
}
