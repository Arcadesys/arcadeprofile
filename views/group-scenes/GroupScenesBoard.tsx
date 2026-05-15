'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface ChapterSummary {
  slug: string;
  title: string;
}

interface SceneSummary {
  id: string;
  slug: string | null;
  title: string;
  publish_status: 'draft' | 'scheduled' | 'published' | 'sent' | null;
  order: number | null;
  chapter: string | null;
}

interface GroupScenesResponse {
  group: { slug: string; title: string; format: 'serial' | 'collection' | null };
  chapters: ChapterSummary[];
  columns: { chapterSlug: string | null; postIds: string[] }[];
  scenes: Record<string, SceneSummary>;
}

interface GroupListItem {
  slug: string;
  title: string;
  sceneCount: number;
  chapterCount: number;
}

interface GroupsListResponse {
  groups: GroupListItem[];
}

const UNASSIGNED_KEY = '__unassigned__';

function columnKey(chapterSlug: string | null): string {
  return chapterSlug ?? UNASSIGNED_KEY;
}

function statusColor(status: SceneSummary['publish_status']): string {
  if (status === 'scheduled') return 'var(--theme-success-500, #1d4ed8)';
  if (status === 'published') return 'var(--theme-success-700, #15803d)';
  if (status === 'sent') return '#7e22ce';
  return 'var(--theme-elevation-400, #6b7280)';
}

function findColumnIndex(state: GroupScenesResponse, postId: string): number {
  return state.columns.findIndex((c) => c.postIds.includes(postId));
}

function moveItem(
  state: GroupScenesResponse,
  postId: string,
  toColumnKey: string,
  toIndex: number,
): GroupScenesResponse {
  const fromColumnIndex = findColumnIndex(state, postId);
  if (fromColumnIndex < 0) return state;
  const toColumnIndex = state.columns.findIndex((c) => columnKey(c.chapterSlug) === toColumnKey);
  if (toColumnIndex < 0) return state;

  const columns = state.columns.map((c) => ({ ...c, postIds: [...c.postIds] }));
  const fromList = columns[fromColumnIndex].postIds;
  const fromIndex = fromList.indexOf(postId);
  if (fromIndex < 0) return state;
  fromList.splice(fromIndex, 1);
  const toList = columns[toColumnIndex].postIds;
  const insertAt = Math.max(0, Math.min(toIndex, toList.length));
  toList.splice(insertAt, 0, postId);
  return { ...state, columns };
}

function Card({
  scene,
  isOverlay,
}: {
  scene: SceneSummary;
  isOverlay?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--theme-elevation-0, #fff)',
        border: '1px solid var(--theme-elevation-150, #d1d5db)',
        borderRadius: 4,
        padding: '10px 12px',
        marginBottom: 8,
        boxShadow: isOverlay ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 0 rgba(0,0,0,0.02)',
        cursor: 'grab',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <strong style={{ fontSize: 14, lineHeight: 1.3 }}>{scene.title}</strong>
        <span
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: '#fff',
            background: statusColor(scene.publish_status),
            borderRadius: 3,
            padding: '2px 6px',
            whiteSpace: 'nowrap',
          }}
        >
          {scene.publish_status ?? 'draft'}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: 11,
          color: 'var(--theme-elevation-500, #6b7280)',
          marginTop: 4,
        }}
      >
        {scene.slug ?? '(no slug)'}
      </div>
    </div>
  );
}

function SortableCard({ scene }: { scene: SceneSummary }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  });
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
      <Card scene={scene} />
    </div>
  );
}

