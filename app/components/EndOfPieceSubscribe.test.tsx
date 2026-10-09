import type { ComponentProps } from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EndOfPieceSubscribe from './EndOfPieceSubscribe';

const mocks = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/lib/reader-analytics', () => ({ useReaderEventTracker: () => mocks.track }));

type Props = ComponentProps<typeof EndOfPieceSubscribe>;
const entries: Array<{ label: string; path: string; props: Props }> = [
  { label: 'project fiction', path: '/projects/story/story', props: { audience: 'fiction', source: 'post-end', kind: 'story', seriesTitle: 'A story series' } },
  { label: 'project essays', path: '/projects/arcade-blog/an-essay', props: { audience: 'essays', source: 'post-end', kind: 'essay', seriesTitle: 'The Singularity Log', seriesActive: true, totalParts: 18 } },
  { label: 'project build notes', path: '/projects/build/a-note', props: { audience: 'lab', source: 'post-end', kind: 'build note', seriesTitle: 'A build series' } },
  { label: 'Zoo chapter', path: '/novels/it-takes-a-zoo/cold-boot', props: { audience: 'fiction', source: 'zoo-chapter-end', kind: 'story', seriesTitle: 'It Takes a Zoo', seriesActive: true, totalParts: 8 } },
  { label: 'collection story', path: '/this-is-what-i-do-for-fun/a-story', props: { audience: 'fiction', source: 'collection-story-end', kind: 'story', seriesTitle: 'This Is What I Do for Fun' } },
  { label: 'portfolio piece', path: '/portfolio/a-story', props: { audience: 'fiction', source: 'portfolio-piece-end', kind: 'story' } },
  { label: 'Lab case study', path: '/lab/a-build', props: { audience: 'lab', source: 'lab-case-study-end', kind: 'build note' } },
];
const scope = "Join All Writing for stories, essays, and build notes when they're ready.";

describe('end-of-piece All Writing disclosure', () => {
  beforeEach(() => {
    mocks.track.mockClear();
    window.history.replaceState(null, '', '/stories');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: true, confirmationRequired: true })));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it.each(entries)('$label keeps one clear signup and submits the existing All Writing consent', async ({ path, props }) => {
    window.history.replaceState(null, '', path);
    render(<EndOfPieceSubscribe {...props} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Get new writing by email' })).toBeVisible();
    expect(screen.getByText((text) => text.includes(scope))).toBeVisible();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getAllByRole('button', { name: 'Send confirmation email' })).toHaveLength(1);
    expect(document.querySelectorAll('form')).toHaveLength(1);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email address'), 'reader@example.test');
    await user.click(screen.getByRole('button', { name: 'Send confirmation email' }));

    const request = vi.mocked(fetch).mock.calls;
    expect(request).toHaveLength(1);
    expect(request[0][0]).toBe('/api/subscribe');
    expect(request[0][1]?.method).toBe('POST');
    expect(JSON.parse(String(request[0][1]?.body))).toEqual({
      email: 'reader@example.test', audiences: ['all'], source: props.source, updateMode: 'add',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Check your inbox to confirm your All Writing request.');
    expect(screen.getByText('Kit may send additional confirmation emails for the topics you chose before delivery begins.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Browse the writing' })).toHaveAttribute('href', '/writing');
    expect(mocks.track.mock.calls.map(([event]) => event)).toEqual(['signup-request', 'signup-success']);
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain('reader@example.test');
  });

  it.each(['all', 'queer-columns', 'work-ai', 'th4f'] as const)('keeps the existing %s exclusion without another signup', audience => {
    const view = render(<EndOfPieceSubscribe audience={audience} source="post-end" kind="essay" />);
    expect(view.container).toBeEmptyDOMElement();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps pending-delivery request copy without claiming an active subscription', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ok: true, deliveryPending: true }));
    render(<EndOfPieceSubscribe audience="fiction" source="portfolio-piece-end" kind="story" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email address'), 'reader@example.test');
    await user.click(screen.getByRole('button', { name: 'Send confirmation email' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Your request is recorded. Check your inbox; if no confirmation arrives, try again in 10 minutes.');
    expect(screen.getByText(scope)).toBeVisible();
    expect(screen.queryByText(/you are subscribed/i)).not.toBeInTheDocument();
  });
});
