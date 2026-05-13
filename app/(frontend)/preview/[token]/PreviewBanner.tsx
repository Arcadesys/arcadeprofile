type Props = {
  status: string;
  scheduledPublishDate?: string | null;
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  sent: 'Published',
};

function formatScheduled(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export default function PreviewBanner({ status, scheduledPublishDate }: Props) {
  const statusLabel = statusLabels[status] ?? status;
  const scheduled = scheduledPublishDate ? formatScheduled(scheduledPublishDate) : null;

  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255, 60, 172, 0.12)',
        borderBottom: '1px solid rgba(255, 60, 172, 0.4)',
        backdropFilter: 'blur(6px)',
        padding: '0.55rem 1rem',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--neon-pink, #ff3cac)',
      }}
    >
      <strong style={{ marginRight: '0.6rem' }}>Preview — not yet published</strong>
      <span style={{ opacity: 0.8 }}>
        {statusLabel}
        {scheduled ? ` · scheduled for ${scheduled}` : ''}
      </span>
    </div>
  );
}
