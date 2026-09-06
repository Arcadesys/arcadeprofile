import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import { Barlow_Condensed, Inter, JetBrains_Mono, Lora } from 'next/font/google';
import "../globals.css";
import { LightsProvider } from '../components/LightsContext';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { JsonLd } from '@/lib/structured-data';
import { LIGHTS_BOOTSTRAP_SCRIPT } from '@/lib/lights';
import { SITE_DESCRIPTION, SITE_NAME, SITE_NAME_UPPER, SITE_TITLE_DEFAULT } from '@/lib/site-brand';
import { SITE_URL } from '@/lib/site-url';

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

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Austen Tucker', url: SITE_URL }],
  creator: 'Austen Tucker',
  publisher: 'Austen Tucker',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  alternateName: SITE_NAME_UPPER,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: 'en-US',
  author: { '@id': `${SITE_URL}/#person` },
  publisher: { '@id': `${SITE_URL}/#person` },
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${SITE_URL}/#person`,
  name: 'Austen Tucker',
  alternateName: 'Austen Tucker-Crowder',
  url: SITE_URL,
  jobTitle: 'AI Enablement & Transformation Lead',
  sameAs: [
    'https://github.com/Arcadesys',
  ],
};

export default function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${lora.variable} ${barlowCondensed.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: LIGHTS_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <JsonLd data={websiteJsonLd} />
        <JsonLd data={personJsonLd} />
        <LightsProvider>
          <a className="skip-link" href="#main-content">Skip to content</a>
          <div className="nav-wrapper">
            <Navbar />
          </div>
          <span className="skip-target" id="main-content" tabIndex={-1} />
          {children}
          <Footer />
        </LightsProvider>
        <Analytics />
      </body>
    </html>
  );
}
