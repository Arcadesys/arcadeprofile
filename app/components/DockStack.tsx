'use client';

import ThemeDock from './ThemeDock';
import ReadingDock from './ReadingDock';

export default function DockStack() {
  return (
    <div className="dock-stack">
      <ReadingDock />
      <ThemeDock />
    </div>
  );
}
