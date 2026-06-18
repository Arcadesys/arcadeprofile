'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Prefs = {
  font: string;
  scale: string;
  lh: string;
  width: string;
  contrast: string;
  motion: string;
};

const DEFAULTS: Prefs = {
  font: 'sans',
  scale: '1',
  lh: '1.6',
  width: 'comfy',
  contrast: 'brand',
  motion: 'full',
};

const STORAGE_KEY = 'arcades-reading';

const FONT_LABELS: Record<string, string> = { sans:'Inter', serif:'Lora', hyperlegible:'A11y', dyslexic:'Dyslexic', mono:'Mono' };
const WIDTH_LABELS: Record<string, string> = { narrow:'Narrow', comfy:'Comfy', wide:'Wide' };

function Seg({ group, cols, children }: { group: keyof Prefs; cols?: number; children: ReactNode }) {
  return (
    <div className={`seg${cols ? ` cols-${cols}` : ''}`} data-group={group}>
      {children}
    </div>
  );
}

function Opt({
  group,
  val,
  label,
  cls,
  selected,
  onSelect,
}: {
  group: keyof Prefs;
  val: string;
  label: string;
  cls?: string;
  selected: boolean;
  onSelect: (key: keyof Prefs, val: string) => void;
}) {
  return (
    <button
      type="button"
      data-val={val}
      aria-pressed={selected}
      className={cls}
      onClick={() => onSelect(group, val)}
    >
      {label}
    </button>
  );
}

function applyToDoc(prefs: Prefs) {
  const html = document.documentElement;
  if (prefs.font && prefs.font !== 'sans') html.setAttribute('data-font', prefs.font);
  else html.removeAttribute('data-font');
  html.style.setProperty('--reading-scale', prefs.scale);
  html.style.setProperty('--reading-line-height', prefs.lh);
  html.setAttribute('data-reading-scale', '1');
  html.setAttribute('data-reading-width', prefs.width);
  html.removeAttribute('data-spacing');
  if (prefs.contrast === 'high') html.setAttribute('data-contrast', 'high');
  else html.removeAttribute('data-contrast');
  if (prefs.motion === 'calm') html.setAttribute('data-motion', 'calm');
  else html.removeAttribute('data-motion');
}

export default function ReadingDock({ closeOther }: { closeOther?: () => void }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const dockRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const valid: Partial<Prefs> = {};
        for (const key of Object.keys(DEFAULTS) as (keyof Prefs)[]) {
          if (typeof parsed[key] === 'string') valid[key] = parsed[key];
        }
        setPrefs(p => ({ ...p, ...valid }));
      }
    } catch {}
  }, []);

  // Apply to document whenever prefs change
  useEffect(() => {
    applyToDoc(prefs);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
  }, [prefs]);

  // Close on outside click / Escape
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function set(key: keyof Prefs, val: string) {
    setPrefs(p => ({ ...p, [key]: val }));
  }

  function reset() { setPrefs({ ...DEFAULTS }); }

  const lhLabel = prefs.lh === '1.45' ? 'Tight' : prefs.lh === '1.85' ? 'Airy' : 'Normal';

  function optProps(group: keyof Prefs, val: string) {
    return {
      group,
      val,
      selected: prefs[group] === val,
      onSelect: set,
    };
  }

  return (
    <div className={`reading-dock${open ? ' dock-open' : ''}`} ref={dockRef}>
      <button
        className="dock-trigger"
        aria-label="Reading preferences"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(o => !o);
          if (!open) closeOther?.();
        }}
      >
        <span>Aa</span>
      </button>

      <div className="dock-panel" id="reading-panel" onClick={(e) => e.stopPropagation()}>
        <div className="rp-title">Reading experience</div>

        <div className="rp-row">
          <div className="rp-label">Typeface <span className="val">{FONT_LABELS[prefs.font] ?? prefs.font}</span></div>
          <Seg group="font" cols={3}>
            <Opt {...optProps('font', 'sans')} label="Inter" />
            <Opt {...optProps('font', 'serif')} label="Lora" cls="f-serif" />
            <Opt {...optProps('font', 'hyperlegible')} label="A11y" cls="f-hyperlegible" />
            <Opt {...optProps('font', 'dyslexic')} label="Dyslexic" cls="f-dyslexic" />
            <Opt {...optProps('font', 'mono')} label="Mono" cls="f-mono" />
          </Seg>
        </div>

        <div className="rp-row">
          <div className="rp-label">Text size <span className="val">{Math.round(parseFloat(prefs.scale) * 100)}%</span></div>
          <Seg group="scale">
            <Opt {...optProps('scale', '0.9')} label="A−" />
            <Opt {...optProps('scale', '1')} label="A" />
            <Opt {...optProps('scale', '1.15')} label="A+" />
            <Opt {...optProps('scale', '1.3')} label="A++" />
          </Seg>
        </div>

        <div className="rp-row">
          <div className="rp-label">Line height <span className="val">{lhLabel}</span></div>
          <Seg group="lh" cols={3}>
            <Opt {...optProps('lh', '1.45')} label="Tight" />
            <Opt {...optProps('lh', '1.6')} label="Normal" />
            <Opt {...optProps('lh', '1.85')} label="Airy" />
          </Seg>
        </div>

        <div className="rp-row">
          <div className="rp-label">Width <span className="val">{WIDTH_LABELS[prefs.width] ?? prefs.width}</span></div>
          <Seg group="width" cols={3}>
            <Opt {...optProps('width', 'narrow')} label="Narrow" />
            <Opt {...optProps('width', 'comfy')} label="Comfy" />
            <Opt {...optProps('width', 'wide')} label="Wide" />
          </Seg>
        </div>

        <div className="rp-row">
          <div className="rp-label">Contrast <span className="val">{prefs.contrast === 'high' ? 'High' : 'Brand'}</span></div>
          <Seg group="contrast" cols={2}>
            <Opt {...optProps('contrast', 'brand')} label="Brand" />
            <Opt {...optProps('contrast', 'high')} label="High" />
          </Seg>
        </div>

        <div className="rp-row">
          <div className="rp-label">Motion <span className="val">{prefs.motion === 'calm' ? 'Calm' : 'Full'}</span></div>
          <Seg group="motion" cols={2}>
            <Opt {...optProps('motion', 'full')} label="Full" />
            <Opt {...optProps('motion', 'calm')} label="Calm" />
          </Seg>
        </div>

        <button type="button" className="rp-reset" onClick={reset}>Reset to defaults</button>
      </div>
    </div>
  );
}
