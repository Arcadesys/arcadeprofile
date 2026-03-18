# The Arcades — CSS Redesign Spec

**Author:** Remy (UX Designer)
**Date:** 2026-03-17
**Task:** [THE-123](/THE/issues/THE-123) / [THE-121](/THE/issues/THE-121)
**Status:** Design spec — ready for implementation

---

## Overview

Redesign the arcadeprofile site CSS to match the approved V13 neon brand direction. Dark-first theme with neon pink/orange accents. The site already has a working light/dark toggle and Tailwind setup — this spec upgrades the color tokens, navbar, and component styles to align with the final logo and brand.

---

## 1. Color Tokens

Replace the current CSS custom properties in `globals.css`. The new palette is dark-first — dark mode is the default, light mode is the alternate.

```
Current                    → New
--accent-color: orange     → --accent: #ff8a00 (orange)
--neonpink: #ff6ec7        → --neon-pink: #ff3cac
(new)                      → --neon-orange: #ff8a00
(new)                      → --magenta: #ff6b9d
(new)                      → --gold: #ffaa00
--background: #1a1a1a      → --bg: #0a0a14
--foreground: #fff         → --fg: #e8e8ec
(new)                      → --surface: #14142a
(new)                      → --surface-hover: #1e1e3a
--button-background: …     → --btn-bg: #1a1a30
```

### :root (dark-first default)

```css
:root {
  --bg:            #0a0a14;
  --surface:       #14142a;
  --surface-hover: #1e1e3a;
  --fg:            #e8e8ec;
  --fg-muted:      #9a9ab0;
  --accent:        #ff8a00;
  --neon-pink:     #ff3cac;
  --magenta:       #ff6b9d;
  --gold:          #ffaa00;
  --btn-bg:        #1a1a30;
  --glow-pink:     rgba(255, 60, 172, 0.4);
  --glow-orange:   rgba(255, 138, 0, 0.3);
  --border:        rgba(255, 138, 0, 0.2);
}
```

### .light (opt-in light mode)

```css
.light {
  --bg:            #faf9f7;
  --surface:       #ffffff;
  --surface-hover: #f0eeeb;
  --fg:            #1a1a2e;
  --fg-muted:      #6b6b80;
  --accent:        #e07800;
  --neon-pink:     #d42e90;
  --magenta:       #c44f7a;
  --gold:          #cc8800;
  --btn-bg:        #f0eeeb;
  --glow-pink:     rgba(212, 46, 144, 0.15);
  --glow-orange:   rgba(224, 120, 0, 0.1);
  --border:        rgba(0, 0, 0, 0.1);
}
```

**Note:** Switch ThemeProvider from `class="dark"` to `class="light"` toggling. Dark is the new default — no class needed for dark.

---

## 2. Background

Remove the Glitch CDN arcade background image. Replace with a solid dark background + subtle radial gradient.

```css
body {
  background: var(--bg);
  background-image:
    radial-gradient(ellipse at 20% 50%, var(--glow-orange) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, var(--glow-pink) 0%, transparent 50%);
  background-attachment: fixed;
  color: var(--fg);
}
```

This gives a very subtle neon ambient glow without a busy background image.

---

## 3. Navbar Redesign

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ [logo.svg]  THE ARCADES     Home  Books  Blog  About    │
└──────────────────────────────────────────────────────────┘
```

- Logo SVG (`the-arcades-logo-final-v13.svg`) in top-left, height 36px
- Text links to the right, flex row with gap
- Sticky, `backdrop-filter: blur(12px)`, semi-transparent `--surface`
- No box-shadow — use a 1px bottom border in `var(--border)`

### NavBar.module.css changes

```css
.navbar {
  background-color: rgba(10, 10, 20, 0.85);
  border-bottom: 1px solid var(--border);
  box-shadow: none;
  backdrop-filter: blur(12px);
}

.menu a {
  color: var(--fg-muted);
  font-weight: 400;
  letter-spacing: 0.03em;
  transition: color 0.2s;
}

.menu a:hover {
  color: var(--neon-pink);
  background: none;
  text-shadow: 0 0 8px var(--glow-pink);
}

.menu a.active {
  color: var(--neon-pink);
  font-weight: 500;
  background: none;
  text-shadow: 0 0 12px var(--glow-pink);
}
```

### Mobile menu

```css
.menu (mobile) {
  background-color: rgba(10, 10, 20, 0.95);
  border: 1px solid var(--border);
}

