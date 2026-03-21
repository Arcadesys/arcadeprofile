import "./globals.css";
import NavBar from './components/NavBar.js';
import ThemeProvider from './components/ThemeProvider';
import ThemeToggle from './components/ThemeToggle';
import SimpleAnalytics from './components/SimpleAnalytics';
import SiteFooter from './components/SiteFooter';
export const metadata = {
  title: 'The Arcades',
  description: 'The Arcades - Personal site of Austen Tucker',
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <NavBar />
          {children}
          <SiteFooter />
          <ThemeToggle />
          <SimpleAnalytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
