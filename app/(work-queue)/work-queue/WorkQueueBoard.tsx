'use client';

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  workItemStatuses,
  workItemStatusLabels,
  workItemTypeLabels,
  workItemTypes,
  workQueueWipLimits,
  type WorkItemOwner,
  type WorkItemStatus,
  type WorkItemType,
} from '@/lib/work-queue';
import type { WorkItem } from '@/payload-types';

import styles from './work-queue.module.css';

type QueueItem = Omit<WorkItem, 'parent'> & {
  parent?: number | WorkItem | null;
};

type TypeFilter = 'all' | WorkItemType;
type Theme = 'dark' | 'light';

interface WorkQueueBoardProps {
  initialItems: QueueItem[];
}

interface CreateForm {
  type: WorkItemType;
  title: string;
  parentId: string;
  definitionOfDone: string;
  owner: WorkItemOwner;
  budgetUsd: string;
}

const emptyForm: CreateForm = {
  type: 'task',
  title: '',
  parentId: '',
  definitionOfDone: '',
  owner: 'human',
  budgetUsd: '0',
};

function parentIdOf(item: QueueItem): number | null {
  if (typeof item.parent === 'number') return item.parent;
  if (item.parent && typeof item.parent === 'object') return item.parent.id;
  return null;
}

function sortItems(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    const positionDifference = (a.position ?? 0) - (b.position ?? 0);
    if (positionDifference !== 0) return positionDifference;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status}).`);
  return body;
}

export default function WorkQueueBoard({ initialItems }: WorkQueueBoardProps) {
  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [theme, setTheme] = useState<Theme>('dark');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('work-queue-theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('work-queue-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (drawerOpen) titleInputRef.current?.focus();
  }, [drawerOpen]);

  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  const counts = useMemo(() => {
    const result = { epic: 0, story: 0, task: 0 };
    for (const item of items) result[item.type] += 1;
    return result;
  }, [items]);

  const parents = useMemo(() => {
    if (form.type === 'story') return items.filter((item) => item.type === 'epic');
    if (form.type === 'task') return items.filter((item) => item.type === 'story');
    return [];
  }, [form.type, items]);

  const visibleItems = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.type === filter)),
    [filter, items],
  );

  function changeType(type: WorkItemType) {
    setForm((current) => ({ ...current, type, parentId: '' }));
  }

  function openDrawer() {
    setMessage('');
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setForm(emptyForm);
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/work-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          parentId: form.type === 'epic' ? null : form.parentId,
          definitionOfDone: form.definitionOfDone,
          owner: form.owner,
          budgetUsd: Number(form.budgetUsd || 0),
          status: 'inbox',
        }),
      });
      const body = await responseJson<{ item: QueueItem }>(response);
      setItems((current) => [...current, body.item]);
      closeDrawer();
      setMessage(`${workItemTypeLabels[body.item.type]} added to Inbox.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to add work.');
    } finally {
      setBusy(false);
    }
  }

  async function moveItem(id: number, status: WorkItemStatus) {
    const currentItem = itemById.get(id);
    if (!currentItem || currentItem.status === status) return;

    const limit = workQueueWipLimits[status];
    const statusCount = items.filter((item) => item.status === status).length;
    if (limit !== undefined && statusCount >= limit) {
      setMessage(`${workItemStatusLabels[status]} is at its WIP limit of ${limit}.`);
      return;
    }

    setMessage('');
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    try {
      const response = await fetch(`/api/work-queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await responseJson<{ item: QueueItem }>(response);
      setItems((current) =>
        current.map((item) => (item.id === id ? body.item : item)),
      );
      setMessage(`${body.item.title} moved to ${workItemStatusLabels[status]}.`);
    } catch (error) {
      setItems((current) =>
        current.map((item) => (item.id === id ? currentItem : item)),
      );
      setMessage(error instanceof Error ? error.message : 'Unable to move work.');
    }
  }

  function moveByOffset(item: QueueItem, offset: -1 | 1) {
    const index = workItemStatuses.indexOf(item.status);
    const destination = workItemStatuses[index + offset];
    if (destination) void moveItem(item.id, destination);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, item: QueueItem) {
    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      moveByOffset(item, -1);
    }
    if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      moveByOffset(item, 1);
    }
  }

  const reviewCount = items.filter((item) => item.status === 'review').length;

  return (
    <main className={styles.app} data-theme={theme}>
      <header className={styles.header}>
        <h1>Work Queue</h1>
        <div className={styles.headerActions}>
          <button
            className={styles.themeButton}
            type="button"
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
            {theme === 'dark' ? 'Dark mode' : 'Light mode'}
            <strong>{theme === 'dark' ? 'On' : 'On'}</strong>
          </button>
          <button className={styles.primaryButton} type="button" onClick={openDrawer}>
            <span aria-hidden="true">＋</span> Add work
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => document.getElementById('queue-filters')?.focus()}
          >
            Filters
          </button>
        </div>
      </header>

      <section className={styles.filterRail} aria-label="Work queue filters">
        <p>
          <strong>{counts.epic}</strong> epics · <strong>{counts.story}</strong> stories ·{' '}
          <strong>{counts.task}</strong> tasks
        </p>
        <div className={styles.filters} id="queue-filters" tabIndex={-1}>
          {(['all', ...workItemTypes] as TypeFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === 'all' ? 'All work' : `${workItemTypeLabels[value]}s`}
            </button>
          ))}
        </div>
      </section>

      {message ? (
        <p className={styles.message} role="status">
          {message}
        </p>
      ) : null}

      <section className={styles.board} aria-label="Kanban board">
        {workItemStatuses.map((status) => {
          const columnItems = sortItems(
            visibleItems.filter((item) => item.status === status),
          );
          const allStatusCount = items.filter((item) => item.status === status).length;
          const limit = workQueueWipLimits[status];
          return (
            <section
              className={styles.column}
              key={status}
              aria-labelledby={`column-${status}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedId !== null) void moveItem(draggedId, status);
                setDraggedId(null);
              }}
            >
              <header className={styles.columnHeader}>
                <h2 id={`column-${status}`}>
                  {workItemStatusLabels[status]} — {allStatusCount}
                  {limit !== undefined ? ` of ${limit}` : ''}
                </h2>
                <p>{limit === undefined ? 'No WIP limit' : `WIP limit: ${limit}`}</p>
              </header>
              <div className={styles.cardList}>
                {columnItems.map((item) => {
                  const parentId = parentIdOf(item);
                  const parent = parentId === null ? null : itemById.get(parentId);
                  const statusIndex = workItemStatuses.indexOf(item.status);
                  return (
                    <article
                      className={styles.card}
                      key={item.id}
                      draggable
                      tabIndex={0}
                      onDragStart={() => setDraggedId(item.id)}
                      onDragEnd={() => setDraggedId(null)}
                      onKeyDown={(event) => handleCardKeyDown(event, item)}
                      aria-label={`${workItemTypeLabels[item.type]}: ${item.title}`}
                    >
                      <div className={styles.cardTopline}>
                        <span className={styles.dragHandle} aria-hidden="true">⠿</span>
                        <span className={styles.typeLabel}>{workItemTypeLabels[item.type]}</span>
                        <span className={styles.itemId}>#{item.id}</span>
                      </div>
                      <h3>{item.title}</h3>
                      {parent ? (
                        <p>
                          Parent {workItemTypeLabels[parent.type].toLowerCase()}: {parent.title}
                        </p>
                      ) : null}
                      <dl>
                        <div>
                          <dt>Owner</dt>
                          <dd>{item.owner === 'ai' ? 'AI' : 'Human'}</dd>
                        </div>
                        <div>
                          <dt>Budget</dt>
                          <dd>${Number(item.budgetUsd ?? 0).toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>Status</dt>
                          <dd>{workItemStatusLabels[item.status]}</dd>
                        </div>
                      </dl>
                      <div className={styles.moveControls} aria-label="Move card">
                        <button
                          type="button"
                          disabled={statusIndex === 0}
                          onClick={() => moveByOffset(item, -1)}
                          aria-label={`Move ${item.title} left`}
                        >
                          ← Previous
                        </button>
                        <button
                          type="button"
                          disabled={statusIndex === workItemStatuses.length - 1}
                          onClick={() => moveByOffset(item, 1)}
                          aria-label={`Move ${item.title} right`}
                        >
                          Next →
                        </button>
                      </div>
                    </article>
                  );
                })}
                {columnItems.length === 0 ? (
                  <button
                    className={styles.emptyColumn}
                    type="button"
                    onClick={openDrawer}
                  >
                    ＋ Add work
                  </button>
                ) : null}
              </div>
            </section>
          );
        })}
      </section>

      <footer className={styles.statusLine}>
        <span aria-hidden="true">⟳</span>
        Queue syncs with Codex · {reviewCount} {reviewCount === 1 ? 'job needs' : 'jobs need'} human review
      </footer>

      {drawerOpen ? (
        <div className={styles.drawerBackdrop} onMouseDown={closeDrawer}>
          <aside
            className={styles.drawer}
            aria-labelledby="add-work-title"
            aria-modal="true"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <h2 id="add-work-title">Add work</h2>
              <button type="button" onClick={closeDrawer} aria-label="Close Add work">
                ×
              </button>
            </div>
            <form onSubmit={createItem}>
              <fieldset className={styles.typePicker}>
                <legend>Type</legend>
                {workItemTypes.map((type) => (
                  <button
                    type="button"
                    key={type}
                    aria-pressed={form.type === type}
                    onClick={() => changeType(type)}
                  >
                    {workItemTypeLabels[type]}
                  </button>
                ))}
              </fieldset>

              <label>
                Title
                <input
                  ref={titleInputRef}
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Enter a clear, actionable title"
                />
              </label>

              {form.type !== 'epic' ? (
                <label>
                  Parent {form.type === 'story' ? 'epic' : 'story'}
                  <select
                    required
                    value={form.parentId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, parentId: event.target.value }))
                    }
                  >
                    <option value="">Choose a parent</option>
                    {parents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label>
                Definition of done
                <textarea
                  required
                  maxLength={1000}
                  value={form.definitionOfDone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      definitionOfDone: event.target.value,
                    }))
                  }
                  placeholder="Describe what must be true for this work to be complete."
                />
              </label>

              <div className={styles.formRow}>
                <label>
                  Owner
                  <select
                    value={form.owner}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        owner: event.target.value as WorkItemOwner,
                      }))
                    }
                  >
                    <option value="human">Human</option>
                    <option value="ai">AI</option>
                  </select>
                </label>
                <label>
                  Budget (USD)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.budgetUsd}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, budgetUsd: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className={styles.drawerActions}>
                <button className={styles.secondaryButton} type="button" onClick={closeDrawer}>
                  Cancel
                </button>
                <button className={styles.primaryButton} type="submit" disabled={busy}>
                  {busy ? 'Adding…' : 'Add to queue'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
