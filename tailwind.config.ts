import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        foreground: "var(--fg)",
        brand: {
          bg:      'var(--bg)',
          surface: 'var(--surface)',
          fg:      'var(--fg)',
          muted:   'var(--fg-muted)',
          accent:  'var(--accent)',
          pink:    'var(--neon-pink)',
          magenta: 'var(--magenta)',
          gold:    'var(--gold)',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100%',
            color: 'var(--fg)',
            a: {
              color: 'var(--neon-pink)',
              '&:hover': {
                color: 'var(--accent)',
              },
            },
            h1: {
              color: 'var(--fg)',
              maxWidth: '75ch',
              margin: '1.5em auto 0.5em auto',
            },
            h2: {
              color: 'var(--fg)',
              maxWidth: '75ch',
              margin: '1.5em auto 0.5em auto',
            },
            h3: {
              color: 'var(--fg-muted)',
              maxWidth: '75ch',
              margin: '1.5em auto 0.5em auto',
            },
            p: {
              maxWidth: '75ch',
              margin: '0 auto 1em auto',
            },
            blockquote: {
              maxWidth: '70ch',
              margin: '1.5em auto',
              borderLeftColor: 'var(--neon-pink)',
            },
            hr: {
              margin: '2em auto',
              maxWidth: '75ch',
              borderColor: 'var(--border)',
            },
            strong: {
              color: 'var(--fg)',
            },
            code: {
              color: 'var(--neon-pink)',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
