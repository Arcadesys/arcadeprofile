'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Frontmatter {
  title: string;
  date: string;
  excerpt: string;
  order: number | null;
  newsletterHeading: string | null;
  newsletterDescription: string | null;
}

interface PostData {
  slug: string;
  group: string | null;
  frontmatter: Frontmatter;
  body: string;
}

interface PostGunEditorProps {
  slug: string | null; // null = new post
}

type EditorMode = 'write' | 'preview';

interface ToolbarAction {
  label: string;
  icon: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: 'Bold', icon: 'B', prefix: '**', suffix: '**' },
  { label: 'Italic', icon: 'I', prefix: '_', suffix: '_' },
  { label: 'Code', icon: '<>', prefix: '`', suffix: '`' },
  { label: 'Link', icon: '🔗', prefix: '[', suffix: '](url)' },
  { label: 'Heading', icon: 'H', prefix: '## ', suffix: '', block: true },
  { label: 'List', icon: '•', prefix: '- ', suffix: '', block: true },
  { label: 'Quote', icon: '"', prefix: '> ', suffix: '', block: true },
  { label: 'Code Block', icon: '{ }', prefix: '```\n', suffix: '\n```', block: true },
];

const DEFAULT_FRONTMATTER: Frontmatter = {
  title: '', date: '', excerpt: '',
  order: null, newsletterHeading: null, newsletterDescription: null,
};

