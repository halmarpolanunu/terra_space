"use client";

import { useEffect, useRef } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Mote = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
  tw: number;
};

// Tuned with the owner via the live preview (2026-07-21): a livelier drift, more
// motes, a slightly stronger scan. Kept as named constants so they can later be
// lifted into a user-facing "background motion" setting.
const MOTE_DENSITY = 1.5; // multiplier on the area-scaled mote count
const DRIFT_SPEED = 2; // multiplier on drift + scan + twinkle speed
const SCAN_ALPHA = 0.05; // peak alpha of the reconstruction scan band

/**
 * A subtle "animus"-style ambient layer that sits behind the workspace content:
 * slow-drifting amber data motes plus a faint reconstruction scan band. It is
 * deliberately quiet — the static route background carries the identity; this
 * only makes the field feel alive. Honors reduced-motion (draws a single calm
 * frame and never loops) and pauses while the tab is hidden.
 */
export function WorkspaceAmbiance() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext("2d");
    } catch {
      context = null;
    }
    if (!context) return;
    const ctx = context;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let motes: Mote[] = [];
    let scan = -0.3;
    let frame: number | undefined;
    let lastAt = 0;

    const resize = () => {
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      const count = Math.min(
        96,
        Math.max(18, Math.round(((width * height) / 52000) * MOTE_DENSITY)),
      );
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.7,
        vx: (Math.random() - 0.5) * 0.05,
        vy: -(0.02 + Math.random() * 0.07),
        a: 0.14 + Math.random() * 0.34,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const paint = (elapsed: number) => {
      ctx.clearRect(0, 0, width, height);

      // Reconstruction scan — a faint amber band drifting slowly downward.
      scan += elapsed * 0.00003 * DRIFT_SPEED;
      if (scan > 1.3) scan = -0.3;
      const sy = scan * height;
      const band = ctx.createLinearGradient(0, sy - 110, 0, sy + 110);
      band.addColorStop(0, "rgba(242,169,59,0)");
      band.addColorStop(0.5, `rgba(242,169,59,${SCAN_ALPHA})`);
      band.addColorStop(1, "rgba(242,169,59,0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, sy - 110, width, 220);

      // Drifting data motes with a soft glow.
      ctx.shadowColor = "rgba(242,169,59,0.85)";
      ctx.shadowBlur = 6;
      for (const m of motes) {
        m.x += m.vx * elapsed * 0.06 * DRIFT_SPEED;
        m.y += m.vy * elapsed * 0.06 * DRIFT_SPEED;
        m.tw += elapsed * 0.0018 * DRIFT_SPEED;
        if (m.y < -12) {
          m.y = height + 12;
          m.x = Math.random() * width;
        }
        if (m.x < -12) m.x = width + 12;
        else if (m.x > width + 12) m.x = -12;
        const twinkle = 0.6 + 0.4 * Math.sin(m.tw);
        ctx.fillStyle = `rgba(255,207,122,${m.a * twinkle})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    const loop = (now: number) => {
      const elapsed = Math.min(60, now - lastAt);
      lastAt = now;
      paint(elapsed);
      frame = window.requestAnimationFrame(loop);
    };

    resize();
    seed();
    paint(16); // one synchronous frame so the layer is never blank

    const start = () => {
      if (reduceMotion || frame !== undefined) return;
      lastAt = window.performance.now();
      frame = window.requestAnimationFrame(loop);
    };
    const stop = () => {
      if (frame !== undefined) {
        window.cancelAnimationFrame(frame);
        frame = undefined;
      }
    };

    const onResize = () => {
      resize();
      seed();
      paint(16);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduceMotion]);

  return <canvas aria-hidden="true" className="workspace-ambiance" ref={canvasRef} />;
}
