'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import { CosmosProvider } from './CosmosContext';
import CosmicBackground from './CosmicBackground';

function cn(base: string, active: boolean) {
  return active ? `${base} active` : base;
}

export default function ThemeBg() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rainRef = useRef<HTMLDivElement>(null);
  const starsRunning = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Build rain streaks once
  useEffect(() => {
    const container = rainRef.current;
    if (!container || container.childElementCount > 0) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 120; i++) {
      const s = document.createElement('div');
      s.className = 'streak';
      s.style.left = (Math.random() * 110) + '%';
      s.style.animationDuration = (1.2 + Math.random() * 2.2).toFixed(2) + 's';
      s.style.animationDelay = (-Math.random() * 3).toFixed(2) + 's';
      s.style.opacity = (0.25 + Math.random() * 0.5).toFixed(2);
      s.style.height = (10 + Math.random() * 14) + '%';
      frag.appendChild(s);
    }
    container.appendChild(frag);
  }, []);

  // Stars canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    type Star = { x: number; y: number; r: number; tw: number; sp: number; hue: string };
    let stars: Star[] = [];

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx?.scale(dpr, dpr);
    }

    function build() {
      stars = [];
      for (let i = 0; i < 220; i++) {
        stars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: Math.random() * 1.4 + 0.2,
          tw: Math.random() * Math.PI * 2,
          sp: 0.005 + Math.random() * 0.02,
          hue: Math.random() < 0.7 ? '255, 220, 200'
            : Math.random() < 0.5 ? '255, 138, 0'
            : '255, 60, 172',
        });
      }
    }

    function tick() {
      if (!starsRunning.current || !ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.tw += s.sp;
        const a = 0.4 + Math.abs(Math.sin(s.tw)) * 0.6;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${s.hue},${a.toFixed(3)})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    function startStars() {
      if (starsRunning.current) return;
      resize();
      build();
      starsRunning.current = true;
      tick();
    }

    function stopStars() {
      starsRunning.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }

    function onResize() {
      if (starsRunning.current) { resize(); build(); }
    }

    window.addEventListener('resize', onResize);

    if (theme === 'stars') startStars();
    else stopStars();

    return () => {
      window.removeEventListener('resize', onResize);
      stopStars();
    };
  }, [theme]);

  return (
    <div className="theme-bg" id="theme-bg" aria-hidden="true">
      <div className={cn('theme neon', theme === 'neon')} data-theme="neon" />

      <div className={cn('theme eclipse', theme === 'eclipse')} data-theme="eclipse">
        <div className="ground" />
        <div className="sun" />
        <div className="moon" />
      </div>

      <div className={cn('theme crt', theme === 'crt')} data-theme="crt" />

      <div className={cn('theme rain', theme === 'rain')} data-theme="rain" ref={rainRef} />

      <div className={cn('theme stars', theme === 'stars')} data-theme="stars">
        <div className="nebula" />
        <canvas ref={canvasRef} id="stars-canvas" />
      </div>

      <div className={cn('theme dawn', theme === 'dawn')} data-theme="dawn">
        <div className="sun" />
        <div className="grid" />
      </div>

      {/* Cosmos — mounts only when active; CosmicBackground uses position:fixed so
          it can't be faded via parent opacity. Unmounting is the clean swap. */}
      {theme === 'cosmos' && (
        <CosmosProvider>
          <CosmicBackground />
        </CosmosProvider>
      )}
    </div>
  );
}
