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
  return (
    <div
      style={{
        background: 'var(--theme-elevation-0, #fff)',
        border: '1px solid var(--theme-elevation-150, #d1d5db)',
        borderLeft: `3px solid ${statusColor(post.publish_status)}`,
        borderRadius: 3,
        padding: '3px 6px',
        marginBottom: 3,
        fontSize: 11,
        lineHeight: 1.3,
        cursor: post.draggable ? 'grab' : 'default',
        opacity: post.draggable ? 1 : 0.7,
        boxShadow: isOverlay ? '0 4px 12px rgba(0,0,0,0.25)' : undefined,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={`${post.title}${post.group ? ` · ${post.group}` : ''}`}
    >
      <strong style={{ fontWeight: 600 }}>{post.title}</strong>
      {post.group && (
        <span
          style={{
            marginLeft: 4,
            color: 'var(--theme-elevation-500, #6b7280)',
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 10,
          }}
        >
          {post.group}
        </span>
      )}
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
  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver
          ? 'var(--theme-success-100, #dcfce7)'
          : inMonth
            ? 'var(--theme-elevation-0, #fff)'
            : 'var(--theme-elevation-50, #f9fafb)',
        border: isToday
          ? '2px solid var(--theme-success-500, #1d4ed8)'
          : '1px solid var(--theme-elevation-100, #e5e7eb)',
        padding: 6,
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        opacity: inMonth ? 1 : 0.55,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--theme-elevation-600, #4b5563)',
          marginBottom: 2,
        }}
      >
        {dayNum}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
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
      style={{
        width: 240,
        flexShrink: 0,
        background: isOver
          ? 'var(--theme-elevation-100, #f3f4f6)'
          : 'var(--theme-elevation-50, #f9fafb)',
        border: '1px dashed var(--theme-elevation-150, #d1d5db)',
        borderRadius: 4,
        padding: 8,
        maxHeight: '70vh',
        overflow: 'auto',
      }}
    >
      <h3
        style={{
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: 1,
          margin: '0 0 8px',
          color: 'var(--theme-elevation-600, #374151)',
        }}
      >
        Unscheduled drafts ({drafts.length})
      </h3>
      {drafts.length === 0 && (
        <div
          style={{
            color: 'var(--theme-elevation-400, #9ca3af)',
            fontSize: 12,
            textAlign: 'center',
            padding: '24px 0',
          }}
        >
          (none)
        </div>
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
    <div style={{ padding: 'var(--gutter-h, 24px)', maxWidth: 1480, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0 }}>Calendar</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setAnchor((d) => addMonths(d, -1))}
            style={navBtnStyle}
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setAnchor(startOfMonth(new Date()))}
            style={navBtnStyle}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setAnchor((d) => addMonths(d, 1))}
            style={navBtnStyle}
          >
            Next →
          </button>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              minWidth: 160,
              textAlign: 'right',
              color: 'var(--theme-elevation-700, #1f2937)',
            }}
          >
            {monthLabel}
            {saving && (
              <span
                style={{
                  marginLeft: 8,
                  fontWeight: 400,
                  fontSize: 12,
                  color: 'var(--theme-elevation-500, #6b7280)',
                }}
              >
                saving…
              </span>
            )}
          </div>
        </div>
      </header>
      <p style={{ fontSize: 13, color: 'var(--theme-elevation-600, #4b5563)', marginTop: 0 }}>
        Drag a scheduled post or draft onto a day. Drops write{' '}
        <code>scheduledPublishDate</code> and set <code>publish_status=scheduled</code>.
        Published &amp; sent posts are read-only.
      </p>
      {error && (
        <div
          style={{
            background: 'var(--theme-error-100, #fef2f2)',
            color: 'var(--theme-error-700, #991b1b)',
            border: '1px solid var(--theme-error-200, #fecaca)',
            borderRadius: 4,
            padding: '8px 12px',
            margin: '8px 0 16px',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0,
                marginBottom: 4,
              }}
            >
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: 'var(--theme-elevation-500, #6b7280)',
                    padding: '4px 6px',
                    textAlign: 'left',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridAutoRows: '1fr',
                gap: 0,
              }}
            >
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

const navBtnStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-0, #fff)',
  border: '1px solid var(--theme-elevation-200, #d1d5db)',
  borderRadius: 3,
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer',
  color: 'inherit',
};
