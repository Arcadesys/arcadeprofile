'use client';

import Link from 'next/link';

export default function GroupScenesNavLink() {
  return (
    <Link
      href="/admin/group-scenes"
      style={{
        display: 'block',
        padding: 'var(--style-stroke-width-m, 4px) 0',
        color: 'var(--theme-text, inherit)',
        textDecoration: 'none',
        fontWeight: 500,
      }}
    >
      Group scenes
    </Link>
  );
}
