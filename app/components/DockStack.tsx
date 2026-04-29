'use client';

import { useRef } from 'react';
import ThemeDock from './ThemeDock';
import ReadingDock from './ReadingDock';

export default function DockStack() {
  const themeDockRef = useRef<{ close: () => void }>(null);

  return (
    <div className="dock-stack">
      <ReadingDock />
      <ThemeDock />
    </div>
  );
}
