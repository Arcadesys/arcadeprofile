import { useEffect, useRef, useState } from "react";
import "./evidence.css";

export type EvidenceConfidence = "high" | "medium" | "low";
export type EvidenceItem = { id: string; title: string; description: string; confidence: EvidenceConfidence; available?: boolean; href?: string; locator?: string; sourceType?: string };
type EvidenceRegionProps = { items: EvidenceItem[]; open: boolean; onOpenChange: (open: boolean) => void; title?: string; showToggle?: boolean };

const confidenceLabel: Record<EvidenceConfidence, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function ChevronIcon({ open }: { open: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d={open ? "M5 15l7-7 7 7" : "M9 5l7 7-7 7"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function EvidenceRegion({ items, open, onOpenChange, title = "Why this view?", showToggle = true }: EvidenceRegionProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousOpen = useRef(open);
  useEffect(() => {
    if (open && !previousOpen.current) closeRef.current?.focus();
    previousOpen.current = open;
  }, [open]);
  useEffect(() => {
    if (!open) { setExpanded(null); triggerRef.current?.focus(); }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (expanded) setExpanded(null); else {
        onOpenChange(false);
        window.requestAnimationFrame(() => (showToggle ? triggerRef.current : document.querySelector<HTMLButtonElement>(".about-data-button"))?.focus());
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded, onOpenChange, open, showToggle]);
  const close = () => {
    onOpenChange(false);
    window.requestAnimationFrame(() => (showToggle ? triggerRef.current : document.querySelector<HTMLButtonElement>(".about-data-button"))?.focus());
  };
  return <>
    {showToggle ? <button className="evidence-toggle" ref={triggerRef} type="button" aria-expanded={open} aria-controls="evidence-region" onClick={() => onOpenChange(!open)}>About the data</button> : null}
    {open && <aside id="evidence-region" className="evidence-region" aria-label={title}>
      <div className="evidence-region__header"><h2>{title}</h2><button ref={closeRef} type="button" aria-label="Close evidence" onClick={close}><CloseIcon /></button></div>
      <p>This view is based on multiple sources and is an interpretation, not a single definitive truth.</p>
      <div className="evidence-list">{items.map((item) => <article className="evidence-card" key={item.id}>
        <button type="button" className="evidence-card__button" aria-expanded={expanded === item.id} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
          <span><strong>{item.title}</strong><span>{item.description}</span></span><ChevronIcon open={expanded === item.id} />
        </button>
        <p className="evidence-card__confidence">{item.available === false ? "Source unavailable" : confidenceLabel[item.confidence]}</p>
        {expanded === item.id && <div className="evidence-card__details">{item.available === false ? <p>This source is currently unavailable; the view remains marked as incomplete.</p> : <><dl><div><dt>Source type</dt><dd>{item.sourceType ?? "Unspecified"}</dd></div>{item.locator ? <div><dt>Locator</dt><dd>{item.locator}</dd></div> : null}</dl>{item.href ? <a href={item.href} target="_blank" rel="noreferrer">Open source</a> : <p>No public link is recorded for this source.</p>}</>}</div>}
      </article>)}</div>
      <p className="evidence-region__footer">Sources help explain this view, not a single definitive truth.</p>
    </aside>}
  </>;
}

