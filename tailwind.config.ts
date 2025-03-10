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
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100%',
            p: {
              maxWidth: '75ch',
              margin: '0 auto 1em auto',
            },
            h1: {
              maxWidth: '75ch',
              margin: '1.5em auto 0.5em auto',
            },
            h2: {
              maxWidth: '75ch',
              margin: '1.5em auto 0.5em auto',
            },
            h3: {
              maxWidth: '75ch',
              margin: '1.5em auto 0.5em auto',
            },
            blockquote: {
              maxWidth: '70ch',
              margin: '1.5em auto',
            },
            hr: {
              margin: '2em auto',
              maxWidth: '75ch',
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
