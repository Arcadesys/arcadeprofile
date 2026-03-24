'use client';

import { Suspense, useEffect, useState, useCallback, useRef, useMemo, DragEvent, MouseEvent } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface ScheduledPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledDate: string | null;
  tags: string[];
  series: string | null;
  group: string | null;
}

interface Series {
  id: string;
  name: string;
  description: string;
}

interface ScheduleSettings {
  publishDays: string[];
  timezone: string;
}

interface ScheduleData {
  posts: ScheduledPost[];
  series: Series[];
  settings: ScheduleSettings;
  groups: string[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#ff8a00',
  scheduled: '#ff3cac',
  published: '#4ade80',
};

const DAY_OPTIONS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function getCalendarDays(year: number, month: number): { date: Date; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay(); // 0=Sun
  const days: { date: Date; inMonth: boolean }[] = [];

  // Fill leading days from previous month
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, inMonth: false });
  }
  // Days in month
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: new Date(year, month, d), inMonth: true });
  }
  // Fill trailing days to complete the grid (6 rows max)
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - last.getDate() - startDay + 1);
    days.push({ date: d, inMonth: false });
  }
  return days;
}

function dateToString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SCHEDULE_URL_KEYS = ['status', 'q', 'series', 'tags', 'group'] as const;

function buildScheduleSearchParams(
  filter: 'all' | 'draft' | 'scheduled' | 'published',
  searchText: string,
  filterSeries: string,
  filterTags: string[],
  filterGroup: string
): URLSearchParams {
  const params = new URLSearchParams();
  if (filter !== 'all') params.set('status', filter);
  if (searchText) params.set('q', searchText);
  if (filterSeries) params.set('series', filterSeries);
  if (filterTags.length > 0) params.set('tags', filterTags.join(','));
  if (filterGroup) params.set('group', filterGroup);
  return params;
}

function scheduleUrlMatchesFilters(
  sp: { get: (key: string) => string | null },
  filter: 'all' | 'draft' | 'scheduled' | 'published',
  searchText: string,
  filterSeries: string,
  filterTags: string[],
  filterGroup: string
): boolean {
  const want = buildScheduleSearchParams(filter, searchText, filterSeries, filterTags, filterGroup);
  for (const k of SCHEDULE_URL_KEYS) {
    if (want.get(k) !== sp.get(k)) return false;
  }
  return true;
}

function formatGroupName(group: string): string {
  return group.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--fg-muted)' }}>Loading schedule...</div>}>
      <ScheduleDashboard />
    </Suspense>
  );
}

