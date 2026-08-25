import type { Audience, Source } from '@/lib/subscribe-types';
import { endOfPieceCopy, type EndOfPieceKind } from '@/lib/subscription-copy';

import SubscriptionForm from './SubscriptionForm';
import styles from './EndOfPieceSubscribe.module.css';

type Props = {
  audience: Audience;
  source: Source;
  kind: EndOfPieceKind;
  seriesTitle?: string;
  totalParts?: number;
  seriesActive?: boolean;
};

export default function EndOfPieceSubscribe(props: Props) {
  const copy = endOfPieceCopy(props);
  return (
    <aside className={styles.capture} aria-label="Subscribe after reading">
      <p className={styles.eyebrow}>Keep the thread</p>
      <h2>Read it as it arrives</h2>
      <p className={styles.copy}>{copy}</p>
      <SubscriptionForm
        source={props.source}
        audiences={[props.audience]}
        updateMode="add"
        presentation="compact"
        submitLabel="Send me the next one"
      />
    </aside>
  );
}
