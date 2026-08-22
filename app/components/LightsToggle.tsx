'use client';

import { useLights } from './LightsContext';

export default function LightsToggle() {
  const { mode, toggleLights } = useLights();
  const on = mode === 'on';

  return (
    <div className="lights-toggle">
      <button
        type="button"
        className="dock-trigger"
        aria-label={on ? 'Turn lights off' : 'Turn lights on'}
        aria-pressed={on}
        onClick={toggleLights}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9 18h6M10 22h4M8.1 14.4A6 6 0 1 1 15.9 14.4C14.8 15.2 14.2 16.1 14 18h-4c-.2-1.9-.8-2.8-1.9-3.6Z" />
        </svg>
        <span>Lights</span>
      </button>
    </div>
  );
}
