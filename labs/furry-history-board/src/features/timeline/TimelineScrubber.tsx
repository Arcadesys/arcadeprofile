import { useEffect, useId, useRef } from "react";
import "./timeline.css";

type TimelineScrubberProps = { min: number; max: number; value: number; onChange: (year: number) => void };

export function TimelineScrubber({ min, max, value, onChange }: TimelineScrubberProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.setAttribute("aria-valuetext", `${value}`); }, [value]);
  return <div className="timeline-scrubber">
    <button type="button" aria-label="Previous year" onClick={() => onChange(Math.max(min, value - 1))}><svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M14 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    <label htmlFor={id}>Selected year: <strong>{value}</strong></label>
    <input ref={inputRef} id={id} type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} />
    <span aria-hidden="true">{min}</span><span aria-hidden="true">{max}</span>
    <button type="button" aria-label="Next year" onClick={() => onChange(Math.min(max, value + 1))}><svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M10 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    <p className="timeline-scrubber__hint">Use left and right arrow keys to move through years.</p>
  </div>;
}

