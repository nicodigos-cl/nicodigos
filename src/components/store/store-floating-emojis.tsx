"use client";

import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  FaApple,
  FaDiscord,
  FaGamepad,
  FaGift,
  FaGooglePlay,
  FaInstagram,
  FaKey,
  FaMicrosoft,
  FaPlaystation,
  FaSpotify,
  FaSteam,
  FaTiktok,
  FaTwitch,
  FaWindows,
  FaXbox,
  FaYoutube,
} from "react-icons/fa";
import { SiEpicgames, SiNetflix, SiOrigin } from "react-icons/si";

import { cn } from "@/lib/utils";

export const STORE_EMOJIS = [
  "/images/emojis/grinning-face.webp",
  "/images/emojis/drooling-face.webp",
  "/images/emojis/see-no-evil.webp",
  "/images/emojis/neutral-face.webp",
  "/images/emojis/woozy-face.webp",
  "/images/emojis/pink-smiley.webp",
  "/images/emojis/cat.webp",
  "/images/emojis/smiling-cat.webp",
  "/images/emojis/heart-eyes-cat.webp",
  "/images/emojis/star-struck.webp",
  "/images/emojis/yellow-face.webp",
] as const;

const DIGITAL_ICONS: IconType[] = [
  FaSteam,
  FaPlaystation,
  FaXbox,
  FaKey,
  FaGift,
  FaGamepad,
  FaSpotify,
  FaDiscord,
  FaTwitch,
  FaInstagram,
  FaTiktok,
  FaYoutube,
  FaWindows,
  FaMicrosoft,
  FaApple,
  FaGooglePlay,
  SiEpicgames,
  SiNetflix,
  SiOrigin,
];

const ICON_TONES = [
  "text-primary/40",
  "text-foreground/30",
  "text-primary/35",
  "text-foreground/25",
  "text-primary/30",
  "text-foreground/35",
] as const;

type EmojiSpec = {
  id: string;
  kind: "emoji";
  src: string;
  size: number;
};

type IconSpec = {
  id: string;
  kind: "icon";
  Icon: IconType;
  size: number;
  tone: string;
};

type ParticleSpec = EmojiSpec | IconSpec;

type Runtime = {
  el: HTMLElement;
  size: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  rotate: number;
  /** px per second */
  speed: number;
};

function rand(min: number, max: number, random = Math.random) {
  return min + random() * (max - min);
}

const SPEED_MIN = 200;
const SPEED_MAX = 380;

/**
 * Random point in the outer band (away from the content center).
 * hole = center dead-zone ratio (0–1).
 */
function randomEdgePoint(
  maxX: number,
  maxY: number,
  hole = 0.68,
): { x: number; y: number } {
  if (maxX <= 0 || maxY <= 0) return { x: 0, y: 0 };

  const holeW = maxX * hole;
  const holeH = maxY * hole;
  const holeLeft = (maxX - holeW) / 2;
  const holeRight = holeLeft + holeW;
  const holeTop = (maxY - holeH) / 2;
  const holeBottom = holeTop + holeH;

  const topH = Math.max(0, holeTop);
  const bottomH = Math.max(0, maxY - holeBottom);
  const leftW = Math.max(0, holeLeft);
  const rightW = Math.max(0, maxX - holeRight);
  const weights = [topH * maxX, bottomH * maxX, leftW * holeH, rightW * holeH];
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let roll = Math.random() * total;

  if ((roll -= weights[0]) < 0) {
    return { x: rand(0, maxX), y: rand(0, topH || maxY) };
  }
  if ((roll -= weights[1]) < 0) {
    return { x: rand(0, maxX), y: rand(holeBottom, maxY) };
  }
  if ((roll -= weights[2]) < 0) {
    return { x: rand(0, leftW || maxX), y: rand(holeTop, holeBottom) };
  }
  return { x: rand(holeRight, maxX), y: rand(holeTop, holeBottom) };
}

function pickRandom<T>(
  items: readonly T[],
  count: number,
  random: () => number,
): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function createSpecs(emojiCount: number, iconCount: number): ParticleSpec[] {
  const random = seededRandom(emojiCount * 1_009 + iconCount * 9_173);
  const emojis = pickRandom(STORE_EMOJIS, emojiCount, random).map(
    (src, index): EmojiSpec => ({
      id: `emoji-${index}-${src}`,
      kind: "emoji",
      src,
      size: Math.round(rand(54, 88, random)),
    }),
  );

  const icons = pickRandom(DIGITAL_ICONS, iconCount, random).map(
    (Icon, index): IconSpec => ({
      id: `icon-${index}`,
      kind: "icon",
      Icon,
      size: Math.round(rand(28, 42, random)),
      tone: ICON_TONES[index % ICON_TONES.length],
    }),
  );

  return [...emojis, ...icons];
}

