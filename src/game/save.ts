import { EMPTY_UPGRADES, type SkinId, type Upgrades } from "./shop";

const KEY = "pyaterochka-force-v3";
const LEGACY = ["pyaterochka-force-v2", "pyaterochka-force-v1"];

export type SaveData = {
  version: 3;
  bestScore: number;
  bestWave: number;
  muted: boolean;
  bank: number;
  upgrades: Upgrades;
  skin: SkinId;
  ownedSkins: SkinId[];
};

const defaults: SaveData = {
  version: 3,
  bestScore: 0,
  bestWave: 0,
  muted: false,
  bank: 60,
  upgrades: { ...EMPTY_UPGRADES },
  skin: "default",
  ownedSkins: ["default"],
};

function clampUpgrades(raw: Partial<Upgrades> | undefined): Upgrades {
  const src = raw ?? {};
  return {
    caliber: Math.min(3, Math.max(0, Number(src.caliber) || 0)),
    weapon: Math.min(3, Math.max(0, Number(src.weapon) || 0)),
    bombs: Math.min(3, Math.max(0, Number(src.bombs) || 0)),
    armor: Math.min(3, Math.max(0, Number(src.armor) || 0)),
    lives: Math.min(2, Math.max(0, Number(src.lives) || 0)),
  };
}

function parse(raw: string): SaveData {
  const parsed = JSON.parse(raw) as Partial<SaveData> & { version?: number };
  const fresh = parsed.version !== 3;
  const owned: SkinId[] = !fresh && Array.isArray(parsed.ownedSkins)
    ? parsed.ownedSkins.filter((s): s is SkinId => s === "default" || s === "night" || s === "gold")
    : ["default"];
  if (!owned.includes("default")) owned.unshift("default");
  const skin: SkinId =
    !fresh && (parsed.skin === "night" || parsed.skin === "gold") && owned.includes(parsed.skin)
      ? parsed.skin
      : "default";
  return {
    version: 3,
    bestScore: Number(parsed.bestScore) || 0,
    bestWave: Number(parsed.bestWave) || 0,
    muted: Boolean(parsed.muted),
    bank: fresh ? 60 : Math.max(0, Number(parsed.bank) || 0),
    upgrades: fresh ? { ...EMPTY_UPGRADES } : clampUpgrades(parsed.upgrades),
    skin,
    ownedSkins: owned,
  };
}

export function loadSave(): SaveData {
  if (typeof window === "undefined") return { ...defaults, upgrades: { ...EMPTY_UPGRADES }, ownedSkins: ["default"] };
  try {
    const raw = localStorage.getItem(KEY) ?? LEGACY.map((k) => localStorage.getItem(k)).find(Boolean) ?? null;
    if (!raw) return { ...defaults, upgrades: { ...EMPTY_UPGRADES }, ownedSkins: ["default"] };
    return parse(raw);
  } catch {
    return { ...defaults, upgrades: { ...EMPTY_UPGRADES }, ownedSkins: ["default"] };
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* private mode */
  }
}
