export type EnemyKind =
  | "regular"
  | "fast"
  | "heavy"
  | "shield"
  | "bomber"
  | "elite"
  | "kamikaze"
  | "sniper"
  | "swarm"
  | "twin"
  | "boss";

export type BossId =
  | "yard"
  | "docks"
  | "cold"
  | "night"
  | "crates"
  | "fleet"
  | "build"
  | "rail"
  | "roof"
  | "hub";

export type Add = (delay: number, fn: () => void) => void;

export type Spawner = {
  W: number;
  line: (kind: EnemyKind, n: number, gap?: number, scale?: number) => void;
  spawn: (kind: EnemyKind, x: number, y?: number, scale?: number) => void;
};

export type WaveDef = {
  boss?: boolean;
  script: (add: Add, s: Spawner, scale: number) => void;
};

export type LevelDef = {
  id: number;
  name: string;
  hint: string;
  mapSrc: string;
  tint: string;
  hpScale: number;
  bossScale: number;
  boss: BossId;
  scroll: number;
  waves: WaveDef[];
};

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "ДВОР СКЛАДА",
    hint: "Разведка FPV",
    mapSrc: "/game/maps/01-yard.jpg?v=p5",
    tint: "rgba(7,11,20,0.16)",
    hpScale: 1.0,
    bossScale: 0.36,
    boss: "yard",
    scroll: 40,
    waves: [
      {
        script(add, s, k) {
          add(0.15, () => s.line("regular", 4, 70, k));
          add(1.8, () => s.line("regular", 5, 80, k));
          add(3.8, () => s.line("regular", 4, 70, k));
        },
      },
      {
        script(add, s, k) {
          add(0.15, () => s.line("regular", 5, 65, k));
          add(1.6, () => s.line("kamikaze", 3, 50, k));
          add(3.4, () => s.line("regular", 5, 70, k));
          add(5.4, () => s.line("kamikaze", 3, 48, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("regular", 6, 60, k));
          add(1.5, () => s.line("kamikaze", 4, 45, k));
          add(3.2, () => s.line("regular", 5, 70, k));
          add(5.0, () => s.line("fast", 3, 50, k));
        },
      },
      {
        boss: true,
        script(add, s, k) {
          add(0.35, () => s.spawn("boss", s.W / 2, -80));
          add(2.4, () => s.line("regular", 4, 70, k));
          add(6.5, () => s.line("fast", 3, 50, k));
          add(11.0, () => s.line("regular", 4, 70, k));
        },
      },
    ],
  },
  {
    id: 2,
    name: "ПОГРУЗКА",
    hint: "Гонщики на рампе",
    mapSrc: "/game/maps/02-docks.jpg?v=p5",
    tint: "rgba(12,18,28,0.18)",
    hpScale: 1.12,
    bossScale: 0.5,
    boss: "docks",
    scroll: 46,
    waves: [
      {
        script(add, s, k) {
          add(0.1, () => s.line("regular", 5, 65, k));
          add(1.6, () => s.line("swarm", 6, 36, k));
          add(3.4, () => s.line("regular", 6, 70, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("swarm", 6, 32, k));
          add(1.5, () => s.line("regular", 5, 65, k));
          add(3.2, () => s.line("fast", 5, 40, k));
          add(5.0, () => s.line("regular", 5, 70, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("regular", 6, 55, k));
          add(1.4, () => s.line("fast", 5, 42, k));
          add(3.0, () => s.line("regular", 5, 60, k));
          add(4.8, () => s.line("fast", 6, 38, k));
        },
      },
      {
        boss: true,
        script(add, s, k) {
          add(0.3, () => s.spawn("boss", s.W / 2, -80));
          add(2.2, () => s.line("fast", 4, 45, k));
          add(6.0, () => s.line("regular", 5, 65, k));
          add(10.5, () => s.line("fast", 4, 42, k));
        },
      },
    ],
  },
  {
    id: 3,
    name: "ХОЛОДИЛЬНИК",
    hint: "Тяжёлые гексакоптеры",
    mapSrc: "/game/maps/03-cold.jpg?v=p5",
    tint: "rgba(18,28,40,0.2)",
    hpScale: 1.26,
    bossScale: 0.66,
    boss: "cold",
    scroll: 42,
    waves: [
      {
        script(add, s, k) {
          add(0.1, () => s.line("regular", 5, 70, k));
          add(1.4, () => s.spawn("heavy", s.W / 2, -60, k));
          add(3.2, () => s.line("sniper", 2, 90, k));
          add(5.0, () => s.line("regular", 5, 65, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("fast", 5, 42, k));
          add(1.6, () => {
            s.spawn("heavy", s.W * 0.3, -50, k);
            s.spawn("heavy", s.W * 0.7, -50, k);
          });
          add(3.8, () => s.line("regular", 6, 60, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("regular", 6, 55, k));
          add(1.5, () => s.spawn("heavy", s.W * 0.5, -55, k));
          add(3.2, () => s.line("sniper", 2, 80, k));
          add(5.0, () => {
            s.spawn("heavy", s.W * 0.25, -50, k);
            s.spawn("heavy", s.W * 0.75, -50, k);
          });
        },
      },
      {
        boss: true,
        script(add, s, k) {
          add(0.3, () => s.spawn("boss", s.W / 2, -80));
          add(3.2, () => s.spawn("heavy", s.W * 0.22, -50, k * 0.9));
          add(7.5, () => s.line("regular", 5, 65, k));
          add(12.0, () => s.line("fast", 4, 45, k));
        },
      },
    ],
  },
  {
    id: 4,
    name: "НОЧНАЯ СМЕНА",
    hint: "Щиты в темноте",
    mapSrc: "/game/maps/04-night.jpg?v=p5",
    tint: "rgba(4,8,18,0.28)",
    hpScale: 1.38,
    bossScale: 0.82,
    boss: "night",
    scroll: 50,
    waves: [
      {
        script(add, s, k) {
          add(0.1, () => s.line("shield", 4, 80, k));
          add(1.6, () => s.line("twin", 3, 70, k));
          add(3.4, () => s.line("regular", 5, 65, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("fast", 6, 38, k));
          add(1.5, () => s.line("twin", 3, 80, k));
          add(3.4, () => s.line("regular", 6, 55, k));
          add(5.2, () => s.line("fast", 5, 42, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("shield", 4, 75, k));
          add(1.6, () => s.line("fast", 6, 36, k));
          add(3.4, () => s.line("shield", 3, 80, k));
          add(5.2, () => s.line("regular", 6, 55, k));
        },
      },
      {
        boss: true,
        script(add, s, k) {
          add(0.3, () => s.spawn("boss", s.W / 2, -80));
          add(2.6, () => s.line("shield", 3, 80, k));
          add(7.0, () => s.line("fast", 5, 40, k));
          add(12.0, () => s.line("shield", 2, 90, k));
        },
      },
    ],
  },
  {
    id: 5,
    name: "КОНТЕЙНЕРЫ",
    hint: "Баба Яга над двором",
    mapSrc: "/game/maps/05-containers.jpg?v=p5",
    tint: "rgba(16,14,10,0.2)",
    hpScale: 1.52,
    bossScale: 1.0,
    boss: "crates",
    scroll: 48,
    waves: [
      {
        script(add, s, k) {
          add(0.1, () => s.line("regular", 5, 60, k));
          add(1.2, () => s.spawn("bomber", s.W * 0.5, -60, k));
          add(2.8, () => s.line("kamikaze", 5, 40, k));
          add(4.6, () => s.line("regular", 6, 55, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("fast", 6, 38, k));
          add(1.6, () => {
            s.spawn("bomber", s.W * 0.28, -50, k);
            s.spawn("bomber", s.W * 0.72, -50, k);
          });
          add(3.6, () => s.line("regular", 6, 55, k));
          add(5.4, () => s.line("kamikaze", 5, 38, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("regular", 6, 50, k));
          add(1.4, () => s.spawn("heavy", s.W / 2, -60, k));
          add(2.8, () => {
            s.spawn("bomber", s.W * 0.35, -50, k);
            s.spawn("bomber", s.W * 0.65, -50, k);
          });
          add(5.0, () => s.line("fast", 6, 38, k));
        },
      },
      {
        boss: true,
        script(add, s, k) {
          add(0.3, () => s.spawn("boss", s.W / 2, -80));
          add(3.2, () => s.spawn("bomber", s.W * 0.28, -50, k));
          add(7.0, () => s.line("fast", 5, 42, k));
          add(12.0, () => s.spawn("bomber", s.W * 0.72, -50, k));
        },
      },
    ],
  },
  {
    id: 6,
    name: "АВТОПАРК",
    hint: "Броня колонны",
    mapSrc: "/game/maps/06-fleet.jpg?v=p5",
    tint: "rgba(10,14,20,0.2)",
    hpScale: 1.68,
    bossScale: 1.2,
    boss: "fleet",
    scroll: 44,
    waves: [
      {
        script(add, s, k) {
          add(0.1, () => s.line("shield", 4, 75, k));
          add(1.4, () => s.spawn("heavy", s.W * 0.5, -55, k));
          add(3.2, () => s.line("regular", 6, 55, k));
          add(5.0, () => s.line("fast", 5, 40, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("fast", 6, 38, k));
          add(1.6, () => {
            s.spawn("heavy", s.W * 0.25, -50, k);
            s.spawn("heavy", s.W * 0.75, -50, k);
          });
          add(3.6, () => s.line("shield", 4, 80, k));
          add(5.6, () => s.line("regular", 6, 50, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("shield", 4, 70, k));
          add(1.5, () => s.spawn("heavy", s.W * 0.5, -55, k * 1.05));
          add(3.2, () => s.line("twin", 3, 70, k));
          add(5.0, () => {
            s.spawn("heavy", s.W * 0.22, -50, k);
            s.spawn("heavy", s.W * 0.78, -50, k);
          });
        },
      },
      {
        boss: true,
        script(add, s, k) {
          add(0.3, () => s.spawn("boss", s.W / 2, -80));
          add(3.4, () => s.spawn("heavy", s.W * 0.8, -50, k));
          add(8.0, () => s.line("shield", 3, 80, k));
          add(13.0, () => s.line("fast", 5, 40, k));
        },
      },
    ],
  },
  {
    id: 7,
    name: "СТРОЙКА РЦ",
    hint: "Элитные FPV",
    mapSrc: "/game/maps/07-build.jpg?v=p5",
    tint: "rgba(28,22,12,0.22)",
    hpScale: 1.84,
    bossScale: 1.42,
    boss: "build",
    scroll: 52,
    waves: [
      {
        script(add, s, k) {
          add(0.1, () => s.line("fast", 6, 36, k));
          add(1.4, () => s.spawn("elite", s.W * 0.5, -60, k));
          add(3.2, () => s.line("regular", 6, 55, k));
          add(5.0, () => s.line("fast", 5, 40, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => {
            s.spawn("elite", s.W * 0.28, -50, k);
            s.spawn("elite", s.W * 0.72, -50, k);
          });
          add(2.2, () => s.line("fast", 6, 36, k));
          add(4.2, () => s.line("shield", 4, 75, k));
          add(6.2, () => s.line("regular", 6, 50, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("fast", 7, 34, k));
          add(1.6, () => s.spawn("heavy", s.W / 2, -60, k));
          add(3.2, () => s.spawn("elite", s.W * 0.5, -70, k * 1.08));
          add(5.2, () => s.line("shield", 4, 70, k));
          add(7.2, () => s.line("fast", 6, 36, k));
        },
      },
      {
        boss: true,
        script(add, s, k) {
          add(0.3, () => s.spawn("boss", s.W / 2, -80));
          add(3.0, () => s.spawn("elite", s.W * 0.2, -55, k * 0.9));
          add(8.0, () => s.line("fast", 5, 40, k));
          add(13.0, () => s.spawn("elite", s.W * 0.8, -55, k * 0.9));
        },
      },
    ],
  },
  {
    id: 8,
    name: "Ж/Д ВЕТКА",
    hint: "Бомбардиры на путях",
    mapSrc: "/game/maps/08-rail.jpg?v=p5",
    tint: "rgba(14,16,18,0.22)",
    hpScale: 2.0,
    bossScale: 1.68,
    boss: "rail",
    scroll: 54,
    waves: [
      {
        script(add, s, k) {
          add(0.1, () => s.line("regular", 6, 55, k));
          add(1.2, () => s.line("bomber", 2, 100, k));
          add(3.0, () => s.line("swarm", 7, 30, k));
          add(4.8, () => s.line("shield", 4, 75, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("fast", 6, 36, k));
          add(1.5, () => s.spawn("heavy", s.W * 0.5, -60, k));
          add(3.2, () => {
            s.spawn("bomber", s.W * 0.22, -50, k);
            s.spawn("bomber", s.W * 0.78, -50, k);
          });
          add(5.4, () => s.line("regular", 6, 50, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("bomber", 2, 90, k));
          add(1.6, () => s.line("shield", 4, 70, k));
          add(3.4, () => s.spawn("elite", s.W * 0.5, -70, k));
          add(5.2, () => s.line("fast", 7, 34, k));
          add(7.2, () => s.line("regular", 6, 50, k));
        },
      },
      {
        boss: true,
        script(add, s, k) {
          add(0.3, () => s.spawn("boss", s.W / 2, -80));
          add(3.4, () => s.line("bomber", 2, 100, k));
          add(8.5, () => s.line("fast", 5, 40, k));
          add(13.5, () => s.spawn("elite", s.W * 0.7, -60, k * 0.85));
        },
      },
    ],
  },
  {
    id: 9,
    name: "КРЫША ХАБА",
    hint: "Все типы сразу",
    mapSrc: "/game/maps/09-roof.jpg?v=p5",
    tint: "rgba(8,12,16,0.2)",
    hpScale: 2.18,
    bossScale: 2.0,
    boss: "roof",
    scroll: 58,
    waves: [
      {
        script(add, s, k) {
          add(0.08, () => s.line("kamikaze", 6, 34, k));
          add(1.4, () => s.line("shield", 4, 70, k));
          add(3.0, () => s.line("regular", 7, 48, k));
          add(4.8, () => s.spawn("elite", s.W * 0.5, -60, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => {
            s.spawn("elite", s.W * 0.25, -50, k);
            s.spawn("elite", s.W * 0.75, -50, k);
          });
          add(2.0, () => s.line("fast", 7, 34, k));
          add(3.8, () => s.spawn("heavy", s.W / 2, -55, k));
          add(5.6, () => s.line("bomber", 2, 90, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("bomber", 2, 90, k));
          add(1.6, () => s.line("fast", 7, 32, k));
          add(3.4, () => s.spawn("elite", s.W * 0.5, -70, k * 1.12));
          add(5.2, () => s.line("shield", 5, 65, k));
          add(7.2, () => s.line("regular", 7, 48, k));
        },
      },
      {
        boss: true,
        script(add, s, k) {
          add(0.25, () => s.spawn("boss", s.W / 2, -80));
          add(2.8, () => {
            s.spawn("elite", s.W * 0.18, -50, k * 0.85);
            s.spawn("elite", s.W * 0.82, -50, k * 0.85);
          });
          add(8.0, () => s.line("fast", 6, 36, k));
          add(13.5, () => s.line("bomber", 2, 90, k));
        },
      },
    ],
  },
  {
    id: 10,
    name: "ГЛАВНЫЙ ХАБ",
    hint: "Финальный босс",
    mapSrc: "/game/maps/10-hub.jpg?v=p5",
    tint: "rgba(18,8,10,0.22)",
    hpScale: 2.38,
    bossScale: 2.45,
    boss: "hub",
    scroll: 36,
    waves: [
      {
        script(add, s, k) {
          add(0.08, () => s.line("regular", 6, 50, k));
          add(1.4, () => s.line("twin", 3, 70, k));
          add(3.0, () => s.line("shield", 4, 70, k));
          add(4.8, () => s.spawn("heavy", s.W / 2, -60, k));
          add(6.6, () => s.line("fast", 6, 36, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.line("bomber", 2, 90, k));
          add(1.6, () => s.line("fast", 7, 32, k));
          add(3.4, () => {
            s.spawn("elite", s.W * 0.28, -50, k);
            s.spawn("elite", s.W * 0.72, -50, k);
          });
          add(5.6, () => s.line("regular", 7, 48, k));
          add(7.6, () => s.spawn("heavy", s.W * 0.5, -55, k));
        },
      },
      {
        script(add, s, k) {
          add(0.1, () => s.spawn("heavy", s.W * 0.5, -55, k * 1.15));
          add(1.4, () => s.line("shield", 5, 65, k));
          add(3.2, () => s.line("bomber", 2, 85, k));
          add(5.0, () => s.spawn("elite", s.W * 0.5, -70, k * 1.2));
          add(7.0, () => s.line("fast", 7, 32, k));
          add(9.0, () => s.line("regular", 6, 50, k));
        },
      },
      {
        boss: true,
        script(add, s, k) {
          add(0.35, () => s.spawn("boss", s.W / 2, -80));
          add(3.2, () => s.line("regular", 4, 70, k));
          add(7.5, () => s.line("fast", 5, 40, k));
          add(12.0, () => s.line("shield", 3, 80, k));
          add(16.5, () => s.spawn("elite", s.W * 0.22, -60, k * 0.9));
          add(21.0, () => s.line("bomber", 2, 90, k));
          add(26.0, () => s.spawn("elite", s.W * 0.78, -60, k * 0.9));
        },
      },
    ],
  },
];

export const LEVEL_COUNT = LEVELS.length;
