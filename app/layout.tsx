import "./globals.css";
import NavBar from './components/NavBar.js';
import SimpleAnalytics from './components/SimpleAnalytics';
import ThemeToggle from './components/ThemeToggle';
import SiteFooter from './components/SiteFooter';
import { CosmosProvider } from './components/CosmosContext';
import CosmicBackground from './components/CosmicBackground';

export const metadata = {
  title: 'The Arcades',
  description: 'The Arcades - Personal site of Austen Tucker',
};

export default function RootLayout({
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
          <SimpleAnalytics />
        </CosmosProvider>
      </body>
    </html>
  );
}
