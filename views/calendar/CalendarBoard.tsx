'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface CalendarPost {
  id: string;
  title: string;
  slug: string | null;
  group: string | null;
  publish_status: 'draft' | 'scheduled' | 'published' | 'sent' | null;
  date: string;
  draggable: boolean;
}

interface CalendarResponse {
  start: string;
  end: string;
  scheduled: CalendarPost[];
  drafts: CalendarPost[];
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function buildMonthGrid(anchor: Date): { days: Date[]; start: string; end: string } {
  const first = startOfMonth(anchor);
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return {
    days,
    start: isoDay(days[0]),
    end: isoDay(days[days.length - 1]),
  };
}

function statusColor(status: CalendarPost['publish_status']): string {
  if (status === 'scheduled') return 'var(--theme-success-500, #1d4ed8)';
  if (status === 'published') return 'var(--theme-success-700, #15803d)';
  if (status === 'sent') return '#7e22ce';
  return 'var(--theme-elevation-400, #6b7280)';
}

function Chip({
  post,
  isOverlay,
}: {
  post: CalendarPost;
  isOverlay?: boolean;
}) {
  const tooltip = `${post.title}${post.group ? ` · ${post.group}` : ''}`;
  return (
    <div
      className="calendar-chip"
      style={{
        borderLeft: `3px solid ${statusColor(post.publish_status)}`,
        cursor: post.draggable ? 'grab' : 'default',
        opacity: post.draggable ? 1 : 0.7,
        boxShadow: isOverlay ? '0 4px 12px rgba(0,0,0,0.25)' : undefined,
      }}
      title={tooltip}
      data-tooltip={tooltip}
    >
      <strong className="calendar-chip__title">{post.title}</strong>
      {post.group && <span className="calendar-chip__group">{post.group}</span>}
    </div>
  );
}

function DraggableChip({ post }: { post: CalendarPost }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
    disabled: !post.draggable,
    data: { post },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      {...attributes}
      {...listeners}
    >
      <Chip post={post} />
    </div>
  );
}

