'use client';

import Link from 'next/link';

export default function HopperNavLink() {
  return (
    <Link
      href="/admin/hopper"
      style={{
        display: 'block',
        padding: 'var(--style-stroke-width-m, 4px) 0',
        color: 'var(--theme-text, inherit)',
        textDecoration: 'none',
        fontWeight: 500,
      }}
    >
      Hopper
    </Link>
  );
}