type StoreFloatingEmojisProps = {
  emojiCount?: number;
  iconCount?: number;
  /** @deprecated use emojiCount */
  count?: number;
  className?: string;
};

/** Decorative stickers that wander randomly across the full section. */
export function StoreFloatingEmojis({
  emojiCount,
  iconCount = 6,
  count = 5,
  className,
}: StoreFloatingEmojisProps) {
  const resolvedEmojiCount = emojiCount ?? count;
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  // Create particles only after mount — Math.random() cannot run during SSR.
  const [specs, setSpecs] = useState<ParticleSpec[] | null>(null);

  useEffect(() => {
    const specs = createSpecs(resolvedEmojiCount, iconCount);
    setTimeout(() => {
      setSpecs(specs);
    }, 1000);
  }, [resolvedEmojiCount, iconCount]);

  useEffect(() => {
    if (!specs) return;

    const container = containerRef.current;
    if (!container) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const runtimes: Runtime[] = [];
    let width = 0;
    let height = 0;

    const updateBounds = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    };

    const seed = () => {
      updateBounds();
      runtimes.length = 0;

      for (const spec of specs) {
        const el = nodeRefs.current.get(spec.id);
        if (!el) continue;

        const maxX = Math.max(0, width - spec.size);
        const maxY = Math.max(0, height - spec.size);
        const start = randomEdgePoint(maxX, maxY);
        const target = randomEdgePoint(maxX, maxY);

        runtimes.push({
          el,
          size: spec.size,
          x: start.x,
          y: start.y,
          tx: target.x,
          ty: target.y,
          rotate: rand(-16, 16),
          speed: rand(SPEED_MIN, SPEED_MAX),
        });

        el.style.transform = `translate3d(${start.x}px, ${start.y}px, 0) rotate(${runtimes.at(-1)!.rotate}deg)`;
      }
    };

    seed();

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const motionMultiplier = media.matches ? 0.25 : 1;

      for (const runtime of runtimes) {
        const maxX = Math.max(0, width - runtime.size);
        const maxY = Math.max(0, height - runtime.size);

        let dx = runtime.tx - runtime.x;
        let dy = runtime.ty - runtime.y;
        let dist = Math.hypot(dx, dy);

        if (dist < 8) {
          const next = randomEdgePoint(maxX, maxY);
          runtime.tx = next.x;
          runtime.ty = next.y;
          runtime.rotate = rand(-16, 16);
          runtime.speed = rand(SPEED_MIN, SPEED_MAX);
          dx = runtime.tx - runtime.x;
          dy = runtime.ty - runtime.y;
          dist = Math.hypot(dx, dy) || 1;
        }

        const step = Math.min(dist, runtime.speed * motionMultiplier * dt);
        runtime.x += (dx / dist) * step;
        runtime.y += (dy / dist) * step;
        runtime.x = Math.min(maxX, Math.max(0, runtime.x));
        runtime.y = Math.min(maxY, Math.max(0, runtime.y));

        runtime.el.style.transform = `translate3d(${runtime.x}px, ${runtime.y}px, 0) rotate(${runtime.rotate}deg)`;
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    const resizeObserver = new ResizeObserver(seed);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [specs]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {specs?.map((spec) => (
        <span
          key={spec.id}
          ref={(node) => {
            if (node) nodeRefs.current.set(spec.id, node);
            else nodeRefs.current.delete(spec.id);
          }}
          className="absolute top-0 left-0 will-change-transform max-sm:scale-75"
        >
          {spec.kind === "emoji" ? (
            // Native <img> keeps animated WebP frames.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={spec.src}
              alt=""
              width={spec.size}
              height={spec.size}
              decoding="async"
              draggable={false}
              className="opacity-80 drop-shadow-md sm:opacity-90"
            />
          ) : (
            <spec.Icon
              size={spec.size}
              className={cn("drop-shadow-sm", spec.tone)}
            />
          )}
        </span>
      ))}
    </div>
  );
}