function DayCell({
  date,
  inMonth,
  isToday,
  posts,
}: {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  posts: CalendarPost[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${date}` });
  const dayNum = parseInt(date.slice(8, 10), 10);
  const classNames = [
    'calendar-day',
    inMonth ? 'calendar-day--in-month' : 'calendar-day--out-month',
    isToday ? 'calendar-day--today' : '',
    isOver ? 'calendar-day--over' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div ref={setNodeRef} className={classNames}>
      <div className="calendar-day__num">{dayNum}</div>
      <div className="calendar-day__list">
        {posts.map((p) => (
          <DraggableChip key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}

function UnscheduledTray({ drafts }: { drafts: CalendarPost[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'tray-unscheduled' });
  return (
    <aside
      ref={setNodeRef}
      className={`calendar-tray${isOver ? ' calendar-tray--over' : ''}`}
    >
      <h3 className="calendar-tray__heading">
        Unscheduled drafts ({drafts.length})
      </h3>
      {drafts.length === 0 && (
        <div className="calendar-tray__empty">(none)</div>
      )}
      {drafts.map((p) => (
        <DraggableChip key={p.id} post={p} />
      ))}
    </aside>
  );
}

export default function CalendarBoard() {
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activePost, setActivePost] = useState<CalendarPost | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const grid = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const todayIso = useMemo(() => isoDay(new Date()), []);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `/api/calendar/posts?start=${grid.start}&end=${grid.end}`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        setError(`GET failed: ${res.status}`);
        return;
      }
      setData((await res.json()) as CalendarResponse);
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    }
  }, [grid.start, grid.end]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const persistDate = useCallback(
    async (postId: string, date: string) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/hopper/post-date', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, date }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          setError(json.error ?? `POST failed: ${res.status}`);
        }
        await fetchData();
      } catch (err) {
        setError(`Network error: ${(err as Error).message}`);
      } finally {
        setSaving(false);
      }
    },
    [fetchData],
  );

  const postsByDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    if (!data) return map;
    for (const p of data.scheduled) {
      const list = map.get(p.date) ?? [];
      list.push(p);
      map.set(p.date, list);
    }
    return map;
  }, [data]);

  const onDragStart = (event: DragStartEvent) => {
    const post = event.active.data.current?.post as CalendarPost | undefined;
    setActivePost(post ?? null);
    setError(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActivePost(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith('day-')) return;
    const targetDate = overId.slice(4);
    const post = active.data.current?.post as CalendarPost | undefined;
    if (!post) return;
    if (!post.draggable) return;
    if (post.date === targetDate) return;
    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const moved = { ...post, date: targetDate, publish_status: 'scheduled' as const };
      const fromDrafts = prev.drafts.some((d) => d.id === post.id);
      return {
        ...prev,
        scheduled: [
          ...prev.scheduled.filter((p) => p.id !== post.id),
          moved,
        ],
        drafts: fromDrafts ? prev.drafts.filter((d) => d.id !== post.id) : prev.drafts,
      };
    });
    void persistDate(post.id, targetDate);
  };

  const monthLabel = anchor.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="calendar-board">
      <style>{CALENDAR_CSS}</style>
      <header className="calendar-header">
        <h1 className="calendar-header__title">Calendar</h1>
        <div className="calendar-header__controls">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => setAnchor((d) => addMonths(d, -1))}
          >
            ← Prev
          </button>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => setAnchor(startOfMonth(new Date()))}
          >
            Today
          </button>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => setAnchor((d) => addMonths(d, 1))}
          >
            Next →
          </button>
          <div className="calendar-header__month">
            {monthLabel}
            {saving && <span className="calendar-header__saving">saving…</span>}
          </div>
        </div>
      </header>
      <p className="calendar-help">
        Drag a scheduled post or draft onto a day. Drops write{' '}
        <code>scheduledPublishDate</code> and set <code>publish_status=scheduled</code>.
        Published &amp; sent posts are read-only.
        {data && (
          <span className="calendar-help__meta">
            · {data.scheduled.length} on calendar, {data.drafts.length} drafts
          </span>
        )}
      </p>
      {error && <div className="calendar-error">{error}</div>}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="calendar-layout">
          <div className="calendar-grid-wrap">
            <div className="calendar-weekdays">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="calendar-weekdays__cell">
                  {label}
                </div>
              ))}
            </div>
            <div className="calendar-grid">
              {grid.days.map((d) => {
                const iso = isoDay(d);
                const inMonth = d.getMonth() === anchor.getMonth();
                return (
                  <DayCell
                    key={iso}
                    date={iso}
                    inMonth={inMonth}
                    isToday={iso === todayIso}
                    posts={postsByDay.get(iso) ?? []}
                  />
                );
              })}
            </div>
          </div>
          <UnscheduledTray drafts={data?.drafts ?? []} />
        </div>
        <DragOverlay>
          {activePost ? <Chip post={activePost} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

const CALENDAR_CSS = `
.calendar-board {
  padding: var(--gutter-h, 24px);
  max-width: 1480px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  gap: 12px;
  flex-wrap: wrap;
}
.calendar-header__title { margin: 0; }
.calendar-header__controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.calendar-header__month {
  font-size: 14px;
  font-weight: 600;
  min-width: 160px;
  text-align: right;
  color: var(--theme-elevation-700, #1f2937);
}
.calendar-header__saving {
  margin-left: 8px;
  font-weight: 400;
  font-size: 12px;
  color: var(--theme-elevation-500, #6b7280);
}
.calendar-nav-btn {
  background: var(--theme-elevation-0, #fff);
  border: 1px solid var(--theme-elevation-200, #d1d5db);
  border-radius: 3px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: inherit;
}
.calendar-help {
  font-size: 13px;
  color: var(--theme-elevation-600, #4b5563);
  margin-top: 0;
}
.calendar-help__meta {
  margin-left: 8px;
  color: var(--theme-elevation-500, #6b7280);
}
.calendar-error {
  background: var(--theme-error-100, #fef2f2);
  color: var(--theme-error-700, #991b1b);
  border: 1px solid var(--theme-error-200, #fecaca);
  border-radius: 4px;
  padding: 8px 12px;
  margin: 8px 0 16px;
  font-size: 13px;
}
.calendar-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.calendar-grid-wrap {
  flex: 1;
  min-width: 0;
}
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}
.calendar-weekdays__cell {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--theme-elevation-500, #6b7280);
  padding: 4px 6px;
  text-align: left;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 1fr;
}
.calendar-day {
  border: 1px solid var(--theme-elevation-100, #e5e7eb);
  background: var(--theme-elevation-0, #fff);
  padding: 6px;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.calendar-day--out-month {
  background: var(--theme-elevation-50, #f9fafb);
  opacity: 0.55;
}
.calendar-day--today {
  border: 2px solid var(--theme-success-500, #1d4ed8);
}
.calendar-day--over {
  background: var(--theme-success-100, #dcfce7);
}
.calendar-day__num {
  font-size: 11px;
  font-weight: 600;
  color: var(--theme-elevation-600, #4b5563);
  margin-bottom: 2px;
}
.calendar-day__list { flex: 1; min-width: 0; overflow: auto; }

.calendar-tray {
  width: 240px;
  flex-shrink: 0;
  background: var(--theme-elevation-50, #f9fafb);
  border: 1px dashed var(--theme-elevation-150, #d1d5db);
  border-radius: 4px;
  padding: 8px;
  max-height: 70vh;
  overflow: auto;
}
.calendar-tray--over { background: var(--theme-elevation-100, #f3f4f6); }
.calendar-tray__heading {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 8px;
  color: var(--theme-elevation-600, #374151);
}
.calendar-tray__empty {
  color: var(--theme-elevation-400, #9ca3af);
  font-size: 12px;
  text-align: center;
  padding: 24px 0;
}

.calendar-chip {
  position: relative;
  background: var(--theme-elevation-0, #fff);
  border: 1px solid var(--theme-elevation-150, #d1d5db);
  border-radius: 3px;
  padding: 3px 6px;
  margin-bottom: 3px;
  font-size: 11px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.calendar-chip__title { font-weight: 600; }
.calendar-chip__group {
  margin-left: 4px;
  color: var(--theme-elevation-500, #6b7280);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
}
/* Custom hover tooltip — instant, shows full title even when chip is truncated */
.calendar-chip:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 0;
  top: 100%;
  margin-top: 4px;
  z-index: 50;
  background: var(--theme-elevation-800, #1f2937);
  color: var(--theme-elevation-0, #fff);
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 400;
  white-space: normal;
  max-width: 260px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  pointer-events: none;
}

/* Responsive: at narrow viewports (or high browser zoom), drop the side tray
   under the calendar and shrink day cells so the whole month stays visible. */
@media (max-width: 1100px) {
  .calendar-day { min-height: 90px; }
}
@media (max-width: 900px) {
  .calendar-layout { flex-direction: column; }
  .calendar-tray {
    width: 100%;
    max-height: none;
    box-sizing: border-box;
  }
  .calendar-day { min-height: 80px; padding: 4px; }
  .calendar-day__num { font-size: 10px; }
  .calendar-chip { font-size: 10px; padding: 2px 4px; }
  .calendar-chip__group { display: none; }
}
@media (max-width: 600px) {
  .calendar-board { padding: 8px; }
  .calendar-header__month {
    min-width: 0;
    text-align: left;
    width: 100%;
  }
  .calendar-weekdays__cell { font-size: 9px; padding: 2px 3px; }
  .calendar-day { min-height: 64px; padding: 3px; }
  .calendar-day__num { font-size: 9px; }
  .calendar-chip { font-size: 9px; padding: 1px 3px; line-height: 1.2; }
}
`;
