import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-work-queue-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-work-queue-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Work Queue',
  robots: { index: false, follow: false },
};

export default function WorkQueueLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
