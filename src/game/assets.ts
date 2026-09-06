import { LEVELS, type BossId } from "./levels";
import type { SkinId } from "./shop";

export type Sheet = {
  img: HTMLCanvasElement | HTMLImageElement;
  cols: number;
  rows: number;
};

export type Assets = {
  player: Sheet;
  skins: Record<SkinId, Sheet>;
  drones: Record<string, Sheet>;
  bosses: Record<BossId, Sheet>;
  laser: Sheet;
  orb: Sheet;
  rocket: Sheet;
  explode: Sheet;
  bomb: Sheet;
  shield: Sheet;
  crate: HTMLCanvasElement | HTMLImageElement;
  apelsin: Sheet;
  maps: HTMLImageElement[];
  portrait: HTMLImageElement;
};

const SHEETS: Record<string, string> = {
  player: "/game/player.png",
  "player-gold": "/game/player-gold.png",
  "player-night": "/game/player-night.png",
  "drone-regular": "/game/drone-regular.png?v=ua1",
  "drone-fast": "/game/drone-fast.png?v=ua1",
  "drone-heavy": "/game/drone-heavy.png?v=ua1",
  "drone-shield": "/game/drone-shield.png?v=ua1",
  "drone-bomber": "/game/drone-bomber.png?v=ua1",
  "drone-elite": "/game/drone-elite.png?v=ua1",
  "drone-boss": "/game/drone-boss.png?v=ua1",
  "drone-kamikaze": "/game/drone-kamikaze.png",
  "drone-sniper": "/game/drone-sniper.png",
  "drone-swarm": "/game/drone-swarm.png",
  "drone-twin": "/game/drone-twin.png",
  "boss-yard": "/game/boss-yard.png",
  "boss-docks": "/game/boss-docks.png",
  "boss-cold": "/game/boss-cold.png",
  "boss-night": "/game/boss-night.png",
  "boss-crates": "/game/boss-crates.png",
  "boss-fleet": "/game/boss-fleet.png",
  "boss-build": "/game/boss-build.png",
  "boss-rail": "/game/boss-rail.png",
  "boss-roof": "/game/boss-roof.png",
  "boss-hub": "/game/boss-hub.png",
  laser: "/game/laser.png",
  orb: "/game/orb.png",
  rocket: "/game/rocket.png",
  explode: "/game/explode.png",
  bomb: "/game/bomb.png",
  shield: "/game/shield.png",
  crate: "/game/crate.png",
  apelsin: "/game/apelsin.png",
};

function assetUrl(src: string): string {
  if (/^https?:\/\//.test(src)) return src;
  const base = import.meta.env.BASE_URL || "/";
  return src.startsWith("/") ? `${base}${src.slice(1)}` : `${base}${src}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = assetUrl(src);
  });
}

function chromaKey(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.drawImage(img, 0, 0);
  try {
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] ?? 0;
      const g = d[i + 1] ?? 0;
      const b = d[i + 2] ?? 0;
      const a = d[i + 3] ?? 0;
      if (a === 0) continue;
      const dist = Math.hypot(r - 255, g, b - 255);
      const rb = (r + b) * 0.5;
      const mag = rb - g;
      const magenta = mag > 40 && b > r * 0.4 && b > 85 && r > 100 && g < 130;
      if (dist < 90 || (magenta && dist < 200)) {
        const t = Math.min(1, Math.max((120 - dist) / 120, (mag - 35) / 85));
        d[i + 3] = Math.round(a * (1 - t));
      }
      if (d[i + 3]! > 0 && mag > 18 && b > Math.max(g * 1.15, r * 0.38)) {
        d[i + 2] = Math.round(Math.max(g, r * 0.36));
      }
    }
    ctx.putImageData(data, 0, 0);
  } catch {
    /* tainted */
  }
  return c;
}

function sheet(img: HTMLCanvasElement | HTMLImageElement, cols = 2, rows = 2): Sheet {
  return { img, cols, rows };
}

export async function loadAssets(): Promise<Assets> {
  const keys = Object.keys(SHEETS);
  const loaded = await Promise.all(keys.map((k) => loadImage(SHEETS[k]!)));
  const map = new Map<string, HTMLCanvasElement | HTMLImageElement>();
  keys.forEach((k, i) => map.set(k, chromaKey(loaded[i]!)));

  const maps = await Promise.all(LEVELS.map((l) => loadImage(l.mapSrc)));
  const portrait = await loadImage("/game/captain-portrait.jpg");

  return {
    player: sheet(map.get("player")!),
    skins: {
      default: sheet(map.get("player")!),
      gold: sheet(map.get("player-gold") ?? map.get("player")!),
      night: sheet(map.get("player-night") ?? map.get("player")!),
    },
    drones: {
      regular: sheet(map.get("drone-regular")!),
      fast: sheet(map.get("drone-fast")!),
      heavy: sheet(map.get("drone-heavy")!),
      shield: sheet(map.get("drone-shield")!),
      bomber: sheet(map.get("drone-bomber")!),
      elite: sheet(map.get("drone-elite")!),
      boss: sheet(map.get("drone-boss")!),
      kamikaze: sheet(map.get("drone-kamikaze")!),
      sniper: sheet(map.get("drone-sniper")!),
      swarm: sheet(map.get("drone-swarm")!),
      twin: sheet(map.get("drone-twin")!),
    },
    bosses: {
      yard: sheet(map.get("boss-yard")!),
      docks: sheet(map.get("boss-docks")!),
      cold: sheet(map.get("boss-cold")!),
      night: sheet(map.get("boss-night")!),
      crates: sheet(map.get("boss-crates")!),
      fleet: sheet(map.get("boss-fleet")!),
      build: sheet(map.get("boss-build")!),
      rail: sheet(map.get("boss-rail")!),
      roof: sheet(map.get("boss-roof")!),
      hub: sheet(map.get("boss-hub")!),
    },
    laser: sheet(map.get("laser")!),
    orb: sheet(map.get("orb")!),
    rocket: sheet(map.get("rocket")!),
    explode: sheet(map.get("explode")!),
    bomb: sheet(map.get("bomb")!),
    shield: sheet(map.get("shield")!),
    crate: map.get("crate")!,
    apelsin: sheet(map.get("apelsin")!),
    maps,
    portrait,
  };
}

export function drawSheet(
  ctx: CanvasRenderingContext2D,
  sheet: Sheet,
  frame: number,
  x: number,
  y: number,
  w: number,
  h: number,
  rot = 0,
) {
  const cols = sheet.cols;
  const rows = sheet.rows;
  const cw = sheet.img.width / cols;
  const ch = sheet.img.height / rows;
  const f = ((frame % (cols * rows)) + cols * rows) % (cols * rows);
  const sx = (f % cols) * cw;
  const sy = Math.floor(f / cols) * ch;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(sheet.img, sx, sy, cw, ch, -w / 2, -h / 2, w, h);
  ctx.restore();
}
