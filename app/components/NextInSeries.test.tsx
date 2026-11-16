import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NextInSeries from './NextInSeries';

const mocks = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/lib/reader-analytics', () => ({ useReaderEventTracker: () => mocks.track }));

describe('NextInSeries', () => {
  beforeEach(() => mocks.track.mockClear());
  afterEach(cleanup);

  it('makes the whole card one link to the next part and keeps the onward-reading event', async () => {
    render(
      <NextInSeries
        canonicalId="/projects/the-singularity-log/part-six"
        contentType="essay"
        seriesTitle="The Singularity Log"
        next={{ href: '/projects/the-singularity-log/after-scarcity', title: 'After Scarcity', partNumber: 7, totalParts: 25 }}
      />,
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/projects/the-singularity-log/after-scarcity');
    expect(links[0]).toHaveTextContent('Next in The Singularity Log');
    expect(links[0]).toHaveTextContent('Part 7 of 25');
    expect(links[0]).toHaveTextContent('After Scarcity');
    expect(links[0]).toHaveTextContent('Read part 7');

    const user = userEvent.setup();
    await user.click(links[0]);
    expect(mocks.track).toHaveBeenCalledWith('onward-reading', {
      canonicalId: '/projects/the-singularity-log/part-six',
      contentType: 'essay',
      placement: 'next-chapter',
      destination: '/projects/the-singularity-log/after-scarcity',
    });
  });

  it('points readers who finished a series to the blog', () => {
    render(<NextInSeries canonicalId="/projects/x/last" contentType="essay" seriesTitle="The Singularity Log" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/latest');
    expect(link).toHaveTextContent('You finished The Singularity Log');
    expect(link).toHaveTextContent('Find what to read next');
    expect(link).toHaveTextContent('See everything');
  });
});
