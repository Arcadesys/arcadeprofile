"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { centroid, type Centroid, type NewsPoint, type SongPoint } from "@/data/toys/cultural-weather-vane";
import styles from "./CulturalWeatherVane.module.css";

export type FieldMode = "field" | "drift";
type Kind = "music" | "news";
type AnyPoint = SongPoint | NewsPoint;

const ACCENT = ["#e7e5fe", "#d2cefd", "#b5abfc", "#968ae0"];
const NEUTRAL = ["#e4e7f5", "#cfd3e5", "#b2b6ca", "#9397ab"];

const X_SPAN = 4.6;
const Y_SPAN = 3.2;
const PLANE_GAP = 6;

function rampStep(valence: number) {
  return valence >= 0.3 ? 0 : valence >= 0 ? 1 : valence >= -0.4 ? 2 : 3;
}

function pointColor(kind: Kind, valence: number) {
  return (kind === "music" ? ACCENT : NEUTRAL)[rampStep(valence)];
}

export function mediaUrl(point: AnyPoint, kind: Kind) {
  const params = new URLSearchParams({ kind, title: point.title });
  if ("artist" in point) params.set("artist", point.artist);
  if (point.mediaQuery) params.set("query", point.mediaQuery);
  if (point.wikipediaTitle) params.set("page-title", point.wikipediaTitle);
  return `/api/cultural-weather/media?${params.toString()}`;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function haloTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.45, "rgba(255,255,255,0.14)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** A prominence-weighted glow marking one field's centre of gravity. */
function ClusterHalo({ at, kind, z = 0 }: { at: Centroid; kind: Kind; z?: number }) {
  const texture = useMemo(() => haloTexture(), []);
  return (
    <mesh position={[at.activation * X_SPAN, at.valence * Y_SPAN, z - 0.4]}>
      <planeGeometry args={[5.4, 4.6]} />
      <meshBasicMaterial
        map={texture}
        color={kind === "music" ? "#968ae0" : "#75798c"}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** Dashed line between the two centroids — the year's divergence, drawn. */
function DivergenceLink({ music, news, z = 0 }: { music: Centroid; news: Centroid; z?: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(music.activation * X_SPAN, music.valence * Y_SPAN, z),
      new THREE.Vector3(news.activation * X_SPAN, news.valence * Y_SPAN, z)
    ]);
    return g;
  }, [music, news, z]);
  const material = useMemo(
    () => new THREE.LineDashedMaterial({ color: "#5d5294", dashSize: 0.22, gapSize: 0.16, transparent: true, opacity: 0.9 }),
    []
  );
  const ref = useRef<THREE.Line>(null);
  useFrame(() => {
    if (ref.current) ref.current.computeLineDistances();
  });
  return <primitive object={new THREE.Line(geometry, material)} ref={ref} />;
}

function FloatingPoint({
  point,
  kind,
  z,
  selected,
  interactive,
  reducedMotion,
  onSelect,
  onHover
}: {
  point: AnyPoint;
  kind: Kind;
  z: number;
  selected: boolean;
  interactive: boolean;
  reducedMotion: boolean;
  onSelect: (point: AnyPoint, kind: Kind) => void;
  onHover: (point: AnyPoint | null, kind: Kind) => void;
}) {
  const { size: viewportSize } = useThree();
  const ref = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const base = useMemo(
    () => new THREE.Vector3(point.activation * X_SPAN, point.valence * Y_SPAN, z + (kind === "music" ? 0.3 : -0.3)),
    [point, kind, z]
  );
  const mobileScale = viewportSize.width < 600 ? 1.45 : 1;
  const size = (0.42 + point.prominence * 0.18) * mobileScale;
  const color = pointColor(kind, point.valence);

  useEffect(() => {
    let active = true;
    const loader = new THREE.TextureLoader();
    loader.load(mediaUrl(point, kind), (loaded) => {
      if (!active) {
        loaded.dispose();
        return;
      }
      loaded.colorSpace = THREE.SRGBColorSpace;
      const image = loaded.image as { width?: number; height?: number };
      const imageAspect = (image.width ?? 1) / (image.height ?? 1);
      const targetAspect = kind === "music" ? 1 : 1.42;
      loaded.center.set(0.5, 0.5);
      if (imageAspect > targetAspect) {
        loaded.repeat.x = targetAspect / imageAspect;
      } else {
        loaded.repeat.y = imageAspect / targetAspect;
      }
      setTexture(loaded);
    });
    return () => {
      active = false;
    };
  }, [point, kind]);

  useEffect(() => () => { texture?.dispose(); }, [texture]);

  useFrame(({ clock }) => {
    if (!ref.current || !interactive || reducedMotion) return;
    const t = clock.getElapsedTime();
    ref.current.position.x = base.x + Math.sin(t * (0.45 + point.prominence * 0.3) + point.activation * 4) * 0.06;
    ref.current.position.y = base.y + Math.cos(t * 0.5 + point.valence * 4) * 0.05;
  });

  const common = {
    onClick: interactive
      ? (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          onSelect(point, kind);
        }
      : undefined,
    onPointerOver: interactive
      ? (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          onHover(point, kind);
        }
      : undefined,
    onPointerOut: interactive ? () => onHover(null, kind) : undefined
  };

  const width = kind === "music" ? size : size * 1.42;
  const height = size;
  const frame = selected ? 0.075 : 0.04;

  return (
    <group ref={ref} position={base} scale={selected ? 1.14 : 1} {...common}>
      <mesh position={[0, 0, -0.015]}>
        <planeGeometry args={[width + frame * 2, height + frame * 2]} />
        <meshBasicMaterial color={selected ? "#ffffff" : color} transparent opacity={interactive ? 1 : 0.66} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width, height]} />
        {texture ? (
          <meshBasicMaterial key="image" map={texture} transparent opacity={interactive ? 1 : 0.58} toneMapped={false} />
        ) : (
          <meshBasicMaterial key="loading" color={color} transparent opacity={interactive ? 0.78 : 0.46} />
        )}
      </mesh>
    </group>
  );
}