.menu li {
  border-bottom: 1px solid var(--border);
}
```

### NavBar.js changes

- Add `<Image>` or `<img>` for logo SVG before nav links
- Add logo as an `<Link href="/">` wrapping the SVG
- Update nav links per information architecture:

```js
const navLinks = [
  { href: '/',          label: 'Home' },
  { href: '/previews',  label: 'Books' },       // shorter label
  { href: '/blog',      label: 'Blog' },
  { href: '/portfolio', label: 'Tools' },        // renamed
  // Future: { href: '/about', label: 'About' },
];
```

---

## 4. Content Cards (`.austenbox`, `.arcadebox`)

Replace the orange outline style with surface cards that blend with the dark theme.

```css
.austenbox, .arcadebox {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  outline: none;                        /* remove old orange outline */
  box-shadow: 0 0 30px var(--glow-pink);  /* subtle neon glow */
  padding: 2rem;
  max-width: 800px;
  margin: 2rem auto;
}
```

---

## 5. Buttons

```css
.button-link {
  background: var(--btn-bg);
  color: var(--fg);
  border: 1px solid var(--neon-pink);
  border-radius: 8px;              /* less round, more modern */
  padding: 10px 20px;
  transition: all 0.2s;
}

.button-link:hover {
  background: var(--neon-pink);
  color: #fff;
  box-shadow: 0 0 16px var(--glow-pink);
  border-color: var(--neon-pink);
}

.buy-button {
  background: linear-gradient(135deg, var(--accent), var(--neon-pink));
  color: #fff;
  border: none;
}

.buy-button:hover {
  box-shadow: 0 0 20px var(--glow-pink);
  filter: brightness(1.1);
}
```

---

## 6. Typography

```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
               Roboto, 'Helvetica Neue', Arial, sans-serif;
}

h1 { color: var(--fg); }
h2 { color: var(--fg); }
h3 { color: var(--fg-muted); }
p, ul { color: var(--fg); }

a {
  color: var(--neon-pink);
}
a:hover {
  color: var(--accent);
  text-shadow: 0 0 6px var(--glow-pink);
}
```

---

## 7. `.gaysparkles` Effect Update

Match the new neon pink:

```css
.gaysparkles {
  text-shadow:
    0 0 10px var(--neon-pink),
    0 0 20px var(--neon-pink),
    0 0 40px var(--magenta);
}
```

---

## 8. Avatar

```css
.avatar {
  border: 3px solid var(--neon-pink);
  box-shadow: 0 0 20px var(--glow-pink), 0 0 40px var(--glow-orange);
}
```

---

## 9. Dividers (`hr`)

```css
hr {
  background: linear-gradient(90deg, transparent, var(--neon-pink), var(--accent), transparent);
  height: 1px;
  border: none;
}
```

---

## 10. Social Icons (Homepage footer)

Replace the brown `bg-[#6c3805]` circles:

```
Current: bg-[#6c3805] border-2 border-orange-500
New:     bg-[var(--btn-bg)] border border-[var(--border)]
         hover:border-[var(--neon-pink)] hover:shadow-[0_0_12px_var(--glow-pink)]
```

---

## 11. Tailwind Config Updates

Add brand colors to `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      brand: {
        bg:       'var(--bg)',
        surface:  'var(--surface)',
        fg:       'var(--fg)',
        muted:    'var(--fg-muted)',
        accent:   'var(--accent)',
        pink:     'var(--neon-pink)',
        magenta:  'var(--magenta)',
        gold:     'var(--gold)',
      }
    }
  }
}
```

---

## 12. State Specs

### Empty / loading

- Content areas show a pulsing skeleton with `var(--surface)` background
- No spinners — use subtle opacity fade-in

### Overflow

- Book gallery: horizontal scroll on mobile with snap points, grid on desktop
- Nav links: collapse to hamburger at 768px (unchanged)

### Error

- Error text in `var(--magenta)` with no red — keeps brand cohesion

---

## 13. Accessibility Notes

- The site creator is blind — all interactions must be keyboard-accessible (already true)
- Neon pink on dark background (#ff3cac on #0a0a14) = contrast ratio ~4.8:1 — passes AA for large text and UI components. For body text, use `--fg` (#e8e8ec on #0a0a14 = ~17:1)
- Neon hover glows are decorative — no information conveyed only via glow
- Focus indicators: `outline: 2px solid var(--neon-pink); outline-offset: 2px`

---

## 14. Files Changed

| File | Changes |
|------|---------|
| `app/globals.css` | New color tokens, background, component styles |
| `app/components/NavBar.module.css` | Dark theme, glow hovers, logo placement |
| `app/components/NavBar.js` | Add logo SVG, update nav links |
| `tailwind.config.ts` | Add brand color aliases |
| `app/layout.tsx` | Dark-first theme default |
| `app/page.tsx` | Remove inline brown styles, use new classes |
| `public/` | Add `the-arcades-logo-final-v13.svg` |

---

## Visual Summary

```
BEFORE                              AFTER
─────────────────────               ─────────────────────
Orange outline cards                Dark surface cards + pink glow
Brown buttons                       Dark buttons + neon pink border
Glitch arcade bg image              Solid dark + subtle gradient glow
Orange accent links                 Neon pink links
White/gray navbar                   Dark glass navbar + logo
```
