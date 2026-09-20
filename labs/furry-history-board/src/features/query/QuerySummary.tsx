import type { ParsedQuery } from "./parser";
import "./query.css";

export function QuerySummary({ query }: { query: ParsedQuery | null }) {
  if (!query) return null;
  const message = query.raw.trim() ? `Showing ${query.lens.toLowerCase()} history from ${query.yearStart} to ${query.yearEnd}.` : `Showing the full ${query.lens.toLowerCase()} history.`;
  return <section className="query-summary" aria-live="polite" aria-label="Query summary">
    <p>{message}</p>
    {query.warnings.map((warning) => <p className="query-summary__warning" role="status" key={warning}>{warning}</p>)}
  </section>;
}

