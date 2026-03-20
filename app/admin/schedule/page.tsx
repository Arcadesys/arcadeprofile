'use client';

import { useEffect, useState, useCallback, DragEvent } from 'react';

interface ScheduledPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledDate: string | null;
  tags: string[];
  series: string | null;
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

export default function ScheduleDashboard() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeries, setNewSeries] = useState({ name: '', description: '' });
  const [filter, setFilter] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/schedule');
    if (!res.ok) {
      setError('Failed to load schedule');
      return;
    }
    const json = await res.json();
    setData(json);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = async (updated: ScheduleData) => {
    setSaving(true);
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
    setSaving(false);
  };

  const movePost = (index: number, direction: -1 | 1) => {
    if (!data) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= data.posts.length) return;
    const posts = [...data.posts];
    [posts[index], posts[newIndex]] = [posts[newIndex], posts[index]];
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
  };

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
    const posts = data.posts.map(p =>
      p.slug === slug ? { ...p, tags: p.tags.filter(t => t !== tag) } : p
    );
    const updated = { ...data, posts };
    setData(updated);
    save(updated);
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
    const posts = data.posts.map(p => p.series === id ? { ...p, series: null } : p);
    const series = data.series.filter(s => s.id !== id);
    const updated = { ...data, posts, series };
    setData(updated);
    save(updated);
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

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--fg-muted)' }}>
        Loading schedule...
      </div>
    );
  }

  const filteredPosts = filter === 'all' ? data.posts : data.posts.filter(p => p.status === filter);
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

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
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
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: filter === f.value ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: filter === f.value ? 'var(--surface-hover)' : 'var(--surface)',
              color: filter === f.value ? 'var(--accent)' : 'var(--fg-muted)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {f.label} ({f.count})
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {draftCount > 0 && (
          <button
            onClick={autoSchedule}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: '1px solid var(--neon-pink)',
              background: 'transparent',
              color: 'var(--neon-pink)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Auto-schedule drafts
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          {/* Post list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredPosts.map((post) => {
              const globalIndex = data.posts.indexOf(post);
              return (
                <div
                  key={post.slug}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '1rem 1.25rem',
                    borderLeft: `4px solid ${STATUS_COLORS[post.status] || 'var(--border)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    {/* Reorder buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
                      <button
                        onClick={() => movePost(globalIndex, -1)}
                        disabled={globalIndex === 0}
                        style={{
                          background: 'none', border: 'none', cursor: globalIndex === 0 ? 'default' : 'pointer',
                          color: globalIndex === 0 ? 'var(--border)' : 'var(--fg-muted)',
                          fontSize: '1rem', lineHeight: 1, padding: '2px 4px',
                        }}
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => movePost(globalIndex, 1)}
                        disabled={globalIndex === data.posts.length - 1}
                        style={{
                          background: 'none', border: 'none',
                          cursor: globalIndex === data.posts.length - 1 ? 'default' : 'pointer',
                          color: globalIndex === data.posts.length - 1 ? 'var(--border)' : 'var(--fg-muted)',
                          fontSize: '1rem', lineHeight: 1, padding: '2px 4px',
                        }}
                        title="Move down"
                      >
                        ▼
                      </button>
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
                              background: 'var(--surface-hover)', color: 'var(--fg-muted)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {tag}
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
    </div>
  );
}
