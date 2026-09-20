import { FormEvent, useState } from "react";
import { parseQuery, type ParsedQuery } from "./parser";
import "./query.css";

type QueryBarProps = {
  initialValue?: string;
  onSubmit: (query: ParsedQuery) => void;
  disabled?: boolean;
};

export function QueryBar({ initialValue = "", onSubmit, disabled = false }: QueryBarProps) {
  const [draft, setDraft] = useState(initialValue);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(parseQuery(draft));
  }
  return <form className="query-bar" onSubmit={submit} aria-label="Ask furry history">
    <label htmlFor="history-query">Ask furry history anything</label>
    <div className="query-bar__controls">
      <div className="query-bar__input-wrap"><input id="history-query" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="When did Fur Affinity become dominant?" disabled={disabled} />
      {draft ? <button type="button" className="query-bar__clear" aria-label="Clear query" onClick={() => setDraft("")}><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button> : null}</div>
      <button type="submit" className="query-bar__submit" disabled={disabled}>Explore history <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d="M5 12h14M14 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    </div>
  </form>;
}

