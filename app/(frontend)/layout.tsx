import { Analytics } from '@vercel/analytics/react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import "../globals.css";
import NavBar from '../components/NavBar.js';
import ThemeToggle from '../components/ThemeToggle';
import SiteFooter from '../components/SiteFooter';
import { CosmosProvider } from '../components/CosmosContext';
import CosmicBackground from '../components/CosmicBackground';

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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body>
        <CosmosProvider>
          <CosmicBackground />
          <NavBar />
          {children}
          <SiteFooter />
          <ThemeToggle />
          <Analytics />
        </CosmosProvider>
      </body>
    </html>
  );
}
