import { Analytics } from '@vercel/analytics/react';
import { Inter, JetBrains_Mono, Lora } from 'next/font/google';
import "../globals.css";
import { ThemeProvider } from '../components/ThemeContext';
import ThemeBg from '../components/ThemeBg';
import DockStack from '../components/DockStack';
import NavBar from '../components/NavBar';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-lora',
  display: 'swap',
});

export const metadata = {
  title: 'The Arcades',
  description: 'The Arcades - Personal site of Austen Tucker',
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
};

export default function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${lora.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <ThemeBg />
          <NavBar />
          <div style={{ paddingTop: 'var(--navbar-height, 3.5rem)' }}>
            {children}
          </div>
          <DockStack />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
