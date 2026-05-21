'use client';

import Link from 'next/link';

export default function CalendarNavLink() {
  return (
    <Link
      href="/admin/calendar"
      style={{
        display: 'block',
        padding: 'var(--style-stroke-width-m, 4px) 0',
        color: 'var(--theme-text, inherit)',
        textDecoration: 'none',
        fontWeight: 500,
      }}
    >
      Calendar
    </Link>
  );
}
