import ReaderLink from './ReaderLink';
import styles from './NextInSeries.module.css';

type Next = {
  href: string;
  title: string;
  /** 1-based part number of the next piece. */
  partNumber: number;
  totalParts: number;
};

type Props = {
  canonicalId: string;
  contentType: string;
  seriesTitle: string;
  /** Leave out on the last part: the card then points to the series index. */
  next?: Next;
};

/**
 * One large, high-contrast card at the end of a piece. The whole card is a
 * single link, and it sends the same onward-reading event as the old links.
 */
export default function NextInSeries({ canonicalId, contentType, seriesTitle, next }: Props) {
  if (next) {
    return (
      <ReaderLink
        className={styles.card}
        canonicalId={canonicalId}
        contentType={contentType}
        placement="next-chapter"
        href={next.href}
      >
        <span className={styles.label}>Next in {seriesTitle}</span>
        <span className={styles.meta}>Part {next.partNumber} of {next.totalParts}</span>
        <span className={styles.title}>{next.title}</span>
        <span className={styles.button}>Read part {next.partNumber} <span aria-hidden="true">→</span></span>
      </ReaderLink>
    );
  }

  return (
    <ReaderLink
      className={styles.card}
      canonicalId={canonicalId}
      contentType={contentType}
      placement="series-finished"
      href="/latest"
    >
      <span className={styles.label}>You finished {seriesTitle}</span>
      <span className={styles.title}>Find what to read next</span>
      <span className={styles.button}>See everything <span aria-hidden="true">→</span></span>
    </ReaderLink>
  );
}
