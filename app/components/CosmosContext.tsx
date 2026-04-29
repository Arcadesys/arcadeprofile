'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';

interface CosmosContextType {
  cosmosTime: number;
  isDay: boolean;
  toggle: () => void;
}

const CosmosContext = createContext<CosmosContextType>({
  cosmosTime: 0,
  isDay: false,
  toggle: () => {},
});

export function useCosmosTime() {
  return useContext(CosmosContext);
}

/* ── helpers ──────────────────────────────────────────────── */

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/* ── theme variable interpolation ────────────────────────── */

const hexVars: [string, string, string][] = [
  ['--bg',            '#000000', '#FFFDE8'],
  ['--bg-deep',       '#000000', '#F5F2E0'],
  ['--surface',       '#14142a', '#FFFFF0'],
  ['--surface-hover', '#1e1e3a', '#FFF8DC'],
  ['--fg',            '#e8e8ec', '#1a1a2e'],
  ['--fg-muted',      '#9a9ab0', '#6b6b80'],
  ['--accent',        '#ff8a00', '#e07800'],
  ['--neon-pink',     '#ff3cac', '#ff1493'],
  ['--magenta',       '#ff6b9d', '#c44f7a'],
  ['--gold',          '#ffaa00', '#cc8800'],
  ['--btn-bg',        '#1a1a30', '#FFF8DC'],
];

const rgbaVars: [string, [number, number, number, number], [number, number, number, number]][] = [
  ['--glow-pink',          [255, 60, 172, 0.4],  [255, 20, 147, 0.15]],
  ['--glow-orange',        [255, 138, 0, 0.3],   [224, 120, 0, 0.1]],
  ['--border',             [255, 138, 0, 0.2],   [0, 0, 0, 0.1]],
  ['--border-strong',      [255, 138, 0, 0.45],  [0, 0, 0, 0.25]],
  // navbar backgrounds — interpolated so the sticky bar and mobile dropdown
  // always match the current day/night sky tone
  ['--navbar-bg',          [10, 10, 20, 0.85],   [250, 249, 247, 0.9]],
  ['--navbar-dropdown-bg', [10, 10, 20, 0.95],   [250, 249, 247, 0.95]],
];

function applyThemeVars(t: number) {
  const el = document.documentElement;
  for (const [name, dark, light] of hexVars) {
    el.style.setProperty(name, lerpColor(dark, light, t));
  }
  for (const [name, dark, light] of rgbaVars) {
    const r = Math.round(lerp(dark[0], light[0], t));
    const g = Math.round(lerp(dark[1], light[1], t));
    const b = Math.round(lerp(dark[2], light[2], t));
    const a = lerp(dark[3], light[3], t);
    el.style.setProperty(name, `rgba(${r},${g},${b},${a.toFixed(3)})`);
  }
}

/* ── animation config ────────────────────────────────────── */
const TRANSITION_DURATION = 2200; // ms

/* ── provider ────────────────────────────────────────────── */

export function CosmosProvider({ children }: { children: ReactNode }) {
  const [isDay, setIsDay] = useState(false);
  const [cosmosTime, setCosmosTime] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  const toRef = useRef(0);
  const currentRef = useRef(0);

  // apply vars on every cosmosTime change
  useEffect(() => {
    applyThemeVars(cosmosTime);
  }, [cosmosTime]);

  // restore from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cosmos-mode');
    if (saved === 'day') {
      setIsDay(true);
      setCosmosTime(1);
      currentRef.current = 1;
    }
  }, []);

  const animate = useCallback((from: number, to: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    fromRef.current = from;
    toRef.current = to;
    startRef.current = null;

    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
      // ease-in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const val = fromRef.current + (toRef.current - fromRef.current) * eased;
      currentRef.current = val;
      setCosmosTime(val);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const toggle = useCallback(() => {
    setIsDay(prev => {
      const next = !prev;
      localStorage.setItem('cosmos-mode', next ? 'day' : 'night');
      const to = next ? 1 : 0;
      animate(currentRef.current, to);
      return next;
    });
  }, [animate]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <CosmosContext.Provider value={{ cosmosTime, isDay, toggle }}>
      {children}
    </CosmosContext.Provider>
  );
}
