export type UpgradeId = "caliber" | "weapon" | "bombs" | "armor" | "lives";
export type SkinId = "default" | "night" | "gold";

export type Upgrades = Record<UpgradeId, number>;

export const EMPTY_UPGRADES: Upgrades = {
  caliber: 0,
  weapon: 0,
  bombs: 0,
  armor: 0,
  lives: 0,
};

export const UPGRADE_COST: Record<UpgradeId, number[]> = {
  bombs: [280, 900, 2200],
  armor: [340, 1100, 2600],
  weapon: [420, 1300, 3000],
  caliber: [560, 1600, 3800],
  lives: [1200, 2800],
};

export const UPGRADES: { id: UpgradeId; name: string; hint: string }[] = [
  { id: "bombs", name: "Боезапас", hint: "Дополнительная бомба на рейс" },
  { id: "armor", name: "Броня РЦ", hint: "Склад крепче, меньше дыр от бомб" },
  { id: "weapon", name: "Старт-огонь", hint: "Вылетаешь с более жирным оружием" },
  { id: "caliber", name: "Калибр", hint: "Урон лазера +1 за уровень" },
  { id: "lives", name: "Запас жизней", hint: "+1 жизнь капитана" },
];

export const SKINS: { id: SkinId; name: string; hint: string; cost: number }[] = [
  { id: "default", name: "Капитан", hint: "Форма сети", cost: 0 },
  { id: "night", name: "Ночная смена", hint: "Тёмная броня", cost: 2400 },
  { id: "gold", name: "Золотой капитан", hint: "Хром и золото", cost: 7200 },
];

export function upgradeCost(id: UpgradeId, level: number): number | null {
  const costs = UPGRADE_COST[id];
  if (level >= costs.length) return null;
  return costs[level] ?? null;
}

export function maxUpgrade(id: UpgradeId): number {
  return UPGRADE_COST[id].length;
}
