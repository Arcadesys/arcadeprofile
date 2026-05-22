import { useId } from 'react';

type Variant = 'mark' | 'lockup' | 'stacked' | 'mono';

type Props = {
  size?: number;
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
};

const RATIO = 130 / 100;

function MarkSVG({ height, idPrefix }: { height: number; idPrefix: string }) {
  const coinGrad = `${idPrefix}-coin`;
  const slotGrad = `${idPrefix}-slot`;
  const glow = `${idPrefix}-glow`;
  const slotGlow = `${idPrefix}-slot-glow`;

  return (
    <svg
      viewBox="0 0 130 100"
      width={height * RATIO}
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={coinGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff8a00" />
          <stop offset="100%" stopColor="#ff3cac" />
        </linearGradient>
        <linearGradient id={slotGrad} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f5d98a" />
          <stop offset="60%" stopColor="#e8c777" />
          <stop offset="100%" stopColor="#c89a3e" />
        </linearGradient>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={slotGlow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${slotGlow})`}>
        <rect x="70" y="10" width="22" height="80" rx="11" fill="#0a0a14" stroke={`url(#${slotGrad})`} strokeWidth="2.5" />
        <rect x="80" y="22" width="2" height="56" rx="1" fill="#000" />
        <rect x="80" y="22" width="1" height="56" rx="0.5" fill="#c89a3e" opacity="0.55" />
      </g>

      <path d="M 81,28 A 22,22 0 1,0 81,72 L 81,28 Z" fill="#000" />
      <g filter={`url(#${glow})`}>
        <path
          d="M 81,28 A 22,22 0 1,0 81,72 A 17,17 0 1,1 81,28 Z"
          fill="none"
          stroke={`url(#${coinGrad})`}
          strokeWidth="2.8"
          opacity="0.95"
        />
        <path d="M 79,41 A 9,9 0 1,0 79,59 Z" fill="#ff8a00" opacity="0.78" />
      </g>
    </svg>
  );
}

function MonoSVG({ height, idPrefix }: { height: number; idPrefix: string }) {
  return (
    <svg
      viewBox="0 0 130 100"
      width={height * RATIO}
      height={height}
      style={{ display: 'block', color: 'currentColor' }}
      role="img"
      aria-hidden="true"
    >
      <rect x="70" y="10" width="22" height="80" rx="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <rect x="80" y="22" width="2" height="56" rx="1" fill="currentColor" />
      <path d="M 81,28 A 22,22 0 1,0 81,72 A 17,17 0 1,1 81,28 Z" fill="none" stroke="currentColor" strokeWidth="2.8" />
      <circle cx="79" cy="50" r="4" fill="currentColor" />
    </svg>
  );
}

export default function FreePlayColophon({
  size = 80,
  variant = 'mark',
  className,
  style,
  ariaLabel = 'Free Play Publishing',
}: Props) {
  const uid = useId().replace(/:/g, '');
  const idPrefix = `fp-${uid}`;

  if (variant === 'mark') {
    return (
      <span className={className} style={{ display: 'inline-block', ...style }} aria-label={ariaLabel} role="img">
        <MarkSVG height={size} idPrefix={idPrefix} />
      </span>
    );
  }

  if (variant === 'mono') {
    return (
      <span className={className} style={{ display: 'inline-block', ...style }} aria-label={ariaLabel} role="img">
        <MonoSVG height={size} idPrefix={idPrefix} />
      </span>
    );
  }

  if (variant === 'stacked') {
    const iconH = size * 0.62;
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.13, ...style }}
        aria-label={ariaLabel}
        role="img"
      >
        <MarkSVG height={iconH} idPrefix={idPrefix} />
        <span style={{ textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
          <span
            style={{
              display: 'block',
              fontWeight: 300,
              fontSize: size * 0.18,
              letterSpacing: '0.22em',
              color: '#ff3cac',
            }}
          >
            FREE&nbsp;PLAY
          </span>
          <span
            style={{
              display: 'block',
              fontSize: size * 0.09,
              letterSpacing: '0.18em',
              color: '#9a8e6e',
              marginTop: size * 0.04,
              fontStyle: 'italic',
              fontFamily: 'var(--font-serif)',
            }}
          >
            Publishing
          </span>
        </span>
      </span>
    );
  }

  // lockup
  const w = size;
  const markH = w * 0.22;
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: w * 0.035, ...style }}
      aria-label={ariaLabel}
      role="img"
    >
      <MarkSVG height={markH} idPrefix={idPrefix} />
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 300,
            fontSize: w * 0.085,
            letterSpacing: '0.22em',
            color: '#ff3cac',
            lineHeight: 1,
          }}
        >
          FREE&nbsp;PLAY
        </span>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: w * 0.042,
            letterSpacing: '0.04em',
            color: '#9a8e6e',
            marginTop: w * 0.012,
          }}
        >
          Publishing
        </span>
      </span>
    </span>
  );
}
