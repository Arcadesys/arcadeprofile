'use client';

import { useEffect, useRef, useState } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  drift: number;
  hue: number; // 0-1 picks from palette
}

// Dark mode: cool white/blue stars. Light mode: warm golden dust motes.
const PALETTES = {
  dark: [
    [232, 232, 236], // cool white
    [255, 232, 204], // warm white accent
  ],
  light: [
    [224, 120, 0],   // warm amber
    [204, 136, 0],   // gold
    [212, 46, 144],  // rose accent (rare)
  ],
};

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDark, setIsDark] = useState(true);

  // Watch for theme class changes on <html>
  useEffect(() => {
    const el = document.documentElement;
    setIsDark(!el.classList.contains('light'));

    const observer = new MutationObserver(() => {
      setIsDark(!el.classList.contains('light'));
    });
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = isDark ? PALETTES.dark : PALETTES.light;
    // Light mode: fewer particles, lower alpha — like dust in a sunbeam
    const densityDivisor = isDark ? 12000 : 18000;
    const alphaScale = isDark ? 1 : 0.5;

    let animId: number;
    let stars: Star[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      initStars();
    }

    function initStars() {
      const count = Math.floor((canvas!.width * canvas!.height) / densityDivisor);
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          r: Math.random() * 1.2 + 0.3,
          baseAlpha: (Math.random() * 0.4 + 0.1) * alphaScale,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.3 + 0.1,
          drift: (Math.random() - 0.5) * 0.08,
          hue: Math.random(),
        });
      }
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const t = time * 0.001;

      for (const star of stars) {
        const twinkle = prefersReduced ? 1 : Math.sin(t * star.speed + star.phase) * 0.3 + 0.7;
        const alpha = star.baseAlpha * twinkle;

        if (!prefersReduced) star.y += star.drift;
        if (star.y < -2) star.y = canvas!.height + 2;
        if (star.y > canvas!.height + 2) star.y = -2;

        const colorIdx = Math.floor(star.hue * palette.length) % palette.length;
        const [r, g, b] = palette[colorIdx];

        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx!.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    animId = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