function HoverLabel({ hovered }: { hovered: { point: AnyPoint; kind: Kind } }) {
  const { point, kind } = hovered;
  const sub = "artist" in point ? point.artist : point.tags.slice(0, 2).join(" · ");
  return (
    <Billboard position={[point.activation * X_SPAN, point.valence * Y_SPAN + 0.42, 0.9]} follow>
      <Text fontSize={0.2} color="#e9e9ed" anchorX="center" anchorY="bottom" maxWidth={5}>
        {point.title}
      </Text>
      <Text fontSize={0.15} color={kind === "music" ? "#b5abfc" : "#9397ab"} anchorX="center" anchorY="top" position={[0, -0.06, 0]}>
        {sub}
      </Text>
    </Billboard>
  );
}

function AxisLabels() {
  const labels: Array<[string, [number, number, number], number]> = [
    ["STILL / SUBDUED", [-5.3, 0, 0], Math.PI / 2],
    ["KINETIC / EXUBERANT", [5.3, 0, 0], -Math.PI / 2],
    ["BRIGHT / BUOYANT", [0, 3.95, 0], 0],
    ["DARK / HEAVY", [0, -3.95, 0], 0]
  ];
  return (
    <>
      {labels.map(([label, position, rotation]) => (
        <Billboard key={label} position={position} follow>
          <Text fontSize={0.24} color="#75798c" anchorX="center" anchorY="middle" rotation={[0, 0, rotation]}>
            {label}
          </Text>
        </Billboard>
      ))}
    </>
  );
}

function Axes({ z = 0, opacity = 0.55 }: { z?: number; opacity?: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([-4.8, 0, 0, 4.8, 0, 0, 0, -3.3, 0, 0, 3.3, 0]), 3)
    );
    return g;
  }, []);
  return (
    <lineSegments geometry={geometry} position={[0, 0, z]}>
      <lineBasicMaterial color="#595d6c" transparent opacity={opacity} />
    </lineSegments>
  );
}

/** Eases the camera to the active year's plane so years read as depth. */
function ResponsiveCamera({ targetZ, mode, reducedMotion }: { targetZ: number; mode: FieldMode; reducedMotion: boolean }) {
  const { camera, size } = useThree();
  useFrame((_, delta) => {
    const mobile = size.width < 600;
    const baseZ = mobile ? 16 : 10;
    const nextZ = mode === "drift" ? baseZ + targetZ : baseZ;
    const nextX = mode === "drift" && !mobile ? 2.6 : 0;
    if (reducedMotion) {
      // eslint-disable-next-line react-hooks/immutability
      camera.position.z = nextZ;
      camera.position.x = nextX;
      return;
    }
    // R3F exposes the live camera as a mutable Three.js object for animation.
    camera.position.z += (nextZ - camera.position.z) * Math.min(1, delta * 2.4);
    camera.position.x += (nextX - camera.position.x) * Math.min(1, delta * 2.4);
  });
  return null;
}

