'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme, type ThemeName } from './ThemeContext';

const SWATCHES: { name: ThemeName; label: string; cls: string }[] = [
  { name: 'neon',    label: 'Neon',    cls: 's-neon' },
  { name: 'eclipse', label: 'Eclipse', cls: 's-eclipse' },
  { name: 'crt',     label: 'CRT',     cls: 's-crt' },
  { name: 'rain',    label: 'Rain',    cls: 's-rain' },
  { name: 'stars',   label: 'Stars',   cls: 's-stars' },
  { name: 'dawn',    label: 'Dawn',    cls: 's-dawn' },
];

export default function ThemeDock() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
      if (/input|textarea/i.test((e.target as HTMLElement)?.tagName || '')) return;
      const map: Record<string, ThemeName> = { '1':'neon','2':'eclipse','3':'crt','4':'rain','5':'stars','6':'dawn' };
      if (map[e.key]) setTheme(map[e.key]);
    }
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [setTheme]);

  return (
    <div className={`theme-dock${open ? ' dock-open' : ''}`} ref={dockRef}>
      <button
        className="dock-trigger"
        aria-label="Choose background theme"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
      />
      <div className="dock-panel">
        <div className="dock-label">Background</div>
        <div className="swatches">
          {SWATCHES.map(s => (
            <button
              key={s.name}
              className={`swatch-btn ${s.cls}`}
              data-set={s.name}
              aria-pressed={theme === s.name}
              title={s.label}
              onClick={() => { setTheme(s.name); setOpen(false); }}
            >
              <span className="swatch-name">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
