import type { Audience, Source } from '@/lib/subscribe-types';
import type { EndOfPieceKind } from '@/lib/subscription-copy';
import { endOfPieceCopy } from '@/lib/subscription-copy';
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
  const { audience, source, kind, seriesTitle, totalParts, seriesActive } = props;
  if (audience === 'queer-columns' || audience === 'work-ai' || audience === 'th4f' || audience === 'all') return null;

  const heading = seriesTitle
    ? `Get updates from ${seriesTitle} by email`
    : audience === 'fiction'
      ? 'Get new fiction by email'
      : audience === 'essays'
        ? 'Get new essays by email'
        : 'Get new build notes by email';

  return (
    <section className={styles.capture} aria-labelledby="end-of-piece-subscribe-heading">
      <p className={styles.eyebrow}>Keep reading</p>
      <h2 id="end-of-piece-subscribe-heading">{heading}</h2>
      <p className={styles.copy}>{endOfPieceCopy({ kind, seriesTitle, totalParts, seriesActive })}</p>
      <SubscriptionForm
        source={source}
        audiences={[audience]}
        updateMode="add"
        presentation="compact"
        submitLabel="Send confirmation email"
        successMessage="Check your inbox to confirm your subscription."
      />
    </section>
  );
}
