'use client';

import ReadingDock from './ReadingDock';
import LightsToggle from './LightsToggle';

export default function DockStack() {
  return (
    <div className="dock-stack">
      <ReadingDock />
      <LightsToggle />
    </div>
  );
}
