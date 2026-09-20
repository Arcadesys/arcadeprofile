"use client";

import { useEffect, useMemo, useState } from "react";
import WeatherField, { mediaUrl, type FieldMode } from "./CulturalWeatherVaneField";
import HistoryStrip, { DivergenceMeter } from "./CulturalWeatherVaneHistory";
import { news, songs, years, yearWeather, type NewsPoint, type SongPoint } from "@/data/toys/cultural-weather-vane";
import styles from "./CulturalWeatherVane.module.css";

type Selection = { point: SongPoint | NewsPoint; kind: "music" | "news" };
type MediaMetadata = { provider?: string | null; sourceUrl?: string | null };

export default function CulturalWeatherVane() {
  const [year, setYear] = useState(2020);
  const [mode, setMode] = useState<FieldMode>("field");
  const [selected, setSelected] = useState<Selection | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [metadataState, setMetadataState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const yearSongs = useMemo(() => songs.filter((s) => s.year === year), [year]);
  const yearNews = useMemo(() => news.filter((n) => n.year === year), [year]);
  const weather = yearWeather.find((w) => w.year === year) ?? yearWeather[0];
  const pickYear = (next: number) => { setYear(next); setSelected(null); };

  useEffect(() => {
    if (!selected) { setMetadata(null); setMetadataState("idle"); return; }
    const controller = new AbortController();
    setMetadata(null);
    setMetadataState("loading");
    const params = new URLSearchParams(new URL(mediaUrl(selected.point, selected.kind), window.location.origin).search);
    params.set("mode", "metadata");
    fetch(`/api/cultural-weather/media?${params.toString()}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("metadata request failed"); return response.json() as Promise<MediaMetadata>; })
      .then((value) => { if (!controller.signal.aborted) { setMetadata(value); setMetadataState("ready"); } })
      .catch((error: unknown) => { if (!controller.signal.aborted && (error instanceof Error ? error.name !== "AbortError" : true)) setMetadataState("error"); });
    return () => controller.abort();
  }, [selected]);

  return (
    <main className={styles.pageShell} aria-labelledby="cultural-weather-title">
      <header className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>Cultural Weather Vane</div>
          <h1 id="cultural-weather-title">What did the culture <em>feel</em> like?</h1>
          <p className={styles.dek}>A navigable field of music and news, mapped as atmosphere rather than verdict. Twelve years, six records and six events each.</p>
        </div>
        <div className={styles.topbarControls}>
          <div className={styles.legend} aria-label="Plot legend"><span><i className={`${styles.dot} ${styles.music}`} /> album covers</span><span><i className={`${styles.dot} ${styles.news}`} /> lead photos</span></div>
          <div className={styles.modeToggle} role="group" aria-label="View">
            <button type="button" className={mode === "field" ? styles.active : undefined} aria-pressed={mode === "field"} onClick={() => setMode("field")}>Field</button>
            <button type="button" className={mode === "drift" ? styles.active : undefined} aria-pressed={mode === "drift"} onClick={() => setMode("drift")}>Drift</button>
          </div>
        </div>
      </header>

      <section className={styles.yearPanel} aria-live="polite">
        <div className={styles.yearReadout}>{year}</div>
        <div className={styles.weatherCopy}><div className={styles.weatherKicker}>Cultural weather report</div><h2>{weather.headline}</h2><p>{weather.report}</p></div>
      </section>

      <WeatherField songs={yearSongs} news={yearNews} allSongs={songs} allNews={news} years={years} year={year} mode={mode} selectedId={selected?.point.id ?? null} onSelect={(point, kind) => setSelected({ point, kind })} />

      <section className={styles.browsePanel} aria-labelledby="browse-plotted-media">
        <button type="button" className={styles.browseToggle} aria-expanded={browseOpen} aria-controls="browse-plotted-media-list" onClick={() => setBrowseOpen((open) => !open)}>
          <span id="browse-plotted-media">Browse plotted media</span><span aria-hidden="true">{browseOpen ? "−" : "+"}</span>
        </button>
        {browseOpen && <div id="browse-plotted-media-list" className={styles.browseList}>{[...yearSongs.map((point) => ({ point, kind: "music" as const })), ...yearNews.map((point) => ({ point, kind: "news" as const }))].map(({ point, kind }) => <button type="button" key={point.id} aria-pressed={selected?.point.id === point.id} onClick={() => setSelected({ point, kind })}><img src={mediaUrl(point, kind)} alt="" /><span><strong>{point.title}</strong><small>{kind === "music" ? (point as SongPoint).artist : "News event"}</small></span></button>)}</div>}
      </section>

      <section className={styles.timelineWrap} aria-label="Choose a year">
        <input aria-label="Year" type="range" min={0} max={years.length - 1} value={years.indexOf(year)} onChange={(event) => pickYear(years[Number(event.target.value)])} />
        <div className={styles.yearTicks}>{years.map((candidate) => <button type="button" key={candidate} className={candidate === year ? styles.active : undefined} aria-pressed={candidate === year} onClick={() => pickYear(candidate)}>{candidate}</button>)}</div>
      </section>

      <HistoryStrip year={year} onPick={pickYear} />
      <section className={styles.summaryGrid}>
        <article><span className={styles.summaryLabel}>Music front</span><p>{weather.musicSummary}</p></article>
        <article><span className={styles.summaryLabel}>News front</span><p>{weather.newsSummary}</p></article>
        <article><DivergenceMeter year={year} /></article>
        <article><span className={styles.summaryLabel}>Reading the map</span><p>Horizontal is activation, vertical is valence. Square album covers are records, landscape lead photos are events; size is prominence and halos mark each field&rsquo;s weighted centre. The dashed line is the year&rsquo;s divergence.</p></article>
      </section>

      {selected && <aside className={styles.detailCard} aria-label="Selected media" aria-live="polite"><button type="button" className={styles.close} onClick={() => setSelected(null)} aria-label="Close selected media">×</button><img className={`${styles.detailMedia} ${selected.kind === "music" ? styles.music : ""}`} src={mediaUrl(selected.point, selected.kind)} alt={selected.kind === "music" ? `Album artwork for ${selected.point.title}` : `Lead image for ${selected.point.title}`} /><div className={styles.detailKind}>{selected.kind} · {selected.point.year}</div><h3>{selected.point.title}</h3>{"artist" in selected.point && <p className={styles.artist}>{selected.point.artist}</p>}<p className={styles.metadataStatus}>{metadataState === "loading" ? "Loading source details…" : metadataState === "error" ? "Source details unavailable." : metadata?.provider ? `Source: ${metadata.provider}` : ""}</p>{metadata?.sourceUrl && <a className={styles.sourceLink} href={metadata.sourceUrl} target="_blank" rel="noreferrer">Open source</a>}<div className={styles.tagRow}>{selected.point.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><dl><div><dt>Activation</dt><dd>{selected.point.activation.toFixed(2)}</dd></div><div><dt>Valence</dt><dd>{selected.point.valence.toFixed(2)}</dd></div><div><dt>Prominence</dt><dd>{selected.point.prominence.toFixed(2)}</dd></div>{"mode" in selected.point && <div><dt>Mode</dt><dd>{selected.point.mode}</dd></div>}</dl></aside>}
      <footer className={styles.footer}><p><strong>On the data:</strong> songs are drawn from Billboard year-end charts and events from the year&rsquo;s dominant stories, six of each. Activation, valence and prominence are editorial readings, not measurements.</p></footer>
    </main>
  );
}