function ScheduleDashboard() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeries, setNewSeries] = useState({ name: '', description: '' });
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filter, setFilter] = useState<'all' | 'draft' | 'scheduled' | 'published'>(() => {
    const s = searchParams.get('status');
    return s === 'draft' || s === 'scheduled' || s === 'published' ? s : 'all';
  });
  const [searchText, setSearchText] = useState(() => searchParams.get('q') || '');
  const [filterSeries, setFilterSeries] = useState(() => searchParams.get('series') || '');
  const [filterTags, setFilterTags] = useState<string[]>(() => {
    const t = searchParams.get('tags');
    return t ? t.split(',').filter(Boolean) : [];
  });
  const [filterGroup, setFilterGroup] = useState(() => searchParams.get('group') || '');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // List drag-and-drop reorder state
  const [listDragSlug, setListDragSlug] = useState<string | null>(null);
  const [listDropTarget, setListDropTarget] = useState<number | null>(null);

  // Multi-select state
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const lastClickedSlug = useRef<string | null>(null);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkSeries, setBulkSeries] = useState('');
  const [bulkTag, setBulkTag] = useState('');
  const [autoSchedulePreview, setAutoSchedulePreview] = useState<{ slug: string; title: string; date: string }[] | null>(null);
  const [previewExcluded, setPreviewExcluded] = useState<Set<string>>(new Set());

  const toggleSelect = (slug: string, e: MouseEvent) => {
    if (!data) return;
    const posts = filteredPostsRef.current;
    if (e.shiftKey && lastClickedSlug.current) {
      const lastIdx = posts.findIndex(p => p.slug === lastClickedSlug.current);
      const curIdx = posts.findIndex(p => p.slug === slug);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] = lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        const next = new Set(selectedSlugs);
        for (let i = start; i <= end; i++) next.add(posts[i].slug);
        setSelectedSlugs(next);
        lastClickedSlug.current = slug;
        return;
      }
    }
    const next = new Set(selectedSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelectedSlugs(next);
    lastClickedSlug.current = slug;
  };

  const selectAll = (posts: ScheduledPost[]) => {
    const allSelected = posts.every(p => selectedSlugs.has(p.slug));
    if (allSelected) {
      setSelectedSlugs(new Set());
    } else {
      setSelectedSlugs(new Set(posts.map(p => p.slug)));
    }
  };

  const applyBulkDate = () => {
    if (!data || !bulkDate || selectedSlugs.size === 0) return;
    const posts = data.posts.map(p =>
      selectedSlugs.has(p.slug) ? { ...p, scheduledDate: bulkDate, status: 'scheduled' as const } : p
    );
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
    setBulkDate('');
  };

  const applyBulkStatus = () => {
    if (!data || !bulkStatus || selectedSlugs.size === 0) return;
    const posts = data.posts.map(p =>
      selectedSlugs.has(p.slug) ? { ...p, status: bulkStatus as ScheduledPost['status'] } : p
    );
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
    setBulkStatus('');
  };

  const applyBulkSeries = () => {
    if (!data || selectedSlugs.size === 0) return;
    const seriesVal = bulkSeries === '__none__' ? null : bulkSeries;
    if (!bulkSeries) return;
    const posts = data.posts.map(p =>
      selectedSlugs.has(p.slug) ? { ...p, series: seriesVal } : p
    );
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
    setBulkSeries('');
  };

  const applyBulkTag = () => {
    if (!data || !bulkTag.trim() || selectedSlugs.size === 0) return;
    const normalized = bulkTag.trim().toLowerCase().replace(/\s+/g, '-');
    const posts = data.posts.map(p =>
      selectedSlugs.has(p.slug) && !p.tags.includes(normalized)
        ? { ...p, tags: [...p.tags, normalized] }
        : p
    );
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
    setBulkTag('');
  };

  const openAutoSchedulePreview = () => {
    if (!data) return;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const allowedDays = new Set(data.settings.publishDays.map(d => d.toLowerCase()));

    const unscheduled = data.posts.filter(p => p.status === 'draft' && !p.scheduledDate);
    if (unscheduled.length === 0) return;

    const scheduledDates = data.posts
      .filter(p => p.scheduledDate)
      .map(p => new Date(p.scheduledDate!))
      .sort((a, b) => b.getTime() - a.getTime());

    const startFrom = scheduledDates.length > 0
      ? new Date(scheduledDates[0].getTime() + 86400000)
      : new Date(Date.now() + 86400000);

    const dates: string[] = [];
    const current = new Date(startFrom);
    current.setHours(0, 0, 0, 0);

    while (dates.length < unscheduled.length) {
      if (allowedDays.has(dayNames[current.getDay()])) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    setAutoSchedulePreview(unscheduled.map((p, i) => ({ slug: p.slug, title: p.title, date: dates[i] })));
    setPreviewExcluded(new Set());
  };

  const confirmAutoSchedule = () => {
    if (!data || !autoSchedulePreview) return;
    const assignments = new Map(
      autoSchedulePreview
        .filter(p => !previewExcluded.has(p.slug))
        .map(p => [p.slug, p.date])
    );
    const posts = data.posts.map(p =>
      assignments.has(p.slug)
        ? { ...p, scheduledDate: assignments.get(p.slug)!, status: 'scheduled' as const }
        : p
    );
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
    setAutoSchedulePreview(null);
    setPreviewExcluded(new Set());
  };

  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState<{ message: string; onUndo: () => void; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const isDirty = useRef(false);
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/schedule');
      if (!res.ok) {
        setError(`Failed to load schedule (${res.status})`);
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError('Failed to load schedule (network error)');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sync filter state to URL params (only when different — avoids replace loops with useRouter)
  useEffect(() => {
    if (scheduleUrlMatchesFilters(searchParams, filter, searchText, filterSeries, filterTags, filterGroup)) {
      return;
    }
    const qs = buildScheduleSearchParams(filter, searchText, filterSeries, filterTags, filterGroup).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filter, searchText, filterSeries, filterTags, filterGroup, router, pathname, searchParams]);

  const hasActiveFilters = filter !== 'all' || searchText !== '' || filterSeries !== '' || filterTags.length > 0 || filterGroup !== '';

  const clearAllFilters = () => {
    setFilter('all');
    setSearchText('');
    setFilterSeries('');
    setFilterTags([]);
    setFilterGroup('');
  };

  const toggleFilterTag = (tag: string) => {
    setFilterTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Collect all unique tags and series from posts
  const allTags = useMemo(() => {
    if (!data) return [];
    const tags = new Set<string>();
    for (const p of data.posts) for (const t of p.tags) tags.add(t);
    return Array.from(tags).sort();
  }, [data]);

  const save = async (updated: ScheduleData) => {
    setSaving(true);
    isDirty.current = true;
    setError(null);
    const res = await fetch('/api/schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        posts: updated.posts.map(p => ({
          slug: p.slug,
          status: p.status,
          scheduledDate: p.scheduledDate,
          tags: p.tags,
          series: p.series,
        })),
        series: updated.series,
        settings: updated.settings,
      }),
    });
    if (!res.ok) setError('Failed to save');
    else isDirty.current = false;
    setSaving(false);
  };

  const isFilterActive = filter !== 'all' || searchText !== '' || filterSeries !== '' || filterTags.length > 0 || filterGroup !== '';

  const handleListDragStart = (e: DragEvent<HTMLDivElement>, slug: string) => {
    setListDragSlug(slug);
    e.dataTransfer.setData('text/plain', slug);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget.parentElement) {
      e.dataTransfer.setDragImage(e.currentTarget.parentElement, 0, 0);
    }
  };

  const handleListDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (!listDragSlug) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setListDropTarget(index);
  };

  const handleListDragEnd = () => {
    setListDragSlug(null);
    setListDropTarget(null);
  };

  const handleListDrop = (e: DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (!data || !listDragSlug) return;
    const sourceIndex = data.posts.findIndex(p => p.slug === listDragSlug);
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      handleListDragEnd();
      return;
    }
    const posts = [...data.posts];
    const [moved] = posts.splice(sourceIndex, 1);
    posts.splice(targetIndex, 0, moved);
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
    handleListDragEnd();
  };

  // Warn on navigate away with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty.current || saving) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saving]);

  const updatePostStatus = (slug: string, status: ScheduledPost['status']) => {
    if (!data) return;
    const posts = data.posts.map(p => p.slug === slug ? { ...p, status } : p);
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
  };

  const updatePostDate = (slug: string, scheduledDate: string) => {
    if (!data) return;
    const posts = data.posts.map(p =>
      p.slug === slug ? { ...p, scheduledDate: scheduledDate || null, status: scheduledDate ? 'scheduled' as const : p.status } : p
    );
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
  };

  const updatePostSeries = (slug: string, series: string | null) => {
    if (!data) return;
    const posts = data.posts.map(p => p.slug === slug ? { ...p, series } : p);
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
  };

  const addTag = (slug: string, tag: string) => {
    if (!data || !tag.trim()) return;
    const normalized = tag.trim().toLowerCase().replace(/\s+/g, '-');
    const posts = data.posts.map(p =>
      p.slug === slug && !p.tags.includes(normalized)
        ? { ...p, tags: [...p.tags, normalized] }
        : p
    );
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
  };

  const removeTag = (slug: string, tag: string) => {
    if (!data) return;
    const previous = data;
    const posts = data.posts.map(p =>
      p.slug === slug ? { ...p, tags: p.tags.filter(t => t !== tag) } : p
    );
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
    showToast(`Removed tag "${tag}"`, () => {
      setData(previous);
      save(previous);
    });
  };

  const showToast = (message: string, onUndo: () => void) => {
    if (toast) clearTimeout(toast.timer);
    const timer = setTimeout(() => setToast(null), 5000);
    setToast({ message, onUndo, timer });
  };

  const dismissToast = () => {
    if (toast) clearTimeout(toast.timer);
    setToast(null);
  };

  const addSeries = () => {
    if (!data || !newSeries.name.trim()) return;
    const id = newSeries.name.trim().toLowerCase().replace(/\s+/g, '-');
    if (data.series.some(s => s.id === id)) {
      setError('Series already exists');
      return;
    }
    const updated = {
      ...data,
      series: [...data.series, { id, name: newSeries.name.trim(), description: newSeries.description.trim() }],
    };
    setData(updated);
    save(updated);
    setNewSeries({ name: '', description: '' });
    setShowNewSeries(false);
  };

  const removeSeries = (id: string) => {
    if (!data) return;
    const affectedCount = data.posts.filter(p => p.series === id).length;
    const seriesName = data.series.find(s => s.id === id)?.name || id;
    setConfirmDialog({
      message: affectedCount > 0
        ? `Remove "${seriesName}"? This will unlink ${affectedCount} post${affectedCount !== 1 ? 's' : ''} from the series.`
        : `Remove "${seriesName}"?`,
      onConfirm: () => {
        const posts = data.posts.map(p => p.series === id ? { ...p, series: null } : p);
        const series = data.series.filter(s => s.id !== id);
        const updated = { ...data, posts, series };
        setData(updated);
        save(updated);
        setConfirmDialog(null);
      },
    });
  };

  const autoSchedule = () => {
    if (!data) return;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const allowedDays = new Set(data.settings.publishDays.map(d => d.toLowerCase()));

    // Find unscheduled posts (draft status, no date)
    const unscheduled = data.posts.filter(p => p.status === 'draft' && !p.scheduledDate);
    if (unscheduled.length === 0) return;

    // Find the latest scheduled date, or start from tomorrow
    const scheduledDates = data.posts
      .filter(p => p.scheduledDate)
      .map(p => new Date(p.scheduledDate!))
      .sort((a, b) => b.getTime() - a.getTime());

    const startFrom = scheduledDates.length > 0
      ? new Date(scheduledDates[0].getTime() + 86400000)
      : new Date(Date.now() + 86400000);

    const dates: string[] = [];
    const current = new Date(startFrom);
    current.setHours(0, 0, 0, 0);

    while (dates.length < unscheduled.length) {
      if (allowedDays.has(dayNames[current.getDay()])) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    const slugsToSchedule = new Set(unscheduled.map(p => p.slug));
    let dateIndex = 0;
    const posts = data.posts.map(p => {
      if (slugsToSchedule.has(p.slug)) {
        return { ...p, scheduledDate: dates[dateIndex++], status: 'scheduled' as const };
      }
      return p;
    });

    const updated = { ...data, posts };
    setData(updated);
    save(updated);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';

      // ? — show shortcuts (works everywhere)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        if (inInput) return;
        e.preventDefault();
        setShowShortcuts(s => !s);
        return;
      }

      // Escape — close any overlay
      if (e.key === 'Escape') {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (confirmDialog) { setConfirmDialog(null); return; }
        if (toast) { dismissToast(); return; }
        setFocusedIndex(-1);
        setSelectedSlugs(new Set());
        return;
      }

      // Enter — confirm dialog
      if (e.key === 'Enter' && confirmDialog) {
        e.preventDefault();
        confirmDialog.onConfirm();
        return;
      }

      if (inInput || showShortcuts || confirmDialog) return;
      if (!data) return;

      let posts = data.posts;
      if (filter !== 'all') posts = posts.filter(p => p.status === filter);
      if (searchText) {
        const q = searchText.toLowerCase();
        posts = posts.filter(p =>
          p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q)
        );
      }
      if (filterSeries) {
        posts = filterSeries === '__none__'
          ? posts.filter(p => !p.series)
          : posts.filter(p => p.series === filterSeries);
      }
      if (filterTags.length > 0) {
        posts = posts.filter(p => filterTags.every(t => p.tags.includes(t)));
      }
      if (filterGroup) {
        posts = filterGroup === '__none__'
          ? posts.filter(p => !p.group)
          : posts.filter(p => p.group === filterGroup);
      }

      // Cmd/Ctrl+S — save (force re-save)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save(data);
        return;
      }

      // Cmd/Ctrl+A — select all visible posts
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedSlugs(new Set(posts.map(p => p.slug)));
        return;
      }

      // j/k or arrow keys — navigate posts
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(i => {
          const next = Math.min(i + 1, posts.length - 1);
          postRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        return;
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(i => {
          const next = Math.max(i - 1, 0);
          postRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        return;
      }

      if (focusedIndex < 0 || focusedIndex >= posts.length) return;
      const focused = posts[focusedIndex];

      // space — toggle select
      if (e.key === ' ') {
        e.preventDefault();
        setSelectedSlugs(prev => {
          const next = new Set(prev);
          if (next.has(focused.slug)) next.delete(focused.slug);
          else next.add(focused.slug);
          return next;
        });
        return;
      }

      // s — cycle status
      if (e.key === 's') {
        const cycle: ScheduledPost['status'][] = ['draft', 'scheduled', 'published'];
        const nextStatus = cycle[(cycle.indexOf(focused.status) + 1) % cycle.length];
        updatePostStatus(focused.slug, nextStatus);
        return;
      }

      // d — focus date picker
      if (e.key === 'd') {
        const row = postRefs.current[focusedIndex];
        const dateInput = row?.querySelector('input[type="date"]') as HTMLInputElement | null;
        if (dateInput) {
          dateInput.focus();
          dateInput.showPicker?.();
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [data, filter, searchText, filterSeries, filterTags, filterGroup, focusedIndex, showShortcuts, confirmDialog, toast, saving]);

  const filteredPosts = useMemo((): ScheduledPost[] => {
    if (!data) return [];
    let posts = data.posts;
    if (filter !== 'all') posts = posts.filter(p => p.status === filter);
    if (searchText) {
      const q = searchText.toLowerCase();
      posts = posts.filter(p =>
        p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q)
      );
    }
    if (filterSeries) {
      posts = filterSeries === '__none__'
        ? posts.filter(p => !p.series)
        : posts.filter(p => p.series === filterSeries);
    }
    if (filterTags.length > 0) {
      posts = posts.filter(p => filterTags.every(t => p.tags.includes(t)));
    }
    if (filterGroup) {
      posts = filterGroup === '__none__'
        ? posts.filter(p => !p.group)
        : posts.filter(p => p.group === filterGroup);
    }
    return posts;
  }, [data, filter, searchText, filterSeries, filterTags, filterGroup]);
  const filteredPostsRef = useRef<ScheduledPost[]>([]);
  filteredPostsRef.current = filteredPosts;

  if (!data) {
    if (error) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            color: 'var(--fg-muted)',
          }}
        >
          <p style={{ color: 'var(--fg)' }}>{error}</p>
          <button
            type="button"
            onClick={() => fetchData()}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--fg-muted)' }}>
        Loading schedule...
      </div>
    );
  }
  const allFilteredSelected = filteredPosts.length > 0 && filteredPosts.every(p => selectedSlugs.has(p.slug));
  const draftCount = data.posts.filter(p => p.status === 'draft').length;
  const scheduledCount = data.posts.filter(p => p.status === 'scheduled').length;
  const publishedCount = data.posts.filter(p => p.status === 'published').length;

  // Calendar helpers
  const calendarDays = getCalendarDays(calendarMonth.year, calendarMonth.month);
  const postsByDate: Record<string, ScheduledPost[]> = {};
  for (const post of data.posts) {
    if (post.scheduledDate) {
      if (!postsByDate[post.scheduledDate]) postsByDate[post.scheduledDate] = [];
      postsByDate[post.scheduledDate].push(post);
    }
  }
  const publishDaySet = new Set(data.settings.publishDays.map(d => d.toLowerCase()));
  const dayNameMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayStr = dateToString(new Date());

  const handleDragStart = (e: DragEvent<HTMLDivElement>, slug: string) => {
    e.dataTransfer.setData('text/plain', slug);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dateStr);
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, dateStr: string) => {
    e.preventDefault();
    setDragOverDay(null);
    const slug = e.dataTransfer.getData('text/plain');
    if (slug) {
      updatePostDate(slug, dateStr);
    }
  };

  const goToMonth = (delta: number) => {
    setCalendarMonth(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
    setSelectedDay(null);
  };

  const goToToday = () => {
    const now = new Date();
    setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDay(todayStr);
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--fg)' }}>
          Post Schedule
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {saving && <span style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Saving...</span>}
          {error && <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</span>}
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {([['list', 'List'], ['calendar', 'Calendar']] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: 6,
              border: 'none',
              background: view === v ? 'var(--accent)' : 'transparent',
              color: view === v ? '#fff' : 'var(--fg-muted)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {/* Row 1: Status buttons + auto-schedule */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: 'All', value: 'all', count: data.posts.length },
            { label: 'Drafts', value: 'draft', count: draftCount },
            { label: 'Scheduled', value: 'scheduled', count: scheduledCount },
            { label: 'Published', value: 'published', count: publishedCount },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as typeof filter)}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 8,
                border: filter === f.value ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: filter === f.value ? 'var(--surface-hover)' : 'var(--surface)',
                color: filter === f.value ? 'var(--accent)' : 'var(--fg-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {f.label} ({f.count})
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Clear filters
            </button>
          )}
          {draftCount > 0 && (
            <button
              onClick={openAutoSchedulePreview}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 8,
                border: '1px solid var(--neon-pink)',
                background: 'transparent',
                color: 'var(--neon-pink)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              Auto-schedule drafts
            </button>
          )}
        </div>
        {/* Row 2: Search + Series + Tags */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search title or excerpt…"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{
              padding: '0.375rem 0.625rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              fontSize: '0.8rem',
              minWidth: 180,
              flex: '1 1 180px',
              maxWidth: 300,
            }}
          />
          <select
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            style={{
              padding: '0.375rem 0.625rem',
              borderRadius: 6,
              border: filterGroup ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: 'var(--surface)',
              color: filterGroup ? 'var(--accent)' : 'var(--fg-muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            <option value="">All groups</option>
            <option value="__none__">No group</option>
            {data.groups.map(g => (
              <option key={g} value={g}>{formatGroupName(g)}</option>
            ))}
          </select>
          <select
            value={filterSeries}
            onChange={e => setFilterSeries(e.target.value)}
            style={{
              padding: '0.375rem 0.625rem',
              borderRadius: 6,
              border: filterSeries ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: 'var(--surface)',
              color: filterSeries ? 'var(--accent)' : 'var(--fg-muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            <option value="">All series</option>
            <option value="__none__">No series</option>
            {data.series.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {allTags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {allTags.map(tag => {
                const active = filterTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleFilterTag(tag)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: 999,
                      border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: active ? 'var(--surface-hover)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--fg-muted)',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {hasActiveFilters && (
          <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
            Showing {filteredPosts.length} of {data.posts.length} posts
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedSlugs.size > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 10,
          padding: '0.75rem 1rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
            {selectedSlugs.size} selected
          </span>
          <button
            onClick={() => setSelectedSlugs(new Set())}
            style={{
              background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer',
              fontSize: '0.75rem', textDecoration: 'underline',
            }}
          >
            Clear
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          {/* Bulk set date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="date"
              value={bulkDate}
              onChange={e => setBulkDate(e.target.value)}
              style={{
                fontSize: '0.75rem', padding: '3px 6px', borderRadius: 4,
                border: '1px solid var(--border)', background: 'var(--surface-hover)',
                color: 'var(--fg)', outline: 'none',
              }}
            />
            <button
              onClick={applyBulkDate}
              disabled={!bulkDate}
              style={{
                fontSize: '0.7rem', padding: '3px 8px', borderRadius: 4, border: 'none',
                background: bulkDate ? 'var(--accent)' : 'var(--surface-hover)',
                color: bulkDate ? '#fff' : 'var(--fg-muted)', cursor: bulkDate ? 'pointer' : 'default',
                fontWeight: 600,
              }}
            >
              Set date
            </button>
          </div>

          {/* Bulk set status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              style={{
                fontSize: '0.75rem', padding: '3px 6px', borderRadius: 4,
                border: '1px solid var(--border)', background: 'var(--surface-hover)',
                color: 'var(--fg)', outline: 'none',
              }}
            >
              <option value="">Status...</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
            <button
              onClick={applyBulkStatus}
              disabled={!bulkStatus}
              style={{
                fontSize: '0.7rem', padding: '3px 8px', borderRadius: 4, border: 'none',
                background: bulkStatus ? 'var(--accent)' : 'var(--surface-hover)',
                color: bulkStatus ? '#fff' : 'var(--fg-muted)', cursor: bulkStatus ? 'pointer' : 'default',
                fontWeight: 600,
              }}
            >
              Set status
            </button>
          </div>

          {/* Bulk assign series */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <select
              value={bulkSeries}
              onChange={e => setBulkSeries(e.target.value)}
              style={{
                fontSize: '0.75rem', padding: '3px 6px', borderRadius: 4,
                border: '1px solid var(--border)', background: 'var(--surface-hover)',
                color: 'var(--fg)', outline: 'none',
              }}
            >
              <option value="">Series...</option>
              <option value="__none__">No series</option>
              {data.series.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              onClick={applyBulkSeries}
              disabled={!bulkSeries}
              style={{
                fontSize: '0.7rem', padding: '3px 8px', borderRadius: 4, border: 'none',
                background: bulkSeries ? 'var(--accent)' : 'var(--surface-hover)',
                color: bulkSeries ? '#fff' : 'var(--fg-muted)', cursor: bulkSeries ? 'pointer' : 'default',
                fontWeight: 600,
              }}
            >
              Assign
            </button>
          </div>

          {/* Bulk add tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              value={bulkTag}
              onChange={e => setBulkTag(e.target.value)}
              placeholder="tag"
              onKeyDown={e => { if (e.key === 'Enter') applyBulkTag(); }}
              style={{
                fontSize: '0.75rem', padding: '3px 6px', borderRadius: 4, width: 80,
                border: '1px solid var(--border)', background: 'var(--surface-hover)',
                color: 'var(--fg)', outline: 'none',
              }}
            />
            <button
              onClick={applyBulkTag}
              disabled={!bulkTag.trim()}
              style={{
                fontSize: '0.7rem', padding: '3px 8px', borderRadius: 4, border: 'none',
                background: bulkTag.trim() ? 'var(--accent)' : 'var(--surface-hover)',
                color: bulkTag.trim() ? '#fff' : 'var(--fg-muted)', cursor: bulkTag.trim() ? 'pointer' : 'default',
                fontWeight: 600,
              }}
            >
              Add tag
            </button>
          </div>
        </div>
      )}

      {/* Auto-schedule preview modal */}
      {autoSchedulePreview && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setAutoSchedulePreview(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
              padding: '1.5rem', maxWidth: 520, width: '90%', maxHeight: '80vh', overflow: 'auto',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--fg)', margin: '0 0 0.25rem' }}>
              Auto-schedule Preview
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', margin: '0 0 1rem' }}>
              {autoSchedulePreview.length - previewExcluded.size} of {autoSchedulePreview.length} drafts will be scheduled. Uncheck any you want to skip.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {autoSchedulePreview.map(p => {
                const excluded = previewExcluded.has(p.slug);
                return (
                  <label
                    key={p.slug}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem',
                      borderRadius: 8, background: excluded ? 'transparent' : `${STATUS_COLORS.scheduled}0a`,
                      border: `1px solid ${excluded ? 'var(--border)' : STATUS_COLORS.scheduled + '44'}`,
                      cursor: 'pointer', opacity: excluded ? 0.5 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!excluded}
                      onChange={() => {
                        const next = new Set(previewExcluded);
                        if (excluded) next.delete(p.slug);
                        else next.add(p.slug);
                        setPreviewExcluded(next);
                      }}
                      style={{ accentColor: 'var(--neon-pink)' }}
                    />
                    <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--fg)', fontWeight: 500 }}>
                      {p.title}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--neon-pink)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {new Date(p.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </label>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setAutoSchedulePreview(null)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAutoSchedule}
                disabled={previewExcluded.size === autoSchedulePreview.length}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
                  background: previewExcluded.size === autoSchedulePreview.length ? 'var(--surface-hover)' : 'var(--neon-pink)',
                  color: '#fff', cursor: previewExcluded.size === autoSchedulePreview.length ? 'default' : 'pointer',
                  fontSize: '0.85rem', fontWeight: 600,
                }}
              >
                Schedule {autoSchedulePreview.length - previewExcluded.size} post{autoSchedulePreview.length - previewExcluded.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'list' && (
        <>
          {/* Select all header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', padding: '0 0.25rem',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={() => selectAll(filteredPosts)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', fontWeight: 500 }}>
                Select all ({filteredPosts.length})
              </span>
            </label>
          </div>

          {/* Post list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredPosts.map((post, index) => {
              const globalIndex = data.posts.indexOf(post);
              const isDragging = listDragSlug === post.slug;
              const isDropTarget = listDropTarget === globalIndex;
              const isFocused = index === focusedIndex;
              return (
                <div
                  key={post.slug}
                  ref={el => { postRefs.current[index] = el; }}
                  onClick={() => setFocusedIndex(index)}
                  onDragOver={!isFilterActive ? (e) => handleListDragOver(e, globalIndex) : undefined}
                  onDrop={!isFilterActive ? (e) => handleListDrop(e, globalIndex) : undefined}
                  style={{
                    background: selectedSlugs.has(post.slug) ? 'var(--surface-hover)' : 'var(--surface)',
                    border: isFocused || selectedSlugs.has(post.slug) ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '1rem 1.25rem',
                    borderLeft: `4px solid ${STATUS_COLORS[post.status] || 'var(--border)'}`,
                    opacity: isDragging ? 0.4 : 1,
                    borderTop: isDropTarget && !isDragging ? '3px solid var(--accent)' : undefined,
                    outline: isFocused ? '1px solid var(--accent)' : 'none',
                    outlineOffset: -1,
                    transition: 'opacity 0.15s, border-top 0.15s, outline 0.1s, background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    {/* Selection checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedSlugs.has(post.slug)}
                      onClick={e => toggleSelect(post.slug, e as unknown as MouseEvent)}
                      onChange={() => {}}
                      style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 4, cursor: 'pointer', flexShrink: 0 }}
                    />
                    {/* Drag handle */}
                    <div
                      draggable={!isFilterActive}
                      onDragStart={!isFilterActive ? (e) => handleListDragStart(e, post.slug) : undefined}
                      onDragEnd={handleListDragEnd}
                      style={{
                        cursor: isFilterActive ? 'default' : 'grab',
                        color: isFilterActive ? 'var(--border)' : 'var(--fg-muted)',
                        fontSize: '1rem',
                        lineHeight: 1,
                        padding: '4px 2px',
                        userSelect: 'none',
                        flexShrink: 0,
                      }}
                      title={isFilterActive ? 'Clear filters to reorder' : 'Drag to reorder'}
                    >
                      ⠿
                    </div>

                    {/* Post content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
                          {post.title}
                        </h3>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                          padding: '2px 8px', borderRadius: 4,
                          background: `${STATUS_COLORS[post.status]}22`,
                          color: STATUS_COLORS[post.status],
                        }}>
                          {post.status}
                        </span>
                        {post.group && (
                          <span
                            onClick={() => setFilterGroup(post.group!)}
                            style={{
                              fontSize: '0.65rem', fontWeight: 500, padding: '2px 8px', borderRadius: 4,
                              background: 'var(--surface-hover)', color: 'var(--fg-muted)',
                              border: '1px solid var(--border)', cursor: 'pointer',
                            }}
                            title={`Filter by group: ${formatGroupName(post.group)}`}
                          >
                            {formatGroupName(post.group)}
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', margin: '0.25rem 0 0.5rem', lineHeight: 1.4 }}>
                        {post.excerpt}
                      </p>

                      {/* Tags */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        {post.tags.map(tag => (
                          <span
                            key={tag}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: '0.7rem', padding: '2px 8px', borderRadius: 12,
                              background: filterTags.includes(tag) ? 'var(--surface-hover)' : 'var(--surface-hover)',
                              color: filterTags.includes(tag) ? 'var(--accent)' : 'var(--fg-muted)',
                              border: filterTags.includes(tag) ? '1px solid var(--accent)' : '1px solid var(--border)',
                            }}
                          >
                            <span
                              onClick={() => toggleFilterTag(tag)}
                              style={{ cursor: 'pointer' }}
                              title="Click to filter by this tag"
                            >
                              {tag}
                            </span>
                            <button
                              onClick={() => removeTag(post.slug, tag)}
                              style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: '0.7rem', padding: 0, lineHeight: 1 }}
                            >
                              x
                            </button>
                          </span>
                        ))}
                        {editingTags === post.slug ? (
                          <form
                            onSubmit={e => { e.preventDefault(); addTag(post.slug, tagInput); setTagInput(''); }}
                            style={{ display: 'inline-flex', gap: 4 }}
                          >
                            <input
                              value={tagInput}
                              onChange={e => setTagInput(e.target.value)}
                              placeholder="tag name"
                              autoFocus
                              onBlur={() => { if (!tagInput) setEditingTags(null); }}
                              style={{
                                fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4,
                                border: '1px solid var(--border)', background: 'var(--surface)',
                                color: 'var(--fg)', outline: 'none', width: 90,
                              }}
                            />
                          </form>
                        ) : (
                          <button
                            onClick={() => { setEditingTags(post.slug); setTagInput(''); }}
                            style={{
                              fontSize: '0.7rem', padding: '2px 8px', borderRadius: 12,
                              background: 'none', color: 'var(--accent)', cursor: 'pointer',
                              border: '1px dashed var(--accent)',
                            }}
                          >
                            + tag
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right controls: date, series, status */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', minWidth: 160 }}>
                      <input
                        type="date"
                        value={post.scheduledDate || ''}
                        onChange={e => updatePostDate(post.slug, e.target.value)}
                        style={{
                          fontSize: '0.8rem', padding: '4px 8px', borderRadius: 6,
                          border: '1px solid var(--border)', background: 'var(--surface)',
                          color: 'var(--fg)', outline: 'none',
                        }}
                      />
                      <select
                        value={post.series || ''}
                        onChange={e => updatePostSeries(post.slug, e.target.value || null)}
                        style={{
                          fontSize: '0.8rem', padding: '4px 8px', borderRadius: 6,
                          border: '1px solid var(--border)', background: 'var(--surface)',
                          color: 'var(--fg)', outline: 'none', width: '100%',
                        }}
                      >
                        <option value="">No series</option>
                        {data.series.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <select
                        value={post.status}
                        onChange={e => updatePostStatus(post.slug, e.target.value as ScheduledPost['status'])}
                        style={{
                          fontSize: '0.8rem', padding: '4px 8px', borderRadius: 6,
                          border: '1px solid var(--border)', background: 'var(--surface)',
                          color: STATUS_COLORS[post.status], outline: 'none', width: '100%',
                          fontWeight: 600,
                        }}
                      >
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-muted)' }}>
              No posts match this filter.
            </div>
          )}
        </>
      )}

      {view === 'calendar' && (
        <div style={{ display: 'flex', gap: '1rem' }}>
          {/* Calendar grid */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <button
                onClick={() => goToMonth(-1)}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
                  color: 'var(--fg-muted)', cursor: 'pointer', padding: '4px 10px', fontSize: '1rem',
                }}
              >
                &larr;
              </button>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--fg)', margin: 0, minWidth: 180, textAlign: 'center' }}>
                {MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}
              </h2>
              <button
                onClick={() => goToMonth(1)}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
                  color: 'var(--fg-muted)', cursor: 'pointer', padding: '4px 10px', fontSize: '1rem',
                }}
              >
                &rarr;
              </button>
              <button
                onClick={goToToday}
                style={{
                  background: 'transparent', border: '1px solid var(--accent)', borderRadius: 6,
                  color: 'var(--accent)', cursor: 'pointer', padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600,
                }}
              >
                Today
              </button>
            </div>

            {/* Weekday headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
              {WEEKDAY_HEADERS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: 'var(--fg-muted)', padding: '0.25rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
              {calendarDays.map(({ date, inMonth }) => {
                const ds = dateToString(date);
                const dayPosts = postsByDate[ds] || [];
                const isPublishDay = publishDaySet.has(dayNameMap[date.getDay()]);
                const isToday = ds === todayStr;
                const isSelected = ds === selectedDay;
                const hasConflict = dayPosts.length > 1;
                const isDragOver = ds === dragOverDay;

                return (
                  <div
                    key={ds}
                    onClick={() => setSelectedDay(isSelected ? null : ds)}
                    onDragOver={e => handleDragOver(e, ds)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, ds)}
                    style={{
                      minHeight: 80,
                      padding: '4px 6px',
                      background: isDragOver ? 'var(--surface-hover)' : isSelected ? 'var(--surface-hover)' : 'var(--surface)',
                      border: isToday
                        ? '2px solid var(--accent)'
                        : isSelected
                          ? '2px solid var(--fg-muted)'
                          : isPublishDay && dayPosts.length === 0
                            ? '1px dashed var(--accent)'
                            : '1px solid var(--border)',
                      borderRadius: 6,
                      opacity: inMonth ? 1 : 0.35,
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: isToday ? 700 : 500,
                        color: isToday ? 'var(--accent)' : 'var(--fg-muted)',
                      }}>
                        {date.getDate()}
                      </span>
                      {hasConflict && (
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700, background: '#ef4444', color: '#fff',
                          borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', lineHeight: 1,
                        }}>
                          {dayPosts.length}
                        </span>
                      )}
                    </div>
                    {dayPosts.slice(0, 3).map(post => (
                      <div
                        key={post.slug}
                        draggable
                        onDragStart={e => handleDragStart(e, post.slug)}
                        style={{
                          fontSize: '0.65rem',
                          padding: '1px 4px',
                          marginBottom: 1,
                          borderRadius: 3,
                          background: `${STATUS_COLORS[post.status]}22`,
                          borderLeft: `2px solid ${STATUS_COLORS[post.status]}`,
                          color: 'var(--fg)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'grab',
                        }}
                        title={post.title}
                        onClick={e => e.stopPropagation()}
                      >
                        {post.title}
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--fg-muted)' }}>
                        +{dayPosts.length - 3} more
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day sidebar */}
          {selectedDay && (
            <div style={{
              width: 280, flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '1rem', alignSelf: 'flex-start', position: 'sticky', top: '1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--fg)', margin: 0 }}>
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: '1rem' }}
                >
                  x
                </button>
              </div>
              {(postsByDate[selectedDay] || []).length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>No posts scheduled.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(postsByDate[selectedDay] || []).map(post => (
                    <div
                      key={post.slug}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 8,
                        borderLeft: `3px solid ${STATUS_COLORS[post.status]}`,
                        background: `${STATUS_COLORS[post.status]}0a`,
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>
                        {post.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase',
                          color: STATUS_COLORS[post.status],
                        }}>
                          {post.status}
                        </span>
                        {post.series && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--fg-muted)' }}>
                            {data.series.find(s => s.id === post.series)?.name}
                          </span>
                        )}
                      </div>
                      {post.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
                          {post.tags.map(tag => (
                            <span key={tag} style={{
                              fontSize: '0.6rem', padding: '1px 5px', borderRadius: 8,
                              background: 'var(--surface-hover)', color: 'var(--fg-muted)',
                              border: '1px solid var(--border)',
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <select
                        value={post.status}
                        onChange={e => updatePostStatus(post.slug, e.target.value as ScheduledPost['status'])}
                        style={{
                          marginTop: 6, fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4,
                          border: '1px solid var(--border)', background: 'var(--surface)',
                          color: STATUS_COLORS[post.status], outline: 'none', width: '100%', fontWeight: 600,
                        }}
                      >
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Series management */}
      <div style={{ marginTop: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--fg)' }}>Series</h2>
          <button
            onClick={() => setShowNewSeries(!showNewSeries)}
            style={{
              padding: '0.375rem 0.75rem', borderRadius: 8,
              border: '1px solid var(--accent)', background: 'transparent',
              color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            }}
          >
            {showNewSeries ? 'Cancel' : '+ New Series'}
          </button>
        </div>

        {showNewSeries && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end',
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>Name</label>
              <input
                value={newSeries.name}
                onChange={e => setNewSeries({ ...newSeries, name: e.target.value })}
                placeholder="e.g. Week in Review"
                style={{
                  width: '100%', fontSize: '0.875rem', padding: '6px 10px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'var(--surface-hover)',
                  color: 'var(--fg)', outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>Description</label>
              <input
                value={newSeries.description}
                onChange={e => setNewSeries({ ...newSeries, description: e.target.value })}
                placeholder="Brief description"
                style={{
                  width: '100%', fontSize: '0.875rem', padding: '6px 10px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'var(--surface-hover)',
                  color: 'var(--fg)', outline: 'none',
                }}
              />
            </div>
            <button
              onClick={addSeries}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none',
                background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap',
              }}
            >
              Add
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {data.series.map(s => {
            const seriesPosts = data.posts.filter(p => p.series === s.id);
            return (
              <div
                key={s.id}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '0.9rem' }}>{s.name}</span>
                  <span style={{ color: 'var(--fg-muted)', fontSize: '0.8rem', marginLeft: '0.75rem' }}>
                    {s.description}
                  </span>
                  <span style={{ color: 'var(--accent)', fontSize: '0.75rem', marginLeft: '0.75rem' }}>
                    {seriesPosts.length} post{seriesPosts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => removeSeries(s.id)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer',
                    fontSize: '0.8rem', padding: '4px 8px',
                  }}
                  title="Remove series"
                >
                  Remove
                </button>
              </div>
            );
          })}
          {data.series.length === 0 && (
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}>No series yet. Create one to group posts together.</p>
          )}
        </div>
      </div>

      {/* Schedule settings */}
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '1rem' }}>Publish Schedule</h2>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '1rem 1.25rem',
        }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginBottom: '0.75rem' }}>
            Posts auto-schedule to these days:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {DAY_OPTIONS.map(day => {
              const active = data.settings.publishDays.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => {
                    const publishDays = active
                      ? data.settings.publishDays.filter(d => d !== day)
                      : [...data.settings.publishDays, day];
                    const updated = { ...data, settings: { ...data.settings, publishDays } };
                    setData(updated);
                    save(updated);
                  }}
                  style={{
                    padding: '0.375rem 0.75rem', borderRadius: 6, fontSize: '0.8rem',
                    fontWeight: 500, textTransform: 'capitalize', cursor: 'pointer',
                    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: active ? 'var(--accent)' : 'var(--surface)',
                    color: active ? '#fff' : 'var(--fg-muted)',
                  }}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)', zIndex: 1000, color: 'var(--fg)', fontSize: '0.875rem',
        }}>
          <span>{toast.message}</span>
          <button
            onClick={() => { toast.onUndo(); dismissToast(); }}
            style={{
              background: 'none', border: '1px solid var(--accent)', borderRadius: 4,
              color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
              padding: '2px 10px',
            }}
          >
            Undo
          </button>
          <button
            onClick={dismissToast}
            style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmDialog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1001,
        }} onClick={() => setConfirmDialog(null)}>
          <div
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '1.5rem 2rem', maxWidth: 420, width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ color: 'var(--fg)', fontSize: '0.95rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDialog(null)}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: '0.875rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                autoFocus
                style={{
                  padding: '6px 16px', borderRadius: 6, border: 'none',
                  background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts cheat sheet */}
      {showShortcuts && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1001,
        }} onClick={() => setShowShortcuts(false)}>
          <div
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '1.5rem 2rem', maxWidth: 400, width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: 'var(--fg)', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              Keyboard Shortcuts
            </h3>
            {[
              ['j / ↓', 'Next post'],
              ['k / ↑', 'Previous post'],
              ['s', 'Cycle status'],
              ['d', 'Open date picker'],
              ['Space', 'Select / deselect post'],
              ['⌘A', 'Select all visible posts'],
              ['⌘S', 'Save'],
              ['Esc', 'Clear selection / close overlay'],
              ['?', 'Toggle this cheat sheet'],
            ].map(([key, desc]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <kbd style={{
                  background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 4,
                  padding: '1px 8px', fontSize: '0.8rem', color: 'var(--accent)', fontFamily: 'inherit',
                  minWidth: 60, textAlign: 'center',
                }}>{key}</kbd>
                <span style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
