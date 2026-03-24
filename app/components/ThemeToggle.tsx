'use client';

import { useCosmosTime } from './CosmosContext';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { cosmosTime, toggle } = useCosmosTime();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  // eclipse icon — occluder shifts as cosmosTime changes
  const occX = 14 + cosmosTime * 11;
  const occY = 14 - cosmosTime * 3;
  const ringR = 255 - Math.round(cosmosTime * 200);
  const ringG = 138 + Math.round(cosmosTime * 60);
  const ringB = Math.round(cosmosTime * 200);
  const ringColor = `rgb(${ringR},${ringG},${ringB})`;
  const occR = Math.round(cosmosTime * 255);
  const occG = Math.round(cosmosTime * 253);
  const occBl = Math.round(cosmosTime * 232);
  const occColor = `rgb(${occR},${occG},${occBl})`;

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 z-50 p-2 rounded-full"
      style={{
        background: `rgba(${Math.round(cosmosTime * 240)},${Math.round(cosmosTime * 240)},${Math.round(cosmosTime * 220)},${0.15 + cosmosTime * 0.3})`,
        border: `1px solid rgba(${ringR},${ringG},${ringB},0.3)`,
        backdropFilter: 'blur(8px)',
      }}
      aria-label={cosmosTime < 0.5 ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <svg viewBox="0 0 28 28" width="28" height="28">
        <circle cx="14" cy="14" r="10" fill="none" stroke={ringColor} strokeWidth="1.5" opacity="0.9"/>
        <circle cx={occX} cy={occY} r="8.5" fill={occColor}/>
      </svg>
    </button>
  );
}
