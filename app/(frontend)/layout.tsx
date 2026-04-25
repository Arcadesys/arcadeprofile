import { Analytics } from '@vercel/analytics/react';
import "../globals.css";
import NavBar from '../components/NavBar.js';
import ThemeToggle from '../components/ThemeToggle';
import SiteFooter from '../components/SiteFooter';
import { CosmosProvider } from '../components/CosmosContext';
import CosmicBackground from '../components/CosmicBackground';
import { getFeaturedProjectHubs } from '@/lib/payload';
import type { ProjectHub } from '@/lib/payload';

export const metadata = {
  title: 'The Arcades',
  description: 'The Arcades - Personal site of Austen Tucker',
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
};

export default async function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let featuredProjects: ProjectHub[] = [];
  try {
    featuredProjects = await getFeaturedProjectHubs();
  } catch {
    featuredProjects = [];
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <CosmosProvider>
          <CosmicBackground />
          <NavBar featuredProjects={featuredProjects} />
          {children}
          <SiteFooter />
          <ThemeToggle />
          <Analytics />
        </CosmosProvider>
      </body>
    </html>
  );
}
