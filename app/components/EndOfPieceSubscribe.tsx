import type { Audience, Source } from '@/lib/subscribe-types';
import type { EndOfPieceKind } from '@/lib/subscription-copy';

type Props = {
  audience: Audience;
  source: Source;
  kind: EndOfPieceKind;
  seriesTitle?: string;
  totalParts?: number;
  seriesActive?: boolean;
};

export default function EndOfPieceSubscribe(props: Props) {
  void props;
  return null;
}