function DroppableColumn({
  chapterSlug,
  title,
  postIds,
  scenes,
}: {
  chapterSlug: string | null;
  title: string;
  postIds: string[];
  scenes: Record<string, SceneSummary>;
}) {
  const key = columnKey(chapterSlug);
  const { setNodeRef } = useSortable({ id: `__column_${key}` });
  const ids = useMemo(() => postIds, [postIds]);
  return (
    <div style={{ flex: '1 1 260px', minWidth: 260 }}>
      <h3
        style={{
          fontSize: 13,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: 'var(--theme-elevation-600, #374151)',
          margin: '0 0 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <span>{title}</span>
        <span
          style={{
            fontSize: 11,
            letterSpacing: 0,
            color: 'var(--theme-elevation-500, #6b7280)',
            textTransform: 'none',
          }}
        >
          {postIds.length}
        </span>
      </h3>
      <SortableContext id={key} items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          data-column={key}
          style={{
            background:
              chapterSlug === null
                ? 'var(--theme-elevation-50, #f9fafb)'
                : 'var(--theme-elevation-50, #f9fafb)',
            border:
              chapterSlug === null
                ? '1px dashed var(--theme-warning-400, #f59e0b)'
                : '1px dashed var(--theme-elevation-150, #d1d5db)',
            borderRadius: 4,
            padding: 8,
            minHeight: 140,
          }}
        >
          {postIds.length === 0 && (
            <div
              style={{
                color: 'var(--theme-elevation-400, #9ca3af)',
                fontSize: 12,
                textAlign: 'center',
                padding: '24px 0',
              }}
            >
              (empty)
            </div>
          )}
          {postIds.map((id) => {
            const scene = scenes[id];
            if (!scene) return null;
            return <SortableCard key={id} scene={scene} />;
          })}
        </div>
      </SortableContext>
    </div>
  );
}

function getInitialGroupFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('group');
}

export default function GroupScenesBoard() {
  const [groups, setGroups] = useState<GroupListItem[] | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [data, setData] = useState<GroupScenesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchGroups = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/group-scenes', { credentials: 'include' });
      if (!res.ok) {
        setError(`GET groups failed: ${res.status}`);
        return;
      }
      const body = (await res.json()) as GroupsListResponse;
      setGroups(body.groups);
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    }
  }, []);

  const fetchGroup = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/group-scenes?group=${encodeURIComponent(slug)}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? `GET failed: ${res.status}`);
        setData(null);
        return;
      }
      setData((await res.json()) as GroupScenesResponse);
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchGroups();
    const initial = getInitialGroupFromUrl();
    if (initial) setSelectedSlug(initial);
  }, [fetchGroups]);

  useEffect(() => {
    if (!selectedSlug) {
      setData(null);
      return;
    }
    void fetchGroup(selectedSlug);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('group', selectedSlug);
      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedSlug, fetchGroup]);

  const persist = useCallback(
    async (snapshot: GroupScenesResponse) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/group-scenes', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group: snapshot.group.slug,
            columns: snapshot.columns,
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          setError(json.error ?? `POST failed: ${res.status}`);
          await fetchGroup(snapshot.group.slug);
          return;
        }
        setData((await res.json()) as GroupScenesResponse);
      } catch (err) {
        setError(`Network error: ${(err as Error).message}`);
        await fetchGroup(snapshot.group.slug);
      } finally {
        setSaving(false);
      }
    },
    [fetchGroup],
  );

  const resolveColumnFromOver = (overId: string, state: GroupScenesResponse): string | null => {
    if (overId.startsWith('__column_')) {
      const k = overId.replace('__column_', '');
      const hit = state.columns.find((c) => columnKey(c.chapterSlug) === k);
      return hit ? columnKey(hit.chapterSlug) : null;
    }
    const idx = findColumnIndex(state, overId);
    if (idx < 0) return null;
    return columnKey(state.columns[idx].chapterSlug);
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
    const overColumnKey = resolveColumnFromOver(overId, data);
    if (!overColumnKey) return;
    const overCol = data.columns.find((c) => columnKey(c.chapterSlug) === overColumnKey);
    if (!overCol) return;
    let overIndex: number;
    if (overId.startsWith('__column_')) {
      overIndex = overCol.postIds.length;
    } else {
      overIndex = overCol.postIds.indexOf(overId);
      if (overIndex < 0) overIndex = overCol.postIds.length;
    }
    const next = moveItem(data, activeId, overColumnKey, overIndex);
    if (next !== data) setData(next);
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (!data) return;
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const overColumnKey = resolveColumnFromOver(overId, data);
    if (!overColumnKey) return;
    const overCol = data.columns.find((c) => columnKey(c.chapterSlug) === overColumnKey);
    if (!overCol) return;
    let newIndex: number;
    if (overId.startsWith('__column_')) {
      newIndex = overCol.postIds.length;
    } else {
      newIndex = overCol.postIds.indexOf(overId);
      if (newIndex < 0) newIndex = overCol.postIds.length;
    }
    const next = moveItem(data, activeId, overColumnKey, newIndex);
    setData(next);
    void persist(next);
  };

  const allColumnSortableIds = useMemo(() => {
    if (!data) return [] as string[];
    return data.columns.flatMap((c) => [`__column_${columnKey(c.chapterSlug)}`, ...c.postIds]);
  }, [data]);

  return (
    <div style={{ padding: 'var(--gutter-h, 24px)', maxWidth: 1280, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ margin: 0 }}>Group scenes</h1>
        <div style={{ fontSize: 12, color: 'var(--theme-elevation-500, #6b7280)' }}>
          {saving && 'saving…'}
          {!saving && loading && 'loading…'}
        </div>
      </header>
      <p style={{ fontSize: 13, color: 'var(--theme-elevation-600, #4b5563)', marginTop: 0 }}>
        Pick a group and drag scenes between chapter columns. Drops persist <code>chapter</code> and
        <code> order</code> on each post. Add or rename chapters on the group's edit page.
      </p>

      <div style={{ margin: '12px 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <label htmlFor="group-scenes-picker" style={{ fontSize: 13 }}>
          Group:
        </label>
        <select
          id="group-scenes-picker"
          value={selectedSlug ?? ''}
          onChange={(e) => setSelectedSlug(e.target.value || null)}
          style={{
            background: 'var(--theme-elevation-0, #fff)',
            color: 'var(--theme-text, inherit)',
            border: '1px solid var(--theme-elevation-150, #d1d5db)',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: 13,
            minWidth: 280,
          }}
        >
          <option value="">— select a group —</option>
          {(groups ?? []).map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.title} ({g.sceneCount} scenes · {g.chapterCount} chapters)
            </option>
          ))}
        </select>
      </div>

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

      {!selectedSlug && (
        <div style={{ fontSize: 13, color: 'var(--theme-elevation-500, #6b7280)' }}>
          Select a group above to arrange its scenes.
        </div>
      )}

      {selectedSlug && data && data.chapters.length === 0 && (
        <div
          style={{
            background: 'var(--theme-elevation-50, #f9fafb)',
            border: '1px dashed var(--theme-elevation-150, #d1d5db)',
            borderRadius: 4,
            padding: '12px 16px',
            margin: '8px 0 16px',
            fontSize: 13,
            color: 'var(--theme-elevation-600, #4b5563)',
          }}
        >
          This group has no chapters yet. Add chapters on the group's edit page, then come back to
          arrange scenes.
        </div>
      )}

      {selectedSlug && data && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          {/* Wrap every column's sortable items in one outer SortableContext so the
              column-sentinel ids resolve. Each DroppableColumn registers its own
              inner SortableContext for the per-column strategy. */}
          <SortableContext items={allColumnSortableIds} strategy={verticalListSortingStrategy}>
            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'flex-start',
              }}
            >
              {data.columns.map((col) => {
                const chapter = data.chapters.find((c) => c.slug === col.chapterSlug);
                const title = chapter ? chapter.title : 'Unassigned';
                return (
                  <DroppableColumn
                    key={columnKey(col.chapterSlug)}
                    chapterSlug={col.chapterSlug}
                    title={title}
                    postIds={col.postIds}
                    scenes={data.scenes}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
