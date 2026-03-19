'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  drift: number;
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep dark-mode state in sync across hydration and class/theme changes.
  useEffect(() => {
    if (!mounted) return;

    const el = document.documentElement;
    const updateIsDark = () => {
      const themeFromHook = resolvedTheme ?? theme;
      const darkFromHook = themeFromHook === 'dark';
      const darkFromClass = el.classList.contains('dark') && !el.classList.contains('light');
      setIsDark(darkFromHook || darkFromClass);
    };

    updateIsDark();

    const observer = new MutationObserver(updateIsDark);
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, [mounted, resolvedTheme, theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isDark) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let stars: Star[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      initStars();
    }

    function initStars() {
      const count = Math.floor((canvas!.width * canvas!.height) / 7000);
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          r: Math.random() * 1.6 + 0.4,
          baseAlpha: Math.random() * 0.45 + 0.3,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.3 + 0.1,
          drift: (Math.random() - 0.5) * 0.08,
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

        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(245, 247, 255, ${alpha})`;
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

  if (!mounted || !isDark) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5,
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}
    />
  );
}
