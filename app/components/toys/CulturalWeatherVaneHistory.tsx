"use client";

import { MAX_DIVERGENCE, yearHistory } from "@/data/toys/cultural-weather-vane";
import styles from "./CulturalWeatherVane.module.css";

const X_START = 34;
const X_END = 966;
const MID_Y = 70;
const Y_SCALE = 48;

const x = (i: number) => X_START + (i * (X_END - X_START)) / (yearHistory.length - 1);
const y = (valence: number) => MID_Y - valence * Y_SCALE;

/** Yearly centroid drift: each field's valence over time, with the gap shaded. */
export default function HistoryStrip({ year, onPick }: { year: number; onPick: (year: number) => void }) {
  const musicLine = yearHistory.map((r, i) => `${x(i).toFixed(1)},${y(r.music.valence).toFixed(1)}`).join(" ");
  const newsLine = yearHistory.map((r, i) => `${x(i).toFixed(1)},${y(r.news.valence).toFixed(1)}`).join(" ");
  const band =
    yearHistory.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r.music.valence).toFixed(1)}`).join(" ") +
    " " +
    yearHistory
      .slice()
      .reverse()
      .map((r, i) => `L${x(yearHistory.length - 1 - i).toFixed(1)},${y(r.news.valence).toFixed(1)}`)
      .join(" ") +
    " Z";

  return (
    <section className={styles.historyStrip} aria-labelledby="cultural-weather-history-title">
      <header>
        <span className={styles.summaryLabel} id="cultural-weather-history-title">Weather history — centroid drift</span>
        <span className={styles.historyNote}>valence of each field, year by year</span>
      </header>
      <svg viewBox="0 0 1000 140" preserveAspectRatio="none" role="img" aria-label="Yearly centroid drift">
        <line x1="0" y1={MID_Y} x2="1000" y2={MID_Y} stroke="#3f424d" strokeWidth="1" />
        <path d={band} fill="#423a6a" opacity="0.38" />
        <polyline points={newsLine} fill="none" stroke="#b2b6ca" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <polyline points={musicLine} fill="none" stroke="#d2cefd" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {yearHistory.map((r, i) => {
          const active = r.year === year;
          return (
            <g key={r.year}>
              <rect x={x(i) - 34} y="0" width="68" height="140" fill={active ? "#2b2741" : "transparent"} />
              <foreignObject x={x(i) - 34} y="0" width="68" height="140">
                <button type="button" className={styles.historyButton} aria-label={`Show ${r.year}`} aria-pressed={active} onClick={() => onPick(r.year)}>{r.year}</button>
              </foreignObject>
              <circle cx={x(i)} cy={y(r.music.valence)} r={active ? 5 : 3} fill="#d2cefd" />
              <circle cx={x(i)} cy={y(r.news.valence)} r={active ? 5 : 3} fill="#cfd3e5" />
              <text x={x(i)} y="134" textAnchor="middle" fontSize="16" fill={active ? "#e7e5fe" : "#75798c"}>
                {r.year}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

/** The distance between the two fields' centres of gravity, in context. */
export function DivergenceMeter({ year }: { year: number }) {
  const row = yearHistory.find((r) => r.year === year)!;
  const rank = yearHistory.slice().sort((a, b) => b.divergence - a.divergence).findIndex((r) => r.year === year) + 1;
  const ordinal = rank === 1 ? "the widest gap" : `${rank}${rank === 2 ? "nd" : rank === 3 ? "rd" : "th"} widest`;

  return (
    <div className={styles.divergence}>
      <div className={styles.divergenceHead}>
        <span className={styles.summaryLabel}>Divergence</span>
        <strong>{row.divergence.toFixed(2)}</strong>
      </div>
      <div className={styles.divergenceTrack} aria-label={`Divergence ${row.divergence.toFixed(2)} of ${MAX_DIVERGENCE}`} role="meter" aria-valuemin={0} aria-valuemax={MAX_DIVERGENCE} aria-valuenow={row.divergence}>
        <div className={styles.divergenceFill} style={{ width: `${Math.min(100, (row.divergence / MAX_DIVERGENCE) * 100)}%` }} />
      </div>
      <p>
        Distance between the music and news centres of gravity — {ordinal} of the {yearHistory.length} years sampled.
      </p>
    </div>
  );
}
