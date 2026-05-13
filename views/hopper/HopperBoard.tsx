'use client';

import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Lane = 'fiction' | 'essays';

interface PostSummary {
  id: string;
  slug: string | null;
  title: string;
  publish_status: 'draft' | 'scheduled' | 'published' | 'sent' | null;
  group: string | null;
  audience: Lane;
  scheduledPublishDate: string | null;
  computedPublishDate: string | null;
  weekdayLabel: string | null;
}

interface QueueResponse {
  fiction: PostSummary[];
  essays: PostSummary[];
  unqueued: PostSummary[];
  fictionShipped: PostSummary[];
  essaysShipped: PostSummary[];
  today: string;
}

type ColumnKey = 'fiction' | 'essays' | 'unqueued';

const COLUMN_LABELS: Record<ColumnKey, string> = {
  fiction: 'Fiction (Mon · Wed · Fri)',
  essays: 'Essays (Tue · Thu)',
  unqueued: 'Unqueued drafts',
};

function statusColor(status: PostSummary['publish_status']): string {
  if (status === 'scheduled') return 'var(--theme-success-500, #1d4ed8)';
  if (status === 'published') return 'var(--theme-success-700, #15803d)';
  if (status === 'sent') return '#7e22ce';
  return 'var(--theme-elevation-400, #6b7280)';
}

function findColumn(state: QueueResponse, postId: string): ColumnKey | null {
  if (state.fiction.some((p) => p.id === postId)) return 'fiction';
  if (state.essays.some((p) => p.id === postId)) return 'essays';
  if (state.unqueued.some((p) => p.id === postId)) return 'unqueued';
  return null;
}

function moveItem(
  state: QueueResponse,
  postId: string,
  toColumn: ColumnKey,
  toIndex: number,
): QueueResponse {
  const fromColumn = findColumn(state, postId);
  if (!fromColumn) return state;
  const next: QueueResponse = {
    ...state,
    fiction: [...state.fiction],
    essays: [...state.essays],
    unqueued: [...state.unqueued],
  };
  const fromList = next[fromColumn];
  const fromIndex = fromList.findIndex((p) => p.id === postId);
  if (fromIndex < 0) return state;
  const [item] = fromList.splice(fromIndex, 1);
  if (!item) return state;
  const toList = next[toColumn];
  const insertAt = Math.max(0, Math.min(toIndex, toList.length));
  toList.splice(insertAt, 0, item);
  return next;
}

function Card({
  post,
  dated,
  isOverlay,
  isShipped,
}: {
  post: PostSummary;
  dated: boolean;
  isOverlay?: boolean;
  isShipped?: boolean;
}) {
  const stale =
    dated &&
    !isShipped &&
    post.computedPublishDate &&
    post.scheduledPublishDate &&
    post.scheduledPublishDate.slice(0, 10) !== post.computedPublishDate;
  return (
    <div
      style={{
        background: 'var(--theme-elevation-0, #fff)',
        border: '1px solid var(--theme-elevation-150, #d1d5db)',
        borderRadius: 4,
        padding: '10px 12px',
        marginBottom: 8,
        boxShadow: isOverlay ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 0 rgba(0,0,0,0.02)',
        cursor: isShipped ? 'default' : 'grab',
        opacity: isShipped ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <strong style={{ fontSize: 14, lineHeight: 1.3 }}>{post.title}</strong>
        <span
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: '#fff',
            background: statusColor(post.publish_status),
            borderRadius: 3,
            padding: '2px 6px',
            whiteSpace: 'nowrap',
          }}
        >
          {post.publish_status ?? 'draft'}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, color: 'var(--theme-elevation-500, #6b7280)', marginTop: 4 }}>
        {post.slug ?? '(no slug)'}
        {post.group ? ` · ${post.group}` : ''}
      </div>
      {dated && post.weekdayLabel && post.computedPublishDate && (
        <div style={{ fontSize: 12, color: 'var(--theme-text, #374151)', marginTop: 6 }}>
          {post.weekdayLabel} · {post.computedPublishDate}
          {stale && <span style={{ marginLeft: 6, color: '#b45309' }}>⚠ pending sync</span>}
        </div>
      )}
      {!dated && (
        <div style={{ fontSize: 12, color: 'var(--theme-elevation-500, #9ca3af)', marginTop: 6 }}>
          audience: {post.audience}
        </div>
      )}
    </div>
  );
}

function SortableCard({ post, dated }: { post: PostSummary; dated: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: post.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <Card post={post} dated={dated} />
    </div>
  );
}

