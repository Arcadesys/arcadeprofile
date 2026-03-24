'use client';
import { useCosmosTime } from './CosmosContext';
import { useEffect, useState } from 'react';

/* ── colour helpers ────────────────────────────────────────────── */
function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lc(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexRgb(a);
  const [br, bg, bb] = hexRgb(b);
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}
function lo(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ── component ─────────────────────────────────────────────────── */
export default function CosmicBackground() {
  const { cosmosTime: t } = useCosmosTime();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const c = (n: string, d: string) => lc(n, d, t);
  const o = (n: number, d: number) => lo(n, d, t);

  /* ── palette ─────────────────────────────────────── */
  // sky gradient (top → bottom)
  const sky1 = c('#0a0a14', '#B87D42');
  const sky2 = c('#0a0a14', '#C89050');
  const sky3 = c('#1a1028', '#DDAA68');
  const sky4 = c('#120e22', '#E8BC78');
  const sky5 = c('#0e0a1e', '#F0C888');

  // ambient glows
  const gl1 = c('#ff8a00', '#FFB850');
  const gl2 = c('#ff3cac', '#FFA040');
  const gl3 = c('#ffaa00', '#FFCC66');
  const gl1o = o(0.15, 0.30);
  const gl2o = o(0.12, 0.25);
  const gl3o = o(0.08, 0.18);

  // eclipse strokes — day: darker amber so they read against bright sky
  const e1 = c('#ff8a00', '#7A4E00');
  const e2 = c('#ff3cac', '#7A4200');
  const e3 = c('#ff6b9d', '#6B4428');
  const e4 = c('#ffaa00', '#7A5500');

  // eclipse glow strokes
  const e1g = c('#ff8a00', '#9B6810');
  const e2g = c('#ff3cac', '#9B5510');
  const e3g = c('#ff6b9d', '#8B5838');
  const e4g = c('#ffaa00', '#9B7010');

  // eclipse stroke opacities
  const es1 = o(0.6, 0.88);
  const eg1 = o(0.15, 0.04);
  const es2 = o(0.5, 0.82);
  const eg2 = o(0.12, 0.03);
  const es3 = o(0.4, 0.78);
  const eg3 = o(0.1, 0.02);
  const es4 = o(0.35, 0.72);
  const eg4 = o(0.08, 0.02);

  // occluder & ground
  const occ = c('#0a0a14', '#18131F');
  const gnd = c('#0e0a1e', '#A87040');

  // stars
  const sO = o(1, 0); // star opacity multiplier

  // wireframe / grid
  const wc = c('#ff8a00', '#BB6E28');
  const hzAccent = c('#ff3cac', '#BB5E18');

  // corona
  const cor1 = c('#ff8a00', '#5B3810');
  const cor2 = c('#ffaa00', '#6B4818');
  const cor3 = c('#ff3cac', '#5B3010');

  // terrain chevron grays → warm earth
  const ch1 = c('#888888', '#9B8060');
  const ch1b = c('#777777', '#8B7050');
  const ch2 = c('#666666', '#7B6040');
  const ch2b = c('#777777', '#8B7050');
  const ch3 = c('#555555', '#6B5030');
  const ch3b = c('#666666', '#7B6040');
  const ch4 = c('#555555', '#5B4020');
  const ch4b = c('#4a4a4a', '#4B3018');
  const ch5 = c('#444444', '#3B2818');
  const ch5b = c('#4a4a4a', '#4B3020');
  const ch6 = c('#3a3a3a', '#2B1810');

  // ritual geometry
  const rO = o(0.12, 0.04);
  const rO2 = o(0.08, 0.03);
  const rO3 = o(0.1, 0.035);
  const lnO = o(0.08, 0.03);

  // reflection pools
  const rp1a = c('#ff8a00', '#B07020');  const rp1b = c('#ff6b20', '#905818');
  const rp2a = c('#ff3cac', '#B06830');  const rp2b = c('#c94daf', '#8B5020');
  const rp3a = c('#ff6b9d', '#A06030');  const rp3b = c('#b84a7a', '#805020');
  const rp4a = c('#ffaa00', '#C08020');  const rp4b = c('#c98820', '#9B6818');

  // reflection stroke — brighter versions for mirror
  const re1  = c('#ff8a00', '#9B6010');
  const re1g = c('#ffb347', '#B07820');
  const re2  = c('#ff3cac', '#9B5520');
  const re2g = c('#ff7ec8', '#B06830');
  const re3  = c('#ff6b9d', '#8B5028');
  const re3g = c('#ff9ec4', '#A06838');
  const re4  = c('#ffaa00', '#9B7010');
  const re4g = c('#ffd080', '#B08020');

  const horizonGlowStart = c('#ff8a00', '#CC8830');
  const horizonGlowMid   = c('#ff3cac', '#CC7020');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"
           preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          {/* radial glows */}
          <radialGradient id="cb-glow1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={gl1} stopOpacity={gl1o}/>
            <stop offset="100%" stopColor={gl1} stopOpacity={0}/>
          </radialGradient>
          <radialGradient id="cb-glow2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={gl2} stopOpacity={gl2o}/>
            <stop offset="100%" stopColor={gl2} stopOpacity={0}/>
          </radialGradient>
          <radialGradient id="cb-glow3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={gl3} stopOpacity={gl3o}/>
            <stop offset="100%" stopColor={gl3} stopOpacity={0}/>
          </radialGradient>

          {/* sky gradient */}
          <linearGradient id="cb-skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={sky1}/>
            <stop offset="60%"  stopColor={sky2}/>
            <stop offset="85%"  stopColor={sky3}/>
            <stop offset="95%"  stopColor={sky4}/>
            <stop offset="100%" stopColor={sky5}/>
          </linearGradient>

          {/* horizon glow */}
          <linearGradient id="cb-horizonGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={horizonGlowStart} stopOpacity={o(0.06, 0.15)}/>
            <stop offset="50%"  stopColor={horizonGlowMid}   stopOpacity={o(0.04, 0.10)}/>
            <stop offset="100%" stopColor={sky1}              stopOpacity={0}/>
          </linearGradient>

          {/* filters */}
          <filter id="cb-corona"><feGaussianBlur in="SourceGraphic" stdDeviation="3"/></filter>
          <filter id="cb-softglow"><feGaussianBlur in="SourceGraphic" stdDeviation="8"/></filter>
          <filter id="cb-starglow"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5"/></filter>

          {/* water reflection filter */}
          <filter id="cb-reflectWater" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.065" numOctaves={2} seed={91} result="ripple"/>
            <feDisplacementMap in="SourceGraphic" in2="ripple" scale={6} xChannelSelector="R" yChannelSelector="G" result="warped"/>
            <feGaussianBlur in="warped" stdDeviation={0.85} result="smooth"/>
          </filter>

          <clipPath id="cb-waterClip"><rect x="0" y="750" width="1920" height="330"/></clipPath>

          <linearGradient id="cb-reflFade" x1="0" y1="750" x2="0" y2="1080" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#fff" stopOpacity={1}/>
            <stop offset="35%"  stopColor="#fff" stopOpacity={0.88}/>
            <stop offset="100%" stopColor="#fff" stopOpacity={0.62}/>
          </linearGradient>
          <mask id="cb-reflMask"><rect x="0" y="750" width="1920" height="330" fill="url(#cb-reflFade)"/></mask>

          {/* reflection pool gradients */}
          <radialGradient id="cb-rp1" cx="50%" cy="45%" r="55%">
            <stop offset="0%"   stopColor={rp1a} stopOpacity={o(0.22, 0.30)}/>
            <stop offset="55%"  stopColor={rp1b} stopOpacity={o(0.08, 0.14)}/>
            <stop offset="100%" stopColor={gnd}   stopOpacity={0}/>
          </radialGradient>
          <radialGradient id="cb-rp2" cx="52%" cy="48%" r="55%">
            <stop offset="0%"   stopColor={rp2a} stopOpacity={o(0.20, 0.28)}/>
            <stop offset="55%"  stopColor={rp2b} stopOpacity={o(0.07, 0.12)}/>
            <stop offset="100%" stopColor={gnd}   stopOpacity={0}/>
          </radialGradient>
          <radialGradient id="cb-rp3" cx="52%" cy="48%" r="55%">
            <stop offset="0%"   stopColor={rp3a} stopOpacity={o(0.18, 0.26)}/>
            <stop offset="60%"  stopColor={rp3b} stopOpacity={o(0.06, 0.10)}/>
            <stop offset="100%" stopColor={gnd}   stopOpacity={0}/>
          </radialGradient>
          <radialGradient id="cb-rp4" cx="50%" cy="48%" r="58%">
            <stop offset="0%"   stopColor={rp4a} stopOpacity={o(0.16, 0.24)}/>
            <stop offset="65%"  stopColor={rp4b} stopOpacity={o(0.06, 0.10)}/>
            <stop offset="100%" stopColor={gnd}   stopOpacity={0}/>
          </radialGradient>
        </defs>

        {/* ═══ SKY ═══ */}
        <rect width="1920" height="1080" fill="url(#cb-skyGrad)"/>

        {/* ═══ AMBIENT GLOWS ═══ */}
        <ellipse cx={380} cy={400} rx={500} ry={400} fill="url(#cb-glow1)"/>
        <ellipse cx={1500} cy={250} rx={600} ry={450} fill="url(#cb-glow2)"/>
        <ellipse cx={960} cy={800} rx={700} ry={350} fill="url(#cb-glow3)"/>

        {/* ═══ STARFIELD ═══ */}
        <g opacity={sO}>
          {/* bright */}
          <circle cx={120} cy={45}  r={1.2} fill="#e8e8ec" opacity={0.5}/>
          <circle cx={285} cy={92}  r={1.4} fill="#e8e8ec" opacity={0.45}/>
          <circle cx={430} cy={30}  r={1}   fill="#e8e8ec" opacity={0.4}/>
          <circle cx={580} cy={115} r={1.3} fill="#e8e8ec" opacity={0.35}/>
          <circle cx={710} cy={55}  r={1.5} fill="#ffe8cc" opacity={0.5}/>
          <circle cx={870} cy={40}  r={1.1} fill="#e8e8ec" opacity={0.4}/>
          <circle cx={1020} cy={88}  r={1.3} fill="#e8e8ec" opacity={0.45}/>
          <circle cx={1180} cy={35}  r={1}   fill="#ffe8cc" opacity={0.38}/>
          <circle cx={1350} cy={72}  r={1.4} fill="#e8e8ec" opacity={0.42}/>
          <circle cx={1520} cy={50}  r={1.2} fill="#e8e8ec" opacity={0.5}/>
          <circle cx={1680} cy={95}  r={1.1} fill="#e8e8ec" opacity={0.35}/>
          <circle cx={1830} cy={38}  r={1.3} fill="#ffe8cc" opacity={0.4}/>
          {/* mid-field */}
          <circle cx={65}   cy={180} r={0.9} fill="#e8e8ec" opacity={0.3}/>
          <circle cx={190}  cy={250} r={0.7} fill="#e8e8ec" opacity={0.25}/>
          <circle cx={340}  cy={195} r={1}   fill="#e8e8ec" opacity={0.28}/>
          <circle cx={480}  cy={310} r={0.8} fill="#e8e8ec" opacity={0.22}/>
          <circle cx={620}  cy={230} r={0.9} fill="#ffe8cc" opacity={0.3}/>
          <circle cx={760}  cy={175} r={0.7} fill="#e8e8ec" opacity={0.2}/>
          <circle cx={910}  cy={290} r={0.8} fill="#e8e8ec" opacity={0.25}/>
          <circle cx={1060} cy={210} r={1}   fill="#e8e8ec" opacity={0.3}/>
          <circle cx={1200} cy={315} r={0.7} fill="#e8e8ec" opacity={0.22}/>
          <circle cx={1390} cy={195} r={0.9} fill="#ffe8cc" opacity={0.28}/>
          <circle cx={1550} cy={280} r={0.8} fill="#e8e8ec" opacity={0.2}/>
          <circle cx={1720} cy={230} r={0.7} fill="#e8e8ec" opacity={0.25}/>
          <circle cx={1870} cy={175} r={0.9} fill="#e8e8ec" opacity={0.3}/>
          {/* dim scattered */}
          <circle cx={150}  cy={380} r={0.6} fill="#e8e8ec" opacity={0.18}/>
          <circle cx={310}  cy={520} r={0.5} fill="#e8e8ec" opacity={0.15}/>
          <circle cx={530}  cy={430} r={0.7} fill="#e8e8ec" opacity={0.16}/>
          <circle cx={670}  cy={380} r={0.5} fill="#e8e8ec" opacity={0.14}/>
          <circle cx={820}  cy={500} r={0.6} fill="#e8e8ec" opacity={0.18}/>
          <circle cx={1000} cy={420} r={0.5} fill="#e8e8ec" opacity={0.15}/>
          <circle cx={1150} cy={550} r={0.7} fill="#e8e8ec" opacity={0.14}/>
          <circle cx={1300} cy={480} r={0.5} fill="#e8e8ec" opacity={0.16}/>
          <circle cx={1460} cy={400} r={0.6} fill="#e8e8ec" opacity={0.18}/>
          <circle cx={1630} cy={520} r={0.5} fill="#e8e8ec" opacity={0.12}/>
          <circle cx={1780} cy={440} r={0.6} fill="#e8e8ec" opacity={0.15}/>
          <circle cx={50}   cy={580} r={0.5} fill="#e8e8ec" opacity={0.12}/>
          <circle cx={1900} cy={350} r={0.5} fill="#e8e8ec" opacity={0.13}/>
          {/* accent stars with glow */}
          <circle cx={710}  cy={55} r={3}   fill="#ffe8cc" opacity={0.08} filter="url(#cb-starglow)"/>
          <circle cx={285}  cy={92} r={2.5} fill="#e8e8ec" opacity={0.06} filter="url(#cb-starglow)"/>
          <circle cx={1520} cy={50} r={3}   fill="#e8e8ec" opacity={0.07} filter="url(#cb-starglow)"/>
        </g>

        {/* ═══ ECLIPSES ═══ */}

        {/* Primary — large, upper right */}
        <circle cx={1340} cy={280} r={120} fill="none" stroke={e1} strokeWidth={1.5} opacity={es1}/>
        <circle cx={1340} cy={280} r={120} fill="none" stroke={e1g} strokeWidth={4} opacity={eg1} filter="url(#cb-softglow)"/>
        <circle cx={1365} cy={265} r={105} fill={occ}/>
        <path d="M 1225 250 Q 1200 280 1220 310" fill="none" stroke={cor1} strokeWidth={0.8} opacity={o(0.4, 0.55)}/>
        <path d="M 1240 200 Q 1220 230 1235 260" fill="none" stroke={cor2} strokeWidth={0.6} opacity={o(0.3, 0.45)}/>

        {/* Secondary — medium, left */}
        <circle cx={350} cy={450} r={80} fill="none" stroke={e2} strokeWidth={1.2} opacity={es2}/>
        <circle cx={350} cy={450} r={80} fill="none" stroke={e2g} strokeWidth={3} opacity={eg2} filter="url(#cb-softglow)"/>
        <circle cx={370} cy={438} r={70} fill={occ}/>
        <path d="M 275 430 Q 260 450 270 475" fill="none" stroke={cor3} strokeWidth={0.6} opacity={o(0.35, 0.50)}/>

        {/* Tertiary — small, lower center */}
        <circle cx={880} cy={620} r={50} fill="none" stroke={e3} strokeWidth={1} opacity={es3}/>
        <circle cx={880} cy={620} r={50} fill="none" stroke={e3g} strokeWidth={2.5} opacity={eg3} filter="url(#cb-softglow)"/>
        <circle cx={893} cy={612} r={43} fill={occ}/>

        {/* Fourth — tiny accent */}
        <circle cx={1600} cy={550} r={30} fill="none" stroke={e4} strokeWidth={0.8} opacity={es4}/>
        <circle cx={1600} cy={550} r={30} fill="none" stroke={e4g} strokeWidth={2} opacity={eg4} filter="url(#cb-softglow)"/>
        <circle cx={1610} cy={544} r={26} fill={occ}/>

        {/* ═══ RITUAL GEOMETRY ═══ */}
        <circle cx={960} cy={440} r={400} fill="none" stroke={e1} strokeWidth={0.3} opacity={rO}/>
        <circle cx={960} cy={440} r={500} fill="none" stroke={e2} strokeWidth={0.25} opacity={rO2}/>
        <circle cx={960} cy={440} r={320} fill="none" stroke={e4} strokeWidth={0.2} opacity={rO3}/>
        <line x1={350}  y1={450} x2={880}  y2={620} stroke={e2}  strokeWidth={0.3} opacity={lnO}/>
        <line x1={880}  y1={620} x2={1340} y2={280} stroke={e1}  strokeWidth={0.3} opacity={lnO}/>
        <line x1={1340} y1={280} x2={350}  y2={450} stroke={e3}  strokeWidth={0.3} opacity={lnO}/>
        <line x1={1600} y1={550} x2={880}  y2={620} stroke={e4}  strokeWidth={0.2} opacity={o(0.06, 0.025)}/>

        {/* ═══ WIREFRAME GRID ═══ */}
        <g stroke={wc}>
          <line x1={960} y1={750} x2={0}    y2={1080} strokeWidth={0.3} opacity={o(0.06, 0.08)}/>
          <line x1={960} y1={750} x2={192}  y2={1080} strokeWidth={0.3} opacity={o(0.05, 0.07)}/>
          <line x1={960} y1={750} x2={384}  y2={1080} strokeWidth={0.3} opacity={o(0.06, 0.08)}/>
          <line x1={960} y1={750} x2={576}  y2={1080} strokeWidth={0.3} opacity={o(0.05, 0.07)}/>
          <line x1={960} y1={750} x2={768}  y2={1080} strokeWidth={0.3} opacity={o(0.06, 0.08)}/>
          <line x1={960} y1={750} x2={960}  y2={1080} strokeWidth={0.35} opacity={o(0.07, 0.09)}/>
          <line x1={960} y1={750} x2={1152} y2={1080} strokeWidth={0.3} opacity={o(0.06, 0.08)}/>
          <line x1={960} y1={750} x2={1344} y2={1080} strokeWidth={0.3} opacity={o(0.05, 0.07)}/>
          <line x1={960} y1={750} x2={1536} y2={1080} strokeWidth={0.3} opacity={o(0.06, 0.08)}/>
          <line x1={960} y1={750} x2={1728} y2={1080} strokeWidth={0.3} opacity={o(0.05, 0.07)}/>
          <line x1={960} y1={750} x2={1920} y2={1080} strokeWidth={0.3} opacity={o(0.06, 0.08)}/>
          {/* horizontal */}
          <line x1={0} y1={780}  x2={1920} y2={780}  strokeWidth={0.2}  opacity={o(0.04, 0.06)}/>
          <line x1={0} y1={815}  x2={1920} y2={815}  strokeWidth={0.2}  opacity={o(0.05, 0.07)}/>
          <line x1={0} y1={855}  x2={1920} y2={855}  strokeWidth={0.25} opacity={o(0.05, 0.07)}/>
          <line x1={0} y1={900}  x2={1920} y2={900}  strokeWidth={0.25} opacity={o(0.06, 0.08)}/>
          <line x1={0} y1={950}  x2={1920} y2={950}  strokeWidth={0.3}  opacity={o(0.06, 0.08)}/>
          <line x1={0} y1={1010} x2={1920} y2={1010} strokeWidth={0.3}  opacity={o(0.07, 0.09)}/>
        </g>

        {/* ═══ HORIZON ═══ */}
        <line x1={0} y1={750} x2={1920} y2={750} stroke={wc} strokeWidth={1.5} opacity={o(0.08, 0.15)} filter="url(#cb-softglow)"/>
        <line x1={0} y1={750} x2={1920} y2={750} stroke={wc} strokeWidth={0.5} opacity={o(0.15, 0.25)}/>
        <rect x={0} y={750} width={1920} height={330} fill={gnd}/>
        <line x1={0} y1={750} x2={1920} y2={750} stroke={hzAccent} strokeWidth={0.5} opacity={o(0.2, 0.3)}/>

        {/* ═══ TERRAIN CHEVRONS ═══ */}
        {/* Row 1 */}
        <g opacity={o(0.08, 0.12)}>
          <polyline points="60,762 120,756 180,762"   fill="none" stroke={ch1}  strokeWidth={0.6}/>
          <polyline points="220,764 300,757 380,764"   fill="none" stroke={ch1}  strokeWidth={0.6}/>
          <polyline points="440,761 510,755 580,761"   fill="none" stroke={ch1b} strokeWidth={0.5}/>
          <polyline points="650,763 740,756 830,763"   fill="none" stroke={ch1}  strokeWidth={0.6}/>
          <polyline points="900,762 970,756 1040,762"  fill="none" stroke={ch1b} strokeWidth={0.5}/>
          <polyline points="1110,764 1200,757 1290,764" fill="none" stroke={ch1}  strokeWidth={0.6}/>
          <polyline points="1350,761 1430,755 1510,761" fill="none" stroke={ch1b} strokeWidth={0.5}/>
          <polyline points="1580,763 1660,757 1740,763" fill="none" stroke={ch1}  strokeWidth={0.6}/>
          <polyline points="1800,762 1860,756 1920,762" fill="none" stroke={ch1b} strokeWidth={0.5}/>
        </g>
        {/* Row 2 */}
        <g opacity={o(0.07, 0.10)}>
          <polyline points="0,785 100,774 200,785"     fill="none" stroke={ch2}  strokeWidth={0.7}/>
          <polyline points="180,788 310,776 440,788"   fill="none" stroke={ch2b} strokeWidth={0.6}/>
          <polyline points="500,784 620,773 740,784"   fill="none" stroke={ch2}  strokeWidth={0.7}/>
          <polyline points="780,787 920,775 1060,787"  fill="none" stroke={ch2b} strokeWidth={0.6}/>
          <polyline points="1100,785 1230,774 1360,785" fill="none" stroke={ch2}  strokeWidth={0.7}/>
          <polyline points="1400,787 1540,775 1680,787" fill="none" stroke={ch2b} strokeWidth={0.6}/>
          <polyline points="1720,784 1820,774 1920,784" fill="none" stroke={ch2}  strokeWidth={0.7}/>
        </g>
        {/* Row 3 */}
        <g opacity={o(0.06, 0.09)}>
          <polyline points="40,820 200,804 360,820"     fill="none" stroke={ch3}  strokeWidth={0.8}/>
          <polyline points="320,824 520,806 720,824"    fill="none" stroke={ch3b} strokeWidth={0.7}/>
          <polyline points="680,818 880,802 1080,818"   fill="none" stroke={ch3}  strokeWidth={0.8}/>
          <polyline points="1040,822 1240,806 1440,822" fill="none" stroke={ch3b} strokeWidth={0.7}/>
          <polyline points="1400,820 1600,804 1800,820" fill="none" stroke={ch3}  strokeWidth={0.8}/>
        </g>
        {/* Row 4 */}
        <g opacity={o(0.05, 0.08)}>
          <polyline points="0,860 240,838 480,860"       fill="none" stroke={ch4}  strokeWidth={0.9}/>
          <polyline points="400,865 700,840 1000,865"    fill="none" stroke={ch4b} strokeWidth={0.8}/>
          <polyline points="900,858 1200,836 1500,858"   fill="none" stroke={ch4}  strokeWidth={0.9}/>
          <polyline points="1420,862 1670,840 1920,862"  fill="none" stroke={ch4b} strokeWidth={0.8}/>
        </g>
        {/* Row 5 */}
        <g opacity={o(0.04, 0.06)}>
          <polyline points="0,910 380,880 760,910"       fill="none" stroke={ch5}  strokeWidth={1}/>
          <polyline points="600,915 960,882 1320,915"    fill="none" stroke={ch5b} strokeWidth={0.9}/>
          <polyline points="1200,908 1560,878 1920,908"  fill="none" stroke={ch5}  strokeWidth={1}/>
        </g>
        {/* Row 6 */}
        <g opacity={o(0.03, 0.05)}>
          <polyline points="0,970 480,930 960,970"       fill="none" stroke={ch6} strokeWidth={1.2}/>
          <polyline points="960,975 1440,932 1920,975"   fill="none" stroke={ch6} strokeWidth={1.2}/>
        </g>

        {/* ═══ WATER REFLECTIONS ═══ */}
        <g clipPath="url(#cb-waterClip)" mask="url(#cb-reflMask)" opacity={0.92} filter="url(#cb-reflectWater)">
          <g transform="translate(0,1500) scale(1,-1)">
            {/* secondary */}
            <circle cx={350}  cy={450} r={78} fill="url(#cb-rp2)"/>
            <circle cx={350}  cy={450} r={80} fill="none" stroke={re2}  strokeWidth={1.8} opacity={0.82}/>
            <circle cx={350}  cy={450} r={80} fill="none" stroke={re2g} strokeWidth={4}   opacity={0.22}/>
            <circle cx={370}  cy={438} r={70} fill={gnd} opacity={0.9}/>
            <path d="M 275 430 Q 260 450 270 475" fill="none" stroke={re2} strokeWidth={0.85} opacity={0.55}/>
            {/* tertiary */}
            <circle cx={880}  cy={620} r={48} fill="url(#cb-rp3)"/>
            <circle cx={880}  cy={620} r={50} fill="none" stroke={re3}  strokeWidth={1.5} opacity={0.78}/>
            <circle cx={880}  cy={620} r={50} fill="none" stroke={re3g} strokeWidth={3.2} opacity={0.2}/>
            <circle cx={893}  cy={612} r={43} fill={gnd} opacity={0.88}/>
            {/* fourth */}
            <circle cx={1600} cy={550} r={28} fill="url(#cb-rp4)"/>
            <circle cx={1600} cy={550} r={30} fill="none" stroke={re4}  strokeWidth={1.35} opacity={0.8}/>
            <circle cx={1600} cy={550} r={30} fill="none" stroke={re4g} strokeWidth={2.8}  opacity={0.22}/>
            <circle cx={1610} cy={544} r={26} fill={gnd} opacity={0.88}/>
          </g>
          {/* primary (large): shifted up into water strip */}
          <g transform="translate(0,-294)">
            <g transform="translate(0,1500) scale(1,-1)">
              <circle cx={1340} cy={280} r={118} fill="url(#cb-rp1)"/>
              <circle cx={1340} cy={280} r={120} fill="none" stroke={re1}  strokeWidth={2.2} opacity={0.88}/>
              <circle cx={1340} cy={280} r={120} fill="none" stroke={re1g} strokeWidth={5}   opacity={0.28}/>
              <circle cx={1365} cy={265} r={105} fill={gnd} opacity={0.92}/>
              <path d="M 1225 250 Q 1200 280 1220 310" fill="none" stroke={re1}  strokeWidth={1.1} opacity={0.62}/>
              <path d="M 1240 200 Q 1220 230 1235 260" fill="none" stroke={re4}  strokeWidth={0.85} opacity={0.48}/>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
