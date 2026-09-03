/**
 * Deterministic, illustrated-style SVG avatars generated purely from a seed
 * string — no external images. Same seed always produces the same avatar.
 */

const BACKGROUND_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#6366f1",
  "#ec4899",
];

const SKIN_TONES = ["#f2c9a0", "#e0ac69", "#c68642", "#8d5524", "#ffdbac"];
const HAIR_COLORS = ["#1c1917", "#3f2e21", "#6b4226", "#9ca3af", "#292524"];

type HairShape = "short" | "bald" | "curly" | "long" | "bun" | "wave";
type FaceShape = "round" | "oval" | "square";
type ClothingStyle = "suit" | "blazer" | "collar";

const HAIR_SHAPES: HairShape[] = ["short", "bald", "curly", "long", "bun", "wave"];
const FACE_SHAPES: FaceShape[] = ["round", "oval", "square"];
const CLOTHING_STYLES: ClothingStyle[] = ["suit", "blazer", "collar"];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], hash: number, salt: number): T {
  return arr[(hash + salt) % arr.length];
}

export interface AvatarTraits {
  background: string;
  skin: string;
  hairColor: string;
  hairShape: HairShape;
  faceShape: FaceShape;
  clothing: ClothingStyle;
}

export function avatarTraits(seed: string): AvatarTraits {
  const h = hashSeed(seed);
  return {
    background: pick(BACKGROUND_COLORS, h, 0),
    skin: pick(SKIN_TONES, h, 7),
    hairColor: pick(HAIR_COLORS, h, 13),
    hairShape: pick(HAIR_SHAPES, h, 19),
    faceShape: pick(FACE_SHAPES, h, 29),
    clothing: pick(CLOTHING_STYLES, h, 37),
  };
}

function faceRadius(shape: FaceShape): { rx: number; ry: number } {
  switch (shape) {
    case "round":
      return { rx: 24, ry: 24 };
    case "square":
      return { rx: 20, ry: 23 };
    case "oval":
    default:
      return { rx: 21, ry: 26 };
  }
}

function hairPath(shape: HairShape, hairColor: string): string {
  switch (shape) {
    case "bald":
      return "";
    case "short":
      return `<path d="M28 32 Q50 12 72 32 L72 24 Q50 8 28 24 Z" fill="${hairColor}" />`;
    case "curly":
      return `<circle cx="34" cy="26" r="8" fill="${hairColor}" /><circle cx="46" cy="20" r="9" fill="${hairColor}" /><circle cx="58" cy="22" r="8" fill="${hairColor}" /><circle cx="67" cy="30" r="7" fill="${hairColor}" />`;
    case "long":
      return `<path d="M26 30 Q50 6 74 30 L76 62 Q70 40 66 34 L34 34 Q30 40 24 62 Z" fill="${hairColor}" />`;
    case "bun":
      return `<path d="M28 30 Q50 10 72 30 L72 24 Q50 10 28 24 Z" fill="${hairColor}" /><circle cx="50" cy="12" r="7" fill="${hairColor}" />`;
    case "wave":
    default:
      return `<path d="M26 30 Q35 10 50 16 Q65 10 74 30 L70 28 Q50 20 30 28 Z" fill="${hairColor}" />`;
  }
}

function clothingPath(style: ClothingStyle): string {
  switch (style) {
    case "suit":
      return `<path d="M20 100 Q50 78 80 100 L80 110 L20 110 Z" fill="#1e293b" /><path d="M45 82 L50 96 L55 82 L50 88 Z" fill="#f1f5f9" />`;
    case "blazer":
      return `<path d="M20 100 Q50 80 80 100 L80 110 L20 110 Z" fill="#334155" />`;
    case "collar":
    default:
      return `<path d="M20 100 Q50 82 80 100 L80 110 L20 110 Z" fill="#475569" /><path d="M42 84 L50 94 L58 84" stroke="#f1f5f9" stroke-width="2" fill="none" />`;
  }
}

/** Renders a full illustrated avatar as a standalone SVG string, sized to fill its container. */
export function renderAvatarSvg(seed: string): string {
  const t = avatarTraits(seed);
  const { rx, ry } = faceRadius(t.faceShape);

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar">
  <circle cx="50" cy="50" r="50" fill="${t.background}" />
  <ellipse cx="50" cy="56" rx="${rx}" ry="${ry}" fill="${t.skin}" />
  ${clothingPath(t.clothing)}
  <circle cx="41" cy="54" r="2.4" fill="#1c1917" />
  <circle cx="59" cy="54" r="2.4" fill="#1c1917" />
  <path d="M45 64 Q50 68 55 64" stroke="#7c4a2d" stroke-width="1.6" fill="none" stroke-linecap="round" />
  ${hairPath(t.hairShape, t.hairColor)}
</svg>`;
}
