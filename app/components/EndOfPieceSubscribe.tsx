import type { Audience, Source } from '@/lib/subscribe-types';
import { endOfPieceCopy, type EndOfPieceKind } from '@/lib/subscription-copy';

import SubscriptionForm from './SubscriptionForm';
import styles from './EndOfPieceSubscribe.module.css';

type Props = {
  /** The reader's context; copy follows it, list membership does not. */
  audience: Audience;
  source: Source;
  kind: EndOfPieceKind;
  seriesTitle?: string;
  totalParts?: number;
  seriesActive?: boolean;
};

// Broadcasts target All Writing (or Essays), so the end-of-piece capture joins
// All Writing — the same list the sitewide footer form already uses.
const END_OF_PIECE_AUDIENCES: readonly Audience[] = ['all'];

export default function EndOfPieceSubscribe(props: Props) {
  const copy = endOfPieceCopy(props);
  return (
    <aside className={styles.capture} aria-label="Subscribe after reading">
      <p className={styles.eyebrow}>Keep the thread</p>
      <h2>Want the next one?</h2>
      <p className={styles.copy}>{copy}</p>
      <SubscriptionForm
        source={props.source}
        audiences={END_OF_PIECE_AUDIENCES}
        updateMode="add"
        presentation="compact"
        submitLabel="Send me the next one"
        successMessage="Check your inbox and tap the confirmation link."
      />
    </aside>
  );
}