export default function PostGunEditor({ slug }: PostGunEditorProps) {
  const router = useRouter();
  const isNew = slug === null;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<EditorMode>('write');
  const [frontmatter, setFrontmatter] = useState<Frontmatter>({ ...DEFAULT_FRONTMATTER });
  const [body, setBody] = useState('');
  const [dirty, setDirty] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch existing post data
  useEffect(() => {
    if (isNew) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/blog/${slug}`);
        if (!res.ok) { setError(`Failed to load post (${res.status})`); setLoading(false); return; }
        const data: PostData = await res.json();
        setFrontmatter(data.frontmatter);
        setBody(data.body);
      } catch { setError('Network error loading post'); }
      setLoading(false);
    })();
  }, [slug, isNew]);

  // Fetch groups for new post dropdown
  useEffect(() => {
    if (!isNew) return;
    fetch('/api/schedule')
      .then(r => r.json())
      .then(d => { if (d.groups) setGroups(d.groups); })
      .catch(() => {});
  }, [isNew]);

  // Auto-generate slug from title for new posts
  useEffect(() => {
    if (!isNew || newSlug) return;
    // Only auto-slug if user hasn't manually edited slug
  }, [frontmatter.title, isNew, newSlug]);

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const updateFm = (patch: Partial<Frontmatter>) => {
    setFrontmatter(prev => ({ ...prev, ...patch }));
    setDirty(true);
    setSaved(false);
  };

  const updateBody = (value: string) => {
    setBody(value);
    setDirty(true);
    setSaved(false);
  };

  const applyToolbarAction = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end);

    let newText: string;
    let cursorPos: number;

    if (action.block && start === end) {
      // For block actions with no selection, ensure we're on a new line
      const beforeCursor = body.slice(0, start);
      const needsNewline = beforeCursor.length > 0 && !beforeCursor.endsWith('\n');
      const prefix = (needsNewline ? '\n' : '') + action.prefix;
      newText = body.slice(0, start) + prefix + action.suffix + body.slice(end);
      cursorPos = start + prefix.length;
    } else {
      newText = body.slice(0, start) + action.prefix + selected + action.suffix + body.slice(end);
      cursorPos = start + action.prefix.length + selected.length;
    }

    setBody(newText);
    setDirty(true);
    setSaved(false);

    // Restore focus and cursor position
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      if (isNew) {
        const slugToUse = newSlug || generateSlug(frontmatter.title);
        if (!slugToUse) { setError('Title or slug is required'); setSaving(false); return; }

        const res = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: slugToUse,
            group: newGroup || undefined,
            frontmatter,
            body,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to create post');
          setSaving(false);
          return;
        }

        setDirty(false);
        setSaved(true);
        setSaving(false);
        // Navigate to the edit route for the new post
        router.push(`/admin/editor/${slugToUse}`);
      } else {
        const res = await fetch(`/api/blog/${slug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frontmatter, body }),
        });
        if (!res.ok) { setError('Failed to save'); setSaving(false); return; }
        setDirty(false);
        setSaved(true);
        setSaving(false);
      }
    } catch {
      setError('Network error saving post');
      setSaving(false);
    }
  }, [saving, isNew, newSlug, newGroup, frontmatter, body, slug, router]);

  const publish = useCallback(async () => {
    if (publishing || isNew) return;

    // Save first if dirty
    if (dirty) {
      await save();
    }

    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/blog/${slug}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: frontmatter.date || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to publish');
        setPublishing(false);
        return;
      }
      setPublishing(false);
      router.push('/admin/schedule');
    } catch {
      setError('Network error publishing post');
      setPublishing(false);
    }
  }, [publishing, isNew, dirty, save, slug, frontmatter.date, router]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
      if (e.key === 'Escape') {
        router.push('/admin/schedule');
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [save, router]);

  // Simple markdown to HTML for preview
  const renderPreview = (md: string) => {
    let html = md
      // Code blocks (must come before inline code)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Headings
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Inline code
      .replace(/`(.+?)`/g, '<code style="background:var(--surface-hover);padding:2px 6px;border-radius:4px;font-size:0.85em">$1</code>')
      // Links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:var(--accent)">$1</a>')
      // Blockquotes
      .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid var(--accent);padding-left:1rem;color:var(--fg-muted);margin:0.5rem 0">$1</blockquote>')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Paragraphs (double newline)
      .replace(/\n\n/g, '</p><p>')
      // Single newlines to <br>
      .replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
  };

  const inputStyle = {
    fontSize: '0.85rem',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--fg)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    fontSize: '0.7rem',
    fontWeight: 600 as const,
    color: 'var(--fg-muted)',
    marginBottom: '4px',
    display: 'block' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--fg-muted)', background: 'var(--bg)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.push('/admin/schedule')}
            style={{
              background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer',
              fontSize: '0.85rem', padding: '4px 8px',
            }}
          >
            ← Schedule
          </button>
          <h1 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
            {isNew ? 'New Post' : 'Edit Post'}
          </h1>
          {dirty && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 500 }}>Unsaved</span>}
          {saved && !dirty && <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 500 }}>Saved</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {error && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</span>}
          <button
            onClick={save}
            disabled={saving || (!dirty && !isNew)}
            style={{
              padding: '6px 20px',
              borderRadius: 6,
              border: 'none',
              background: (dirty || isNew) ? 'var(--accent)' : 'var(--surface)',
              color: (dirty || isNew) ? '#fff' : 'var(--fg-muted)',
              cursor: (dirty || isNew) ? 'pointer' : 'default',
              fontSize: '0.8rem',
              fontWeight: 600,
              opacity: (dirty || isNew) ? 1 : 0.5,
            }}
          >
            {saving ? 'Saving...' : isNew ? 'Create Post' : 'Save'}
          </button>
          {!isNew && (
            <button
              onClick={publish}
              disabled={publishing}
              style={{
                padding: '6px 20px',
                borderRadius: 6,
                border: 'none',
                background: '#4ade80',
                color: '#000',
                cursor: publishing ? 'default' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                opacity: publishing ? 0.6 : 1,
              }}
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left sidebar - metadata */}
        <div style={{
          width: 280,
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          padding: '1.25rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          {/* New post fields */}
          {isNew && (
            <>
              <div>
                <label style={labelStyle}>Slug</label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder={generateSlug(frontmatter.title) || 'auto-from-title'}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Group</label>
                <select
                  value={newGroup}
                  onChange={e => setNewGroup(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">No group (top-level)</option>
                  {groups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={frontmatter.title}
              onChange={e => updateFm({ title: e.target.value })}
              style={inputStyle}
              placeholder="Post title"
            />
          </div>

          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={frontmatter.date}
              onChange={e => updateFm({ date: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Excerpt</label>
            <textarea
              value={frontmatter.excerpt}
              onChange={e => updateFm({ excerpt: e.target.value })}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              placeholder="Brief description..."
            />
          </div>

          {/* Voice pack slot placeholder */}
          <div style={{
            padding: '1rem',
            borderRadius: 8,
            border: '1px dashed var(--border)',
            color: 'var(--fg-muted)',
            fontSize: '0.75rem',
            textAlign: 'center',
          }}>
            Voice pack selector (coming soon)
          </div>
        </div>

        {/* Editor area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '6px 12px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            flexShrink: 0,
          }}>
            {TOOLBAR_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => applyToolbarAction(action)}
                title={action.label}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--fg-muted)',
                  cursor: 'pointer',
                  fontSize: action.icon.length > 2 ? '0.7rem' : '0.8rem',
                  fontWeight: action.icon === 'B' ? 700 : action.icon === 'I' ? 400 : 500,
                  fontStyle: action.icon === 'I' ? 'italic' : 'normal',
                  fontFamily: action.icon === 'B' || action.icon === 'I' ? 'serif' : 'inherit',
                  lineHeight: 1,
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
              >
                {action.icon}
              </button>
            ))}

            <div style={{ flex: 1 }} />

            {/* Mode toggle */}
            <div style={{
              display: 'flex',
              borderRadius: 6,
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}>
              <button
                onClick={() => setMode('write')}
                style={{
                  padding: '4px 12px',
                  border: 'none',
                  background: mode === 'write' ? 'var(--accent)' : 'transparent',
                  color: mode === 'write' ? '#fff' : 'var(--fg-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                Write
              </button>
              <button
                onClick={() => setMode('preview')}
                style={{
                  padding: '4px 12px',
                  border: 'none',
                  borderLeft: '1px solid var(--border)',
                  background: mode === 'preview' ? 'var(--accent)' : 'transparent',
                  color: mode === 'preview' ? '#fff' : 'var(--fg-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                Preview
              </button>
            </div>
          </div>

          {/* Editor / Preview content */}
          {mode === 'write' ? (
            <textarea
              ref={textareaRef}
              value={body}
              onChange={e => updateBody(e.target.value)}
              style={{
                flex: 1,
                resize: 'none',
                padding: '1.5rem',
                border: 'none',
                background: 'var(--bg)',
                color: 'var(--fg)',
                outline: 'none',
                fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                fontSize: '0.85rem',
                lineHeight: 1.7,
                tabSize: 2,
              }}
              placeholder="Start writing..."
              spellCheck={false}
              onKeyDown={e => {
                // Tab inserts spaces instead of changing focus
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  const newVal = body.slice(0, start) + '  ' + body.slice(end);
                  setBody(newVal);
                  setDirty(true);
                  requestAnimationFrame(() => {
                    e.currentTarget.setSelectionRange(start + 2, start + 2);
                  });
                }
              }}
            />
          ) : (
            <div
              style={{
                flex: 1,
                padding: '1.5rem',
                overflowY: 'auto',
                fontSize: '0.95rem',
                lineHeight: 1.7,
                color: 'var(--fg)',
              }}
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderPreview(body) }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
