import "./globals.css";
import NavBar from './components/NavBar.js';
import ThemeProvider from './components/ThemeProvider';
import ThemeToggle from './components/ThemeToggle';

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
        <ThemeProvider>
          <NavBar />
          {children}
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