export default function WeatherField({
  songs,
  news,
  allSongs,
  allNews,
  years,
  year,
  mode,
  selectedId,
  onSelect
}: {
  songs: SongPoint[];
  news: NewsPoint[];
  allSongs: SongPoint[];
  allNews: NewsPoint[];
  years: number[];
  year: number;
  mode: FieldMode;
  selectedId: string | null;
  onSelect: (point: AnyPoint, kind: Kind) => void;
}) {
  const [hovered, setHovered] = useState<{ point: AnyPoint; kind: Kind } | null>(null);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const reducedMotion = useReducedMotion();
  const musicCentre = useMemo(() => centroid(songs), [songs]);
  const newsCentre = useMemo(() => centroid(news), [news]);
  const activeIndex = years.indexOf(year);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setWebglAvailable(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  return (
    <div className={styles.fieldShell}>
      {webglAvailable === false ? (
        <div className={styles.canvasFallback}>The interactive field is unavailable. Use the plotted media list below.</div>
      ) : webglAvailable === null ? (
        <div className={styles.canvasFallback} role="status">Preparing the visual field…</div>
      ) : <Canvas camera={{ position: [0, 0.6, 10], fov: 44 }} fallback={<div className={styles.canvasFallback}>The interactive field is unavailable. Use the plotted media list below.</div>}>
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 0, 6]} intensity={18} />
        <ResponsiveCamera targetZ={-activeIndex * PLANE_GAP} mode={mode} reducedMotion={reducedMotion} />

        {mode === "field" ? (
          <>
            <Axes />
            <AxisLabels />
            <ClusterHalo at={musicCentre} kind="music" />
            <ClusterHalo at={newsCentre} kind="news" />
            <DivergenceLink music={musicCentre} news={newsCentre} />
            {songs.map((point) => (
              <FloatingPoint
                key={point.id}
                point={point}
                kind="music"
                z={0}
                interactive={!reducedMotion}
                reducedMotion={reducedMotion}
                selected={point.id === selectedId}
                onSelect={onSelect}
                onHover={(p, k) => setHovered(p ? { point: p, kind: k } : null)}
              />
            ))}
            {news.map((point) => (
              <FloatingPoint
                key={point.id}
                point={point}
                kind="news"
                z={0}
                interactive={!reducedMotion}
                reducedMotion={reducedMotion}
                selected={point.id === selectedId}
                onSelect={onSelect}
                onHover={(p, k) => setHovered(p ? { point: p, kind: k } : null)}
              />
            ))}
            {hovered && <HoverLabel hovered={hovered} />}
          </>
        ) : (
          <>
            {years.map((y, i) => {
              const z = -i * PLANE_GAP;
              const active = y === year;
              const ySongs = allSongs.filter((s) => s.year === y);
              const yNews = allNews.filter((n) => n.year === y);
              return (
                <group key={y} position={[0, 0, 0]}>
                  <Axes z={z} opacity={active ? 0.55 : 0.18} />
                  <Billboard position={[-4.9, 3.1, z]} follow>
                    <Text fontSize={0.5} color={active ? "#d2cefd" : "#4a4e5e"} anchorX="left" anchorY="middle">
                      {String(y)}
                    </Text>
                  </Billboard>
                  {active && <ClusterHalo at={centroid(ySongs)} kind="music" z={z} />}
                  {active && <ClusterHalo at={centroid(yNews)} kind="news" z={z} />}
                  {ySongs.map((point) => (
                    <FloatingPoint
                      key={point.id}
                      point={point}
                      kind="music"
                      z={z}
                      interactive={active && !reducedMotion}
                      reducedMotion={reducedMotion}
                      selected={point.id === selectedId}
                      onSelect={onSelect}
                      onHover={(p, k) => setHovered(p ? { point: p, kind: k } : null)}
                    />
                  ))}
                  {yNews.map((point) => (
                    <FloatingPoint
                      key={point.id}
                      point={point}
                      kind="news"
                      z={z}
                      interactive={active && !reducedMotion}
                      reducedMotion={reducedMotion}
                      selected={point.id === selectedId}
                      onSelect={onSelect}
                      onHover={(p, k) => setHovered(p ? { point: p, kind: k } : null)}
                    />
                  ))}
                </group>
              );
            })}
          </>
        )}
      </Canvas>}

      {webglAvailable !== false && (
        <div className={`${styles.domPointLayer} ${mode === "drift" ? styles.domPointLayerDrift : ""}`} aria-hidden="true">
          {[...songs.map((point) => ({ point, kind: "music" as const })), ...news.map((point) => ({ point, kind: "news" as const }))].map(({ point, kind }) => {
            const size = 54 + point.prominence * 42;
            return (
              <button
                type="button"
                tabIndex={-1}
                key={point.id}
                className={`${styles.domPoint} ${kind === "music" ? styles.domMusic : styles.domNews} ${point.id === selectedId ? styles.domSelected : ""}`}
                style={{
                  left: `${50 + point.activation * 42}%`,
                  top: `${50 - point.valence * 40}%`,
                  width: `${kind === "music" ? size : size * 1.42}px`,
                  height: `${size}px`,
                }}
                onClick={() => onSelect(point, kind)}
                title={point.title}
              >
                <img src={mediaUrl(point, kind)} alt="" />
              </button>
            );
          })}
        </div>
      )}

      <div className={`${styles.axisCorner} ${styles.topLeft}`}>hopeful<br />reflective</div>
      <div className={`${styles.axisCorner} ${styles.topRight}`}>euphoric<br />celebratory</div>
      <div className={`${styles.axisCorner} ${styles.bottomLeft}`}>mournful<br />withdrawn</div>
      <div className={`${styles.axisCorner} ${styles.bottomRight}`}>angry<br />chaotic</div>
      {mode === "drift" && <div className={styles.driftHint}>Years as depth — pick a year to travel</div>}
    </div>
  );
}
