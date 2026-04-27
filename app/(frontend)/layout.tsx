import { Analytics } from '@vercel/analytics/react';
import "../globals.css";
import NavBar from '../components/NavBar.js';
import ThemeToggle from '../components/ThemeToggle';
import SiteFooter from '../components/SiteFooter';
import { CosmosProvider } from '../components/CosmosContext';
import CosmicBackground from '../components/CosmicBackground';

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
    <html lang="en" suppressHydrationWarning>
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