function DroppableColumn({
  columnKey,
  items,
  shippedItems,
  dated,
}: {
  columnKey: ColumnKey;
  items: PostSummary[];
  shippedItems?: PostSummary[];
  dated: boolean;
}) {
  // We use a sentinel id to make empty columns droppable via useSortable.
  const { setNodeRef } = useSortable({ id: `__column_${columnKey}` });
  const ids = useMemo(() => items.map((p) => p.id), [items]);
  const shipped = shippedItems ?? [];
  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--theme-elevation-600, #374151)', margin: '0 0 8px' }}>
        {COLUMN_LABELS[columnKey]}
      </h3>
      {shipped.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {shipped.map((p) => (
            <Card key={p.id} post={p} dated={dated} isShipped />
          ))}
        </div>
      )}
      <SortableContext id={columnKey} items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          data-column={columnKey}
          style={{
            background: 'var(--theme-elevation-50, #f9fafb)',
            border: '1px dashed var(--theme-elevation-150, #d1d5db)',
            borderRadius: 4,
            padding: 8,
            minHeight: 140,
          }}
        >
          {items.length === 0 && (
            <div style={{ color: 'var(--theme-elevation-400, #9ca3af)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
              (empty)
            </div>
          )}
          {items.map((p) => (
            <SortableCard key={p.id} post={p} dated={dated} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function HopperBoard() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/hopper/queue', { credentials: 'include' });
      if (!res.ok) {
        setError(`GET failed: ${res.status}`);
        return;
      }
      setData((await res.json()) as QueueResponse);
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const persist = useCallback(
    async (snapshot: QueueResponse) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/hopper/queue', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fictionQueue: snapshot.fiction.map((p) => p.id),
            essaysQueue: snapshot.essays.map((p) => p.id),
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          setError(json.error ?? `POST failed: ${res.status}`);
          await fetchData();
          return;
        }
        setData((await res.json()) as QueueResponse);
      } catch (err) {
        setError(`Network error: ${(err as Error).message}`);
        await fetchData();
      } finally {
        setSaving(false);
      }
    },
    [fetchData],
  );

  const resolveColumnFromOver = (overId: string, state: QueueResponse): ColumnKey | null => {
    if (overId.startsWith('__column_')) {
      const k = overId.replace('__column_', '');
      if (k === 'fiction' || k === 'essays' || k === 'unqueued') return k;
      return null;
    }
    return findColumn(state, overId);
  };

  const onDragStart = (_event: DragStartEvent) => {
    setError(null);
  };

  const onDragOver = (event: DragOverEvent) => {
    if (!data) return;
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;
    const overColumn = resolveColumnFromOver(overId, data);
    const activeColumn = findColumn(data, activeId);
    if (!overColumn || !activeColumn) return;
    const overList = data[overColumn];
    let overIndex: number;
    if (overId.startsWith('__column_')) {
      overIndex = overList.length;
    } else {
      overIndex = overList.findIndex((p) => p.id === overId);
      if (overIndex < 0) overIndex = overList.length;
    }
    // Update state for both cross-column moves and intra-column reorders so
    // siblings shift live during the drag. Persist only on drop.
    const next = moveItem(data, activeId, overColumn, overIndex);
    if (next !== data) setData(next);
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (!data) return;
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const overColumn = resolveColumnFromOver(overId, data);
    if (!overColumn) return;
    const overList = data[overColumn];
    let newIndex: number;
    if (overId.startsWith('__column_')) {
      newIndex = overList.length;
    } else {
      newIndex = overList.findIndex((p) => p.id === overId);
      if (newIndex < 0) newIndex = overList.length;
    }
    const next = moveItem(data, activeId, overColumn, newIndex);
    setData(next);
    void persist(next);
  };

  if (!data) {
    return (
      <div style={{ padding: 24 }}>
        {error ? <p style={{ color: 'var(--theme-error-500, #b91c1c)' }}>{error}</p> : <p>Loading…</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--gutter-h, 24px)', maxWidth: 1280, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Hopper</h1>
        <div style={{ fontSize: 12, color: 'var(--theme-elevation-500, #6b7280)' }}>
          Today: {data.today}
          {saving && ' · saving…'}
        </div>
      </header>
      <p style={{ fontSize: 13, color: 'var(--theme-elevation-600, #4b5563)', marginTop: 0 }}>
        Drag to reorder. Drops write <code>scheduledPublishDate</code> and{' '}
        <code>publish_status=scheduled</code> back to each post.
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
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          <DroppableColumn
            columnKey="fiction"
            items={data.fiction}
            shippedItems={data.fictionShipped}
            dated
          />
          <DroppableColumn
            columnKey="essays"
            items={data.essays}
            shippedItems={data.essaysShipped}
            dated
          />
        </div>
        <div style={{ marginTop: 24 }}>
          <DroppableColumn columnKey="unqueued" items={data.unqueued} dated={false} />
        </div>
      </DndContext>
    </div>
  );
}
