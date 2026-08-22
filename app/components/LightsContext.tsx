'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { getDefaultLightMode, isLightMode, LIGHTS_STORAGE_KEY, type LightMode } from '@/lib/lights';

interface LightsContextValue {
  mode: LightMode;
  toggleLights: () => void;
}

const LightsContext = createContext<LightsContextValue>({ mode: 'on', toggleLights: () => {} });

function readSavedMode(): LightMode | null {
  try {
    const saved = window.localStorage.getItem(LIGHTS_STORAGE_KEY);
    return isLightMode(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function LightsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mode, setMode] = useState<LightMode>('on');

  useEffect(() => {
    const next = readSavedMode() ?? getDefaultLightMode(pathname);
    setMode(next);
    document.documentElement.dataset.lights = next;
  }, [pathname]);

  function toggleLights() {
    setMode((current) => {
      const next = current === 'on' ? 'off' : 'on';
      document.documentElement.dataset.lights = next;
      try { window.localStorage.setItem(LIGHTS_STORAGE_KEY, next); } catch {}
      return next;
    });
  }

  return <LightsContext.Provider value={{ mode, toggleLights }}>{children}</LightsContext.Provider>;
}

export function useLights() {
  return useContext(LightsContext);
}
