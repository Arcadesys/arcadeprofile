'use client';
import { useCosmosTime } from './CosmosContext';
import { useEffect, useState, useRef } from 'react';
import styles from './CosmosSlider.module.css';

function lerpHex(a: string, b: string, t: number): string {
  const p = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [ar, ag, ab] = p(a);
  const [br, bg, bb] = p(b);
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}

export default function CosmosSlider() {
  const { cosmosTime, setCosmosTime } = useCosmosTime();
  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const t = cosmosTime;
  // Eclipse icon: occluder shifts away as t increases, revealing the ring
  const occX = 14 + t * 11;
  const occY = 14 - t * 3;
  const ringColor = lerpHex('#9a9ab0', '#FFB347', t);
  const occColor = lerpHex('#0a0a14', '#1a1525', t);
  const ringGlow = t > 0.5
    ? `drop-shadow(0 0 3px rgba(255,180,60,${0.3 + t * 0.3}))`
    : `drop-shadow(0 0 2px rgba(160,160,200,${0.2 + t * 0.2}))`;

  return (
    <div className={styles.container}>
      <div className={styles.icon} title="Shift the cosmos">
        <svg viewBox="0 0 28 28" width="28" height="28" style={{ filter: ringGlow }}>
          <circle cx="14" cy="14" r="10" fill="none" stroke={ringColor} strokeWidth="1.5" opacity="0.9"/>
          <circle cx={occX} cy={occY} r="8.5" fill={occColor}/>
        </svg>
      </div>
      <div
        ref={trackRef}
        className={`${styles.track} ${dragging ? styles.dragging : ''}`}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.004"
          value={cosmosTime}
          onChange={(e) => setCosmosTime(parseFloat(e.target.value))}
          onMouseDown={() => setDragging(true)}
          onMouseUp={() => setDragging(false)}
          onTouchStart={() => setDragging(true)}
          onTouchEnd={() => setDragging(false)}
          className={styles.slider}
          aria-label="Cosmos time — drag to shift between night and day"
        />
      </div>
    </div>
  );
}
