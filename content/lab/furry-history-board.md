---
slug: furry-history-board
title: Furry History Board
description: "How Austen Tucker built an accessible, source-backed interface for exploring selected furry history without turning unlike evidence into fake precision."
lede: "A question-led historical board that keeps timelines, community places, evidence, uncertainty, and an equivalent data table in the same view."
number: 6
exploreDescription: "Open the live board to ask a bounded question, change historical lenses, scrub through 1994–2026, and inspect the evidence behind the visible records."
---

## Why I built it

Furry history is distributed across convention archives, platform histories, personal collections, publications, and community memory. A conventional timeline can flatten that history into one authoritative-looking sequence. A traffic chart can be worse: attendance, registrations, pages, membership, and online activity are not interchangeable measurements.

Furry History Board tests a different approach. A question controls one synchronized historical view, while the interface keeps its evidence and limits visible.

## Build snapshot

- **Range:** 1994–2026
- **Lenses:** Overview, Internet, Publishing, Conventions, and People
- **Data:** immutable local fixtures with evidence attached to events, measurements, places, people, and graph edges
- **Views:** a dated timeline, keyboard-inspectable relative-prominence chart, year scrubber, evidence region, and equivalent semantic table
- **Themes:** System, Light, and Dark with persistent explicit overrides

## What I did

### I made the query layer deterministic

The prototype recognizes a bounded grammar for timeline, places, compare, explain, and unknown intents. It extracts known entities, years, ranges, and lenses. If a question is ambiguous or asks for evidence the sampler cannot support, the board shows that limitation rather than generating a confident answer.

### I separated measurements from interpretation

Source-reported attendance, registration, publication, and membership values keep their original metric kinds. The validator prevents unlike measurements from entering one literal comparison group.

“Where furry lived” uses an explicitly editorial relative-prominence index. Every plotted anchor points to evidence, but the values are not literal user counts, market share, attendance, or MAU.

### I treated the chart and table as equal interfaces

The SVG chart supports keyboard inspection and combines direct labels, line styles, and markers so color is never the only signal. The semantic table exposes the same plotted values, confidence, basis, and source identifiers without requiring visual chart reading.

### I built accessibility into the state model

The evidence region stays visible beside the chart on wider screens. At narrow widths it becomes a full-screen drawer that closes with Escape and returns focus to its trigger. Theme changes preserve the query, lens, year, table, and drawer state.

## What I learned

### Honest uncertainty is a feature

An unknown value is not zero. A missing traffic series is not evidence of irrelevance. Keeping unknown, estimated, disputed, and unavailable states explicit makes the board more useful than a falsely complete visualization.

### A question can organize a view without becoming an oracle

Natural-language input does not require a live language model. A deterministic parser can make common questions faster to explore while keeping the system’s vocabulary, aliases, and limits inspectable.

### Visual prominence still needs a reading contract

Even a carefully labeled index invites ranking. Direct methodology copy, evidence access, confidence labels, and the table all work together to keep the visualization in its proper role: an editorial guide to selected evidence.

## Current best

The current board is a working local-data prototype with a bounded historical sampler, deterministic controls, persistent themes, and multiple equivalent ways to inspect the same evidence.

## Limits and open questions

- The sampler is illustrative, not an exhaustive history of furry communities or people.
- Relative-prominence values are editorial synthesis, not directly observed population or traffic.
- Some early online-community evidence is archival or tertiary and is labeled with lower confidence.
- The project has no live model, backend, authentication, CMS, or remote data pipeline.
- Future research should widen the source base before adding more entities or denser year-by-year trajectories.
