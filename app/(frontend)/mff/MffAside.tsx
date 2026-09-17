'use client';

import { useEffect, useState, type ReactNode } from 'react';

import styles from './mff.module.css';

const DESKTOP_QUERY = '(min-width: 900px)';

export function MffAside({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    setOpen(mq.matches);

    function onChange(event: MediaQueryListEvent) {
      setOpen(event.matches);
    }

    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <details
      className={styles.aside}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className={styles.asideSummary}>
        <span className={styles.kicker}>{kicker}</span>
        <span className={styles.asideTitle}>{title}</span>
      </summary>
      <div className={styles.asideBody}>{children}</div>
    </details>
  );
}
