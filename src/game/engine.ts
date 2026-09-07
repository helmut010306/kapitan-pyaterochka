import { type Actions, Input } from "./input";
import { Sfx } from "./audio";
import { type Assets, drawSheet, loadAssets } from "./assets";
import { haptic } from "./telegram";
import { loadSave, writeSave, type SaveData } from "./save";
import { LEVELS, LEVEL_COUNT, type BossId, type EnemyKind, type Spawner } from "./levels";
import { SKINS, upgradeCost, type SkinId, type UpgradeId, type Upgrades } from "./shop";

export const W = 432;
export const H = 768;
const FIXED = 1 / 60;

export type Mode = "boot" | "title" | "playing" | "paused" | "over" | "win" | "shop";

export type HudState = {
  mode: Mode;
  lives: number;
  maxLives: number;
  score: number;
  coins: number;
  bank: number;
  bombs: number;
  wave: number;
  wavesInLevel: number;
  level: number;
  weapon: number;
  shield: number;
  warehouse: number;
  warehouseMax: number;
  best: number;
  waveBanner: string;
  levelName: string;
  levelCount: number;
  muted: boolean;
  ready: boolean;
  upgrades: Upgrades;
  skin: SkinId;
  ownedSkins: SkinId[];
};

type BulletKind = "laser" | "scatter" | "rocket" | "orb" | "bombshot" | "heavy";
type PickupKind = "weapon" | "shield" | "bomb" | "coin" | "heart";

type Enemy = {
  alive: boolean;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  shield: number;
  t: number;
  fire: number;
  phase: number;
  score: number;
  bob: number;
  bossId: BossId | "";
};
type Bullet = {
  alive: boolean;
  friendly: boolean;
  kind: BulletKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  life: number;
  rot: number;
};
type Pickup = {
  alive: boolean;
  kind: PickupKind;
  x: number;
  y: number;
  vy: number;
  t: number;
};
type Particle = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};
type Boom = { alive: boolean; x: number; y: number; t: number; size: number };
type Floater = { alive: boolean; x: number; y: number; t: number; text: string };

const ENEMY_STATS: Record<
  EnemyKind,
  { hp: number; r: number; score: number; w: number; h: number }
> = {
  regular: { hp: 10, r: 18, score: 100, w: 52, h: 52 },
  fast: { hp: 7, r: 16, score: 140, w: 50, h: 50 },
  heavy: { hp: 32, r: 24, score: 280, w: 68, h: 64 },
  shield: { hp: 16, r: 22, score: 220, w: 60, h: 60 },
  bomber: { hp: 24, r: 26, score: 300, w: 78, h: 62 },
  elite: { hp: 40, r: 26, score: 450, w: 72, h: 72 },
  kamikaze: { hp: 8, r: 14, score: 160, w: 46, h: 40 },
  sniper: { hp: 18, r: 18, score: 260, w: 70, h: 36 },
  swarm: { hp: 5, r: 12, score: 70, w: 34, h: 34 },
  twin: { hp: 20, r: 22, score: 240, w: 72, h: 42 },
  boss: { hp: 520, r: 50, score: 5000, w: 140, h: 130 },
};

const BOSS_STATS: Record<BossId, { hp: number; r: number; score: number; w: number; h: number }> = {
  yard: { hp: 380, r: 46, score: 3200, w: 128, h: 118 },
  docks: { hp: 460, r: 52, score: 3800, w: 150, h: 118 },
  cold: { hp: 520, r: 50, score: 4200, w: 136, h: 130 },
  night: { hp: 500, r: 48, score: 4400, w: 148, h: 90 },
  crates: { hp: 580, r: 54, score: 4800, w: 150, h: 128 },
  fleet: { hp: 620, r: 52, score: 5000, w: 152, h: 120 },
  build: { hp: 660, r: 52, score: 5200, w: 140, h: 132 },
  rail: { hp: 700, r: 56, score: 5600, w: 168, h: 100 },
  roof: { hp: 740, r: 54, score: 6000, w: 142, h: 130 },
  hub: { hp: 880, r: 58, score: 8000, w: 160, h: 145 },
};

function pool<T>(n: number, make: () => T): T[] {
  return Array.from({ length: n }, make);
}
function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: Input;
  sfx = new Sfx();
  assets: Assets | null = null;
  private onHud: (s: HudState) => void;
  raf = 0;
  acc = 0;
  last = 0;
  running = false;
  hitstop = 0;
  trauma = 0;
  time = 0;
  bgY = 0;
  bannerT = 0;
  banner = "";
  private mode: Mode = "boot";
  save: SaveData = loadSave();
  private mapIndex = 0;
  private scrollSpeed = 36;
  private player = {
    x: 216,
    y: 648,
    vx: 0,
    vy: 0,
    r: 16,
    lives: 3,
    inv: 0,
    shield: 0,
    fire: 0,
    rocket: 0,
    weapon: 1,
    bombs: 2,
    flash: 0,
    bank: 0,
  };
  score = 0;
  coins = 0;
  wave = 0;
  private levelIndex = 0;
  private bossWave = false;
  warehouse = 100;
  warehouseMax = 100;
  private cashed = false;
  private spawnQ: { t: number; fn: () => void }[] = [];
  spawnClock = 0;
  waveClearT = 0;
  private muted = false;
  private enemies = pool(110, (): Enemy => ({
    alive: false,
    kind: "regular",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 16,
    hp: 1,
    maxHp: 1,
    shield: 0,
    t: 0,
    fire: 0,
    phase: 0,
    score: 0,
    bob: 0,
    bossId: "",
  }));
  private bullets = pool(360, (): Bullet => ({
    alive: false,
    friendly: true,
    kind: "laser",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 4,
    dmg: 1,
    life: 1,
    rot: 0,
  }));
  private pickups = pool(20, (): Pickup => ({
    alive: false,
    kind: "coin",
    x: 0,
    y: 0,
    vy: 70,
    t: 0,
  }));
  private particles = pool(220, (): Particle => ({
    alive: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    size: 2,
    color: "#ff3b2f",
  }));
  private booms = pool(24, (): Boom => ({
    alive: false,
    x: 0,
    y: 0,
    t: 0,
    size: 40,
  }));
  private floaters = pool(16, (): Floater => ({
    alive: false,
    x: 0,
    y: 0,
    t: 0,
    text: "",
  }));
  view = {
    x: 0,
    y: 0,
    scale: 1,
    cssW: 1,
    cssH: 1,
  };
  constructor(canvas: HTMLCanvasElement, onHud: (s: HudState) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    this.ctx = ctx;
    this.onHud = onHud;
    this.input = new Input(
      canvas,
      (cx, cy) => this.clientToWorld(cx, cy),
      () => ({
        x: this.player.x,
        y: this.player.y,
      }),
    );
    this.muted = this.save.muted;
    this.sfx.setMuted(this.muted);
  }
  async init() {
    this.resize();
    this.assets = await loadAssets();
    this.input.attach();
    this.mode = "title";
    this.wireControlsTest();
    this.emit();
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", this.onVis);
  }
  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.detach();
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.onVis);
    if (typeof window !== "undefined") delete window.__controlsTest;
  }
  play() {
    this.sfx.unlock();
    this.resetRun();
    this.mode = "playing";
    this.nextWave();
    this.emit();
  }
  openShop() {
    if (this.mode === "playing") return;
    this.mode = "shop";
    this.emit();
  }
  closeShop() {
    this.mode = "title";
    this.emit();
  }
  buyUpgrade(id: UpgradeId) {
    const level = this.save.upgrades[id];
    const cost = upgradeCost(id, level);
    if (cost == null || this.save.bank < cost) return;
    this.save.bank -= cost;
    this.save.upgrades[id] = level + 1;
    writeSave(this.save);
    this.sfx.pickup();
    haptic("success");
    this.emit();
  }
  buySkin(id: SkinId) {
    const def = SKINS.find((s) => s.id === id);
    if (!def) return;
    if (this.save.ownedSkins.includes(id)) {
      this.save.skin = id;
      writeSave(this.save);
      this.emit();
      return;
    }
    if (this.save.bank < def.cost) return;
    this.save.bank -= def.cost;
    this.save.ownedSkins = [...this.save.ownedSkins, id];
    this.save.skin = id;
    writeSave(this.save);
    this.sfx.pickup();
    haptic("success");
    this.emit();
  }
  pause() {
    if (this.mode === "playing") {
      this.mode = "paused";
      this.emit();
    }
  }
  resume() {
    if (this.mode === "paused") {
      this.mode = "playing";
      this.emit();
    }
  }
  toggleMute() {
    this.muted = !this.muted;
    this.sfx.setMuted(this.muted);
    this.save.muted = this.muted;
    writeSave(this.save);
    this.emit();
  }
  dropBomb() {
    if (this.mode !== "playing") return;
    if (this.player.bombs <= 0) return;
    this.player.bombs -= 1;
    this.sfx.bomb();
    haptic("heavy");
    this.trauma = Math.min(1, this.trauma + 0.85);
    this.boom(this.player.x, this.player.y - 80, 220);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      this.hurtEnemy(e, 28, true);
    }
    for (const b of this.bullets) if (b.alive && !b.friendly) b.alive = false;
    this.emit();
  }
  private resetRun() {
    const u = this.save.upgrades;
    this.score = 0;
    this.coins = 0;
    this.cashed = false;
    this.wave = 0;
    this.levelIndex = 0;
    this.bossWave = false;
    this.warehouseMax = 100 + 12 * u.armor;
    this.warehouse = this.warehouseMax;
    this.mapIndex = 0;
    this.scrollSpeed = LEVELS[0]!.scroll;
    this.player.x = 216;
    this.player.y = 638;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.lives = 3 + u.lives;
    this.player.inv = 1.1;
    this.player.shield = 0;
    this.player.weapon = 1 + u.weapon;
    this.player.bombs = 2 + u.bombs;
    this.player.fire = 0;
    this.player.rocket = 0;
    this.spawnQ = [];
    this.spawnClock = 0;
    this.waveClearT = 0;
    this.hitstop = 0;
    this.trauma = 0;
    for (const e of this.enemies) e.alive = false;
    for (const b of this.bullets) b.alive = false;
    for (const p of this.pickups) p.alive = false;
    for (const p of this.particles) p.alive = false;
    for (const b of this.booms) b.alive = false;
  }
  private loop = (now: number) => {
    if (!this.running) return;
    let dt = (now - this.last) / 1e3;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    this.acc += dt;
    while (this.acc >= FIXED) {
      if (this.hitstop > 0) this.hitstop -= FIXED;
      else if (this.mode === "playing") this.step(FIXED);
      else if (
        this.mode === "title" ||
        this.mode === "over" ||
        this.mode === "paused" ||
        this.mode === "win"
      ) {
        this.bgY += this.scrollSpeed * 0.42 * FIXED;
        this.time += FIXED;
      }
      this.acc -= FIXED;
    }
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };
  private step(dt: number) {
    this.time += dt;
    this.bgY += this.scrollSpeed * dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    if (this.bannerT > 0) this.bannerT -= dt;
    this.sfx.tickMusic(dt);
    const a = this.input.sample();
    if (a.pausePressed) {
      this.pause();
      return;
    }
    if (a.bombPressed) this.dropBomb();
    this.movePlayer(a, dt);
    this.playerFire(dt);
    this.updateSpawns(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.updateFx(dt);
    this.collide();
    this.checkWave();
    if (this.player.lives <= 0 || this.warehouse <= 0) this.gameOver();
  }
  private movePlayer(a: Actions, dt: number) {
    const p = this.player;
    const speed = 340;
    if (a.pointer) {
      const tx = a.pointerX + a.grabOffsetX;
      const ty = a.pointerY + a.grabOffsetY;
      const dx = tx - p.x;
      p.x += dx * (1 - Math.exp(-16 * dt));
      p.y += (ty - p.y) * (1 - Math.exp(-16 * dt));
      p.vx = dx / Math.max(dt, 0.016);
      p.bank +=
        (clamp(dx / 28, -0.35, 0.35) - p.bank) * (1 - Math.exp(-12 * dt));
    } else {
      p.vx = a.moveX * speed;
      p.vy = a.moveY * speed;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.bank += (a.moveX * 0.32 - p.bank) * (1 - Math.exp(-12 * dt));
    }
    p.x = clamp(p.x, 28, 404);
    p.y = clamp(p.y, 90, 704);
    if (p.inv > 0) p.inv -= dt;
    if (p.shield > 0) p.shield -= dt;
    if (p.flash > 0) p.flash -= dt;
  }
  private playerFire(dt: number) {
    const p = this.player;
    p.fire -= dt;
    p.rocket -= dt;
    const lvl = p.weapon;
    const rate = Math.max(0.08, 0.168 - lvl * 0.011);
    if (p.fire <= 0) {
      p.fire = rate;
      this.sfx.shoot();
      const extra = this.save.upgrades.caliber;
      const dmg = 1 + (lvl >= 4 ? 1 : 0) + extra;
      if (lvl === 1) {
        this.shot(true, "laser", p.x - 8, p.y - 28, 0, -620, 4, dmg);
        this.shot(true, "laser", p.x + 8, p.y - 28, 0, -620, 4, dmg);
      } else if (lvl === 2) {
        this.shot(true, "laser", p.x, p.y - 30, 0, -640, 4, dmg);
        this.shot(true, "laser", p.x - 12, p.y - 24, 0, -620, 4, dmg);
        this.shot(true, "laser", p.x + 12, p.y - 24, 0, -620, 4, dmg);
      } else {
        this.shot(true, "laser", p.x, p.y - 32, 0, -660, 5, dmg);
        this.shot(true, "laser", p.x - 14, p.y - 24, -40, -640, 4, dmg);
        this.shot(true, "laser", p.x + 14, p.y - 24, 40, -640, 4, dmg);
        this.shot(true, "scatter", p.x - 20, p.y - 16, -180, -560, 4, 1 + extra);
        this.shot(true, "scatter", p.x + 20, p.y - 16, 180, -560, 4, 1 + extra);
        if (lvl >= 5) {
          this.shot(true, "scatter", p.x - 28, p.y - 8, -280, -500, 4, 1 + extra);
          this.shot(true, "scatter", p.x + 28, p.y - 8, 280, -500, 4, 1 + extra);
        }
      }
    }
    if (lvl >= 4 && p.rocket <= 0) {
      p.rocket = lvl >= 5 ? 0.55 : 0.8;
      this.sfx.rocket();
      this.shot(true, "rocket", p.x - 16, p.y, 0, -280, 7, 5 + this.save.upgrades.caliber);
      this.shot(true, "rocket", p.x + 16, p.y, 0, -280, 7, 5 + this.save.upgrades.caliber);
    }
  }
  private nextWave() {
    const cur = LEVELS[this.levelIndex];
    if (!cur) {
      this.win();
      return;
    }
    if (this.wave >= cur.waves.length) {
      if (this.levelIndex + 1 >= LEVEL_COUNT) {
        this.win();
        return;
      }
      this.warehouse = Math.min(this.warehouseMax, this.warehouse + 6);
      if (this.player.bombs < 2 + this.save.upgrades.bombs)
        this.player.bombs += 1;
      this.levelIndex += 1;
      this.wave = 0;
    }
    const lvl = LEVELS[this.levelIndex]!;
    this.wave += 1;
    const wv = lvl.waves[this.wave - 1];
    if (!wv) {
      this.win();
      return;
    }
    this.bossWave = Boolean(wv.boss);
    this.spawnQ = [];
    this.spawnClock = 0;
    this.waveClearT = 0;
    this.mapIndex = this.levelIndex;
    this.scrollSpeed = lvl.scroll;
    if (wv.boss) this.banner = `БОСС · ${lvl.name}`;
    else if (this.wave === 1) this.banner = `УРОВЕНЬ ${lvl.id} · ${lvl.name}`;
    else this.banner = `ВОЛНА ${this.wave}`;
    this.bannerT = wv.boss ? 2.8 : 2.2;
    this.sfx.wave();
    const scale = wv.boss ? lvl.hpScale : lvl.hpScale;
    const add = (t: number, fn: () => void) => this.spawnQ.push({ t, fn });
    const api: Spawner = {
      W,
      line: (kind, n, gap = 70, k = scale) => this.line(kind, n, gap, k),
      spawn: (kind, x, y = -50, k?: number) => {
        const used = k ?? (kind === "boss" ? lvl.bossScale : scale);
        this.spawn(kind, x, y, used);
      },
    };
    wv.script(add, api, scale);
    this.emit();
  }
  private line(kind: EnemyKind, n: number, yGap: number, scale: number) {
    const pad = 50;
    for (let i = 0; i < n; i++) {
      const x = pad + (332 * (i + 0.5)) / n;
      this.spawn(kind, x, -40 - (i % 2) * (yGap * 0.25), scale);
    }
  }
  private spawn(kind: EnemyKind, x: number, y: number, scale = 1) {
    const slot = this.enemies.find((e) => !e.alive);
    if (!slot) return;
    const bossId = kind === "boss" ? (LEVELS[this.levelIndex]?.boss ?? "hub") : "";
    const st = kind === "boss" ? BOSS_STATS[bossId || "hub"] : ENEMY_STATS[kind];
    slot.alive = true;
    slot.kind = kind;
    slot.bossId = bossId;
    slot.x = x;
    slot.y = y;
    slot.vx = 0;
    slot.vy =
      kind === "kamikaze" ? 210
      : kind === "fast" ? 188
      : kind === "swarm" ? 145
      : kind === "sniper" ? 46
      : kind === "twin" ? 72
      : kind === "heavy" ? 52
      : kind === "boss" ? 42
      : kind === "elite" ? 70
      : 92;
    slot.r = st.r;
    slot.maxHp = Math.round(st.hp * scale);
    slot.hp = slot.maxHp;
    slot.shield =
      kind === "shield"
        ? Math.round(16 * scale)
        : kind === "boss"
          ? Math.round(50 * scale)
          : 0;
    slot.t = 0;
    slot.fire = 0.4 + Math.random() * 0.6;
    slot.phase = 0;
    slot.score = st.score;
    slot.bob = Math.random() * Math.PI * 2;
  }
  private updateSpawns(dt: number) {
    this.spawnClock += dt;
    this.spawnQ = this.spawnQ.filter((s) => {
      if (this.spawnClock >= s.t) {
        s.fn();
        return false;
      }
      return true;
    });
  }
  private updateEnemies(dt: number) {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.t += dt;
      e.bob += dt * 4;
      e.fire -= dt;
      switch (e.kind) {
        case "regular":
          e.x += Math.sin(e.t * 2.2 + e.bob) * 48 * dt;
          e.y += e.vy * dt;
          if (e.fire <= 0) {
            e.fire = 1.15;
            this.shot(false, "orb", e.x, e.y + 16, 0, 260, 6, 1);
          }
          break;
        case "fast":
          e.x += Math.sin(e.t * 5.4) * 150 * dt;
          e.y += e.vy * dt;
          if (e.fire <= 0) {
            e.fire = 0.72;
            this.shot(false, "orb", e.x, e.y + 12, -70, 320, 5, 1);
            this.shot(false, "orb", e.x, e.y + 12, 70, 320, 5, 1);
          }
          break;
        case "heavy":
          e.y += (e.y < 160 ? 62 : 20) * dt;
          if (e.fire <= 0) {
            e.fire = 1.05;
            this.shot(false, "heavy", e.x, e.y + 20, 0, 230, 8, 1);
            this.shot(false, "heavy", e.x - 14, e.y + 16, -55, 210, 7, 1);
            this.shot(false, "heavy", e.x + 14, e.y + 16, 55, 210, 7, 1);
          }
          break;
        case "shield":
          e.x += Math.sin(e.t * 1.6) * 80 * dt;
          e.y += 68 * dt;
          if (e.fire <= 0) {
            e.fire = 1.15;
            this.shot(false, "orb", e.x, e.y + 18, 0, 240, 6, 1);
          }
          break;
        case "bomber":
          e.y += 58 * dt;
          if (e.fire <= 0) {
            e.fire = 1.35;
            this.shot(false, "bombshot", e.x, e.y + 18, 0, 155, 9, 2);
            this.shot(false, "bombshot", e.x - 16, e.y + 10, -40, 145, 8, 2);
            this.shot(false, "bombshot", e.x + 16, e.y + 10, 40, 145, 8, 2);
          }
          break;
        case "elite":
          e.x += Math.sin(e.t * 1.8) * 100 * dt;
          e.y += e.y < 140 ? 78 * dt : Math.sin(e.t * 2) * 22 * dt;
          if (e.fire <= 0) {
            e.fire = 0.62;
            const ang = Math.atan2(p.y - e.y, p.x - e.x);
            this.shot(
              false,
              "orb",
              e.x,
              e.y + 10,
              Math.cos(ang) * 280,
              Math.sin(ang) * 280,
              6,
              1,
            );
            this.shot(false, "rocket", e.x, e.y + 8, 0, 190, 7, 2);
          }
          break;
        case "kamikaze": {
          const ang = Math.atan2(p.y - e.y, p.x - e.x);
          e.x += Math.cos(ang) * 160 * dt;
          e.y += Math.max(140, Math.sin(ang) * 220) * dt;
          break;
        }
        case "sniper":
          if (e.y < 128) e.y += 50 * dt;
          else {
            e.x += Math.sin(e.t * 0.9) * 55 * dt;
            e.y = 128 + Math.sin(e.t * 1.4) * 8;
            e.x = clamp(e.x, 40, 392);
          }
          if (e.fire <= 0) {
            e.fire = 0.95;
            const ang = Math.atan2(p.y - e.y, p.x - e.x);
            this.shot(false, "heavy", e.x, e.y + 12, Math.cos(ang) * 340, Math.sin(ang) * 340, 7, 1);
          }
          break;
        case "swarm":
          e.x += Math.sin(e.t * 6 + e.bob) * 160 * dt;
          e.y += e.vy * dt;
          if (e.fire <= 0) {
            e.fire = 1.6;
            this.shot(false, "orb", e.x, e.y + 8, 0, 240, 4, 1);
          }
          break;
        case "twin":
          e.x += Math.sin(e.t * 1.5) * 90 * dt;
          e.y += e.vy * dt;
          if (e.fire <= 0) {
            e.fire = 0.85;
            this.shot(false, "orb", e.x - 16, e.y + 10, -90, 250, 6, 1);
            this.shot(false, "orb", e.x + 16, e.y + 10, 90, 250, 6, 1);
          }
          break;
        case "boss":
          this.runBoss(e, dt);
          break;
      }
      if (e.y > 792) {
        if (e.kind !== "boss") {
          const leak =
            e.kind === "bomber" ? 20
            : e.kind === "heavy" ? 15
            : e.kind === "elite" ? 12
            : e.kind === "twin" ? 11
            : e.kind === "shield" ? 10
            : e.kind === "kamikaze" ? 9
            : e.kind === "sniper" ? 8
            : e.kind === "swarm" ? 4
            : 7;
          this.hurtWarehouse(leak);
        }
        e.alive = false;
      }
    }
  }
  private runBoss(e: Enemy, dt: number) {
    const p = this.player;
    const id = e.bossId || "hub";
    const phase = e.hp < e.maxHp * 0.32 ? 2 : e.hp < e.maxHp * 0.65 ? 1 : 0;
    const hold = id === "rail" ? 108 : id === "night" ? 100 : 118;
    if (e.y < hold) e.y += 58 * dt;
    else if (id === "night") {
      e.x += Math.sin(e.t * 1.6) * 160 * dt;
      e.y = hold + Math.sin(e.t * 2.2) * 22;
    } else if (id === "rail") {
      e.x += Math.sin(e.t * 0.55) * 140 * dt;
      e.y = hold + Math.sin(e.t * 0.8) * 10;
    } else {
      e.x += Math.sin(e.t * 0.85) * 110 * dt;
      e.y = hold + Math.sin(e.t * 1.1) * 16;
    }
    e.x = clamp(e.x, 70, 362);
    if (e.fire > 0) return;
    if (id === "yard") {
      e.fire = phase === 2 ? 0.4 : 0.7;
      for (let i = -2; i <= 2; i++)
        this.shot(false, "orb", e.x + i * 16, e.y + 28, i * 45, 250, 6, 1);
    } else if (id === "docks") {
      e.fire = 0.55;
      this.shot(false, "bombshot", e.x - 22, e.y + 24, -30, 150, 9, 2);
      this.shot(false, "bombshot", e.x + 22, e.y + 24, 30, 150, 9, 2);
      if (phase > 0) this.shot(false, "bombshot", e.x, e.y + 28, 0, 160, 9, 2);
    } else if (id === "cold") {
      e.fire = 0.7;
      this.shot(false, "heavy", e.x, e.y + 22, 0, 200, 9, 1);
      this.shot(false, "heavy", e.x - 18, e.y + 18, -70, 190, 8, 1);
      this.shot(false, "heavy", e.x + 18, e.y + 18, 70, 190, 8, 1);
    } else if (id === "night") {
      e.fire = 0.42;
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      this.shot(false, "orb", e.x - 12, e.y + 10, Math.cos(ang - 0.12) * 320, Math.sin(ang - 0.12) * 320, 6, 1);
      this.shot(false, "orb", e.x + 12, e.y + 10, Math.cos(ang + 0.12) * 320, Math.sin(ang + 0.12) * 320, 6, 1);
    } else if (id === "crates") {
      e.fire = 0.5;
      this.shot(false, "bombshot", e.x - 28, e.y + 20, -40, 145, 9, 2);
      this.shot(false, "bombshot", e.x, e.y + 24, 0, 155, 9, 2);
      this.shot(false, "bombshot", e.x + 28, e.y + 20, 40, 145, 9, 2);
      if (phase === 2) {
        this.shot(false, "bombshot", e.x - 14, e.y + 16, -20, 165, 8, 2);
        this.shot(false, "bombshot", e.x + 14, e.y + 16, 20, 165, 8, 2);
      }
    } else if (id === "fleet") {
      e.fire = 0.48;
      this.shot(false, "rocket", e.x - 26, e.y, -20, 170, 8, 2);
      this.shot(false, "rocket", e.x + 26, e.y, 20, 170, 8, 2);
      this.shot(false, "orb", e.x, e.y + 22, 0, 240, 7, 1);
    } else if (id === "build") {
      e.fire = 0.9;
      this.shot(false, "heavy", e.x, e.y + 24, 0, 210, 8, 1);
      this.shot(false, "heavy", e.x - 20, e.y + 18, -80, 180, 7, 1);
      this.shot(false, "heavy", e.x + 20, e.y + 18, 80, 180, 7, 1);
      if (phase === 2) this.spawn("swarm", e.x, e.y + 36, LEVELS[this.levelIndex]?.hpScale ?? 1);
    } else if (id === "rail") {
      e.fire = phase === 2 ? 0.28 : 0.45;
      for (let i = -3; i <= 3; i++)
        this.shot(false, "orb", e.x + i * 14, e.y + 22, 0, 260, 6, 1);
    } else if (id === "roof") {
      e.fire = 0.55;
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      this.shot(false, "heavy", e.x, e.y + 16, Math.cos(ang) * 330, Math.sin(ang) * 330, 8, 1);
      this.shot(false, "bombshot", e.x - 20, e.y + 14, -15, 140, 8, 2);
      this.shot(false, "bombshot", e.x + 20, e.y + 14, 15, 140, 8, 2);
    } else {
      e.fire = phase === 2 ? 0.22 : phase === 1 ? 0.38 : 0.52;
      if (phase === 0) {
        for (let i = -2; i <= 2; i++)
          this.shot(false, "orb", e.x + i * 18, e.y + 30, i * 55, 270, 7, 1);
      } else if (phase === 1) {
        const ang = Math.atan2(p.y - e.y, p.x - e.x);
        for (let i = -2; i <= 2; i++) {
          const a = ang + i * 0.2;
          this.shot(false, "heavy", e.x, e.y + 24, Math.cos(a) * 300, Math.sin(a) * 300, 8, 1);
        }
        this.shot(false, "rocket", e.x - 30, e.y, -30, 180, 8, 2);
        this.shot(false, "rocket", e.x + 30, e.y, 30, 180, 8, 2);
        this.shot(false, "bombshot", e.x, e.y + 20, 0, 150, 9, 2);
      } else {
        for (let i = 0; i < 10; i++) {
          const a = e.t * 2.4 + (i * Math.PI) / 5;
          this.shot(false, "orb", e.x, e.y + 10, Math.cos(a) * 250, Math.sin(a) * 250, 6, 1);
        }
        this.shot(false, "bombshot", e.x - 24, e.y + 16, -20, 160, 9, 2);
        this.shot(false, "bombshot", e.x + 24, e.y + 16, 20, 160, 9, 2);
      }
    }
  }
  private updateBullets(dt: number) {
    const p = this.player;
    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.life -= dt;
      if (b.kind === "rocket" && b.friendly) {
        let tx = p.x;
        let ty = -40;
        let best = 1e9;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
          if (d < best) {
            best = d;
            tx = e.x;
            ty = e.y;
          }
        }
        const ang = Math.atan2(ty - b.y, tx - b.x);
        b.vx += Math.cos(ang) * 900 * dt;
        b.vy += Math.sin(ang) * 900 * dt;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 520) {
          b.vx = (b.vx / sp) * 520;
          b.vy = (b.vy / sp) * 520;
        }
        b.rot = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      } else b.rot = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -30 || b.x > 462 || b.y < -40 || b.y > 808) {
        if (!b.friendly && b.kind === "bombshot" && b.y > 738)
          this.hurtWarehouse(18);
        b.alive = false;
      }
    }
  }
  private updatePickups(dt: number) {
    const p = this.player;
    for (const u of this.pickups) {
      if (!u.alive) continue;
      u.t += dt;
      u.y += u.vy * dt;
      u.x += Math.sin(u.t * 3) * 20 * dt;
      if (u.y > 788) u.alive = false;
      if (Math.hypot(u.x - p.x, u.y - p.y) < 28) {
        u.alive = false;
        this.collect(u.kind);
      }
    }
  }
  private collect(kind: PickupKind) {
    this.sfx.pickup();
    haptic("success");
    if (kind === "weapon") {
      this.player.weapon = Math.min(5, this.player.weapon + 1);
      this.float(this.player.x, this.player.y - 30, "ОГОНЬ +");
    } else if (kind === "shield") {
      this.player.shield = Math.max(this.player.shield, 7);
      this.float(this.player.x, this.player.y - 30, "ЩИТ");
    } else if (kind === "bomb") {
      this.player.bombs = Math.min(6, this.player.bombs + 1);
      this.float(this.player.x, this.player.y - 30, "БОМБА");
    } else if (kind === "heart") {
      this.player.lives = Math.min(3 + this.save.upgrades.lives, this.player.lives + 1);
      this.float(this.player.x, this.player.y - 30, "+ЖИЗНЬ");
    } else {
      this.coins += 5;
      this.score += 25;
      this.float(this.player.x, this.player.y - 30, "+БАЛЛЫ");
    }
    this.emit();
  }
  private updateFx(dt: number) {
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
      if (p.life <= 0) p.alive = false;
    }
    for (const b of this.booms) {
      if (!b.alive) continue;
      b.t += dt * 3.2;
      if (b.t >= 1) b.alive = false;
    }
    for (const f of this.floaters) {
      if (!f.alive) continue;
      f.t += dt;
      f.y -= 28 * dt;
      if (f.t > 0.9) f.alive = false;
    }
  }
  private collide() {
    const p = this.player;
    for (const b of this.bullets) {
      if (!b.alive || !b.friendly) continue;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) {
          b.alive = false;
          this.hurtEnemy(e, b.dmg, b.kind === "rocket");
          break;
        }
      }
    }
    for (const b of this.bullets) {
      if (!b.alive || b.friendly) continue;
      if (p.inv > 0) continue;
      if (Math.hypot(b.x - p.x, b.y - p.y) < p.r + b.r) {
        b.alive = false;
        this.hurtPlayer();
      }
    }
    for (const e of this.enemies) {
      if (!e.alive || p.inv > 0) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r * 0.7) {
        this.hurtPlayer();
        this.hurtEnemy(e, 6, false);
      }
    }
  }
  private hurtEnemy(e: Enemy, dmg: number, heavy: boolean) {
    if (e.shield > 0) {
      e.shield -= dmg;
      this.spark(e.x, e.y, "#4ec4ff", 6);
      if (e.shield > 0) return;
      dmg = Math.abs(e.shield);
    }
    e.hp -= dmg;
    this.spark(e.x, e.y, "#ff6a3d", 5);
    if (e.hp <= 0) {
      e.alive = false;
      this.score += e.score;
      const pts =
        e.kind === "boss" ? 12
        : e.kind === "elite" ? 5
        : e.kind === "heavy" || e.kind === "bomber" ? 3
        : e.kind === "sniper" || e.kind === "twin" ? 3
        : e.kind === "shield" || e.kind === "kamikaze" ? 2
        : 1;
      this.coins += pts;
      this.boom(e.x, e.y, e.kind === "boss" ? 160 : 56);
      this.sfx.explosion(e.kind === "boss" || e.kind === "elite");
      haptic(e.kind === "boss" ? "heavy" : "medium");
      this.trauma = Math.min(1, this.trauma + (e.kind === "boss" ? 0.9 : 0.28));
      this.hitstop = e.kind === "boss" ? 0.12 : 0.03;
      this.maybeDrop(e);
      this.float(e.x, e.y, `+${e.score}`);
      this.emit();
    }
  }
  private maybeDrop(e: Enemy) {
    const roll = Math.random();
    let kind: PickupKind | null = null;
    if (e.kind === "boss") kind = "weapon";
    else if (roll < 0.04) kind = "weapon";
    else if (roll < 0.08) kind = "shield";
    else if (roll < 0.11) kind = "bomb";
    else if (roll < 0.13) kind = "heart";
    else if (roll < 0.2) kind = "coin";
    if (!kind) return;
    const u = this.pickups.find((p) => !p.alive);
    if (!u) return;
    u.alive = true;
    u.kind = kind;
    u.x = e.x;
    u.y = e.y;
    u.vy = 70;
    u.t = 0;
  }
  private hurtPlayer() {
    const p = this.player;
    if (p.inv > 0) return;
    if (p.shield > 0) {
      p.shield = 0;
      p.inv = 0.45;
      this.sfx.hit();
      this.spark(p.x, p.y, "#4ec4ff", 14);
      return;
    }
    p.lives -= 1;
    p.inv = 1.05;
    p.flash = 0.2;
    p.weapon = Math.max(1, p.weapon - 1);
    this.sfx.hit();
    this.boom(p.x, p.y, 48);
    this.trauma = Math.min(1, this.trauma + 0.55);
    haptic("error");
    this.emit();
  }
  private hurtWarehouse(n: number) {
    const resist = 1 - 0.1 * this.save.upgrades.armor;
    this.warehouse = Math.max(0, this.warehouse - n * resist);
    this.trauma = Math.min(1, this.trauma + 0.35);
    this.sfx.explosion(false);
    this.emit();
  }
  private checkWave() {
    if (this.bossWave) {
      const bossAlive = this.enemies.some((e) => e.alive && e.kind === "boss");
      if (!bossAlive && this.spawnClock > 0.8) this.spawnQ = [];
    }
    if (this.spawnQ.length) return;
    if (this.enemies.some((e) => e.alive)) return;
    this.waveClearT += FIXED;
    if (this.waveClearT <= 0.85) return;
    this.nextWave();
  }
  private cashOut() {
    if (this.cashed) return;
    this.cashed = true;
    this.save.bank += this.coins;
    writeSave(this.save);
  }
  private win() {
    this.mode = "win";
    this.cashOut();
    if (this.score > this.save.bestScore) this.save.bestScore = this.score;
    if (LEVEL_COUNT > this.save.bestWave) this.save.bestWave = LEVEL_COUNT;
    writeSave(this.save);
    haptic("success");
    this.banner = "СКЛАД СПАСЁН";
    this.bannerT = 3;
    this.emit();
  }
  private gameOver() {
    this.mode = "over";
    this.cashOut();
    if (this.score > this.save.bestScore) this.save.bestScore = this.score;
    if (this.levelIndex + 1 > this.save.bestWave) this.save.bestWave = this.levelIndex + 1;
    writeSave(this.save);
    haptic("error");
    this.emit();
  }
  private shot(friendly: boolean, kind: BulletKind, x: number, y: number, vx: number, vy: number, r: number, dmg: number) {
    const b = this.bullets.find((s) => !s.alive);
    if (!b) return;
    b.alive = true;
    b.friendly = friendly;
    b.kind = kind;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.r = r;
    b.dmg = dmg;
    b.life = kind === "rocket" ? 2.4 : 1.8;
    b.rot = 0;
  }
  private boom(x: number, y: number, size: number) {
    const b = this.booms.find((s) => !s.alive);
    if (b) {
      b.alive = true;
      b.x = x;
      b.y = y;
      b.t = 0;
      b.size = size;
    }
    this.spark(x, y, "#ff7a3c", 16);
  }
  private spark(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const p = this.particles.find((s) => !s.alive);
      if (!p) break;
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 180;
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = 0.25 + Math.random() * 0.35;
      p.max = p.life;
      p.size = 1.5 + Math.random() * 3;
      p.color = color;
    }
  }
  private float(x: number, y: number, text: string) {
    const f = this.floaters.find((s) => !s.alive);
    if (!f) return;
    f.alive = true;
    f.x = x;
    f.y = y;
    f.t = 0;
    f.text = text;
  }
  private draw() {
    const ctx = this.ctx;
    const { cssW, cssH, scale } = this.view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const shake = this.trauma * this.trauma;
    const ox = (Math.random() * 2 - 1) * 14 * shake;
    const oy = (Math.random() * 2 - 1) * 14 * shake;
    ctx.setTransform(
      scale,
      0,
      0,
      scale,
      this.view.x + ox * scale,
      this.view.y + oy * scale,
    );
    this.drawBg();
    const assets = this.assets;
    const frame = Math.floor(this.time * 8) % 4;
    for (const u of this.pickups) {
      if (!u.alive || !assets) continue;
      if (u.kind === "shield" && assets.shield)
        drawSheet(ctx, assets.shield, frame, u.x, u.y, 36, 36);
      else if (u.kind === "bomb")
        drawSheet(ctx, assets.bomb, frame, u.x, u.y, 28, 28);
      else if (u.kind === "coin")
        drawSheet(ctx, assets.apelsin, frame, u.x, u.y, 22, 32);
      else ctx.drawImage(assets.crate, u.x - 16, u.y - 16, 32, 32);
    }
    for (const e of this.enemies) {
      if (!e.alive || !assets) continue;
      const st = e.kind === "boss" && e.bossId ? BOSS_STATS[e.bossId] : ENEMY_STATS[e.kind];
      const sh =
        e.kind === "boss" && e.bossId && assets.bosses[e.bossId]
          ? assets.bosses[e.bossId]
          : assets.drones[e.kind];
      if (sh)
        drawSheet(ctx, sh, frame, e.x, e.y + Math.sin(e.bob) * 2, st.w, st.h);
      if (e.shield > 0 && assets.shield)
        drawSheet(
          ctx,
          assets.shield,
          frame,
          e.x,
          e.y,
          st.w * 1.25,
          st.h * 1.25,
        );
      if (e.kind === "boss" || e.hp < e.maxHp) {
        const bw = st.w * 0.8;
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(e.x - bw / 2, e.y - st.h / 2 - 10, bw, 4);
        ctx.fillStyle = "#e30613";
        ctx.fillRect(
          e.x - bw / 2,
          e.y - st.h / 2 - 10,
          bw * clamp(e.hp / e.maxHp, 0, 1),
          4,
        );
      }
    }
    for (const b of this.bullets) {
      if (!b.alive || !assets) continue;
      if ((b.kind === "laser" || b.kind === "scatter") && b.friendly) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        drawSheet(ctx, assets.laser, frame, b.x, b.y, 14, 34, b.rot);
        ctx.restore();
        drawSheet(ctx, assets.laser, frame, b.x, b.y, 13, 32, b.rot);
      } else if (b.kind === "laser" || b.kind === "scatter")
        drawSheet(ctx, assets.laser, frame, b.x, b.y, 10, 28, b.rot);
      else if (b.kind === "rocket")
        drawSheet(ctx, assets.rocket, frame, b.x, b.y, 18, 32, b.rot);
      else if (b.kind === "bombshot")
        drawSheet(ctx, assets.bomb, frame, b.x, b.y, 22, 22);
      else
        drawSheet(
          ctx,
          assets.orb,
          frame,
          b.x,
          b.y,
          b.kind === "heavy" ? 22 : 16,
          b.kind === "heavy" ? 22 : 16,
        );
    }
    if (assets && (this.mode === "playing" || this.mode === "paused")) {
      const p = this.player;
      if (p.inv <= 0 || Math.floor(this.time * 16) % 2 === 0) {
        if (p.shield > 0)
          drawSheet(ctx, assets.shield, frame, p.x, p.y, 86, 86);
        ctx.save();
        if (p.flash > 0) ctx.globalCompositeOperation = "lighter";
        const skin = assets.skins[this.save.skin] ?? assets.player;
        drawSheet(ctx, skin, frame, p.x, p.y, 78, 86, p.bank);
        ctx.restore();
      }
    }
    for (const b of this.booms) {
      if (!b.alive || !assets) continue;
      const f = Math.min(3, Math.floor(b.t * 4));
      drawSheet(ctx, assets.explode, f, b.x, b.y, b.size, b.size);
    }
    for (const p of this.particles) {
      if (!p.alive) continue;
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }
    ctx.font = "600 12px Manrope, sans-serif";
    ctx.textAlign = "center";
    for (const f of this.floaters) {
      if (!f.alive) continue;
      ctx.globalAlpha = 1 - f.t / 0.9;
      ctx.fillStyle = "#f4f1ea";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
    if (this.bannerT > 0 && this.mode === "playing") {
      ctx.globalAlpha = Math.min(1, this.bannerT, 2.1 - this.bannerT);
      ctx.fillStyle = "rgba(7,11,20,0.55)";
      ctx.fillRect(0, 768 * 0.38, 432, 52);
      ctx.fillStyle = "#f4f1ea";
      ctx.font = "600 22px Unbounded, Manrope, sans-serif";
      ctx.fillText(this.banner, 216, 325.84000000000003);
      ctx.globalAlpha = 1;
    }
  }
  private drawBg() {
    const ctx = this.ctx;
    const maps = this.assets?.maps;
    if (!maps?.length) {
      ctx.fillStyle = "#121a28";
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const img = maps[this.mapIndex] ?? maps[0]!;
    const tileH = H;
    const y = this.bgY % tileH;
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, -y, W, tileH);
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, -y + tileH, W, tileH);
    const tint = LEVELS[this.mapIndex]?.tint ?? "rgba(7,11,20,0.18)";
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
  }
  private clientToWorld(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (cx - r.left - this.view.x) / this.view.scale,
      y: (cy - r.top - this.view.y) / this.view.scale,
    };
  }
  grabAt(cx: number, cy: number) {
    const w = this.clientToWorld(cx, cy);
    this.input.setGrab(this.player.x, this.player.y, w.x, w.y);
  }
  private resize = () => {
    const parent = this.canvas.parentElement ?? this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = parent.clientWidth || window.innerWidth;
    const cssH = parent.clientHeight || window.innerHeight;
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    const scale = Math.min(cssW / 432, cssH / 768);
    this.view = {
      scale: scale * dpr,
      x: ((cssW - 432 * scale) / 2) * dpr,
      y: ((cssH - 768 * scale) / 2) * dpr,
      cssW,
      cssH,
    };
  };
  private onVis = () => {
    if (document.hidden && this.mode === "playing") this.pause();
    this.sfx.resume();
  };
  private emit() {
    this.onHud({
      mode: this.mode,
      lives: this.player.lives,
      maxLives: 3 + this.save.upgrades.lives,
      score: this.score,
      coins: this.coins,
      bank: this.save.bank,
      bombs: this.player.bombs,
      wave: this.wave,
      wavesInLevel: LEVELS[this.levelIndex]?.waves.length ?? 4,
      level: this.levelIndex + 1,
      weapon: this.player.weapon,
      shield: this.player.shield,
      warehouse: this.warehouse,
      warehouseMax: this.warehouseMax,
      best: this.save.bestScore,
      waveBanner: this.bannerT > 0 ? this.banner : "",
      levelName: LEVELS[this.levelIndex]?.name ?? LEVELS[0]!.name,
      levelCount: LEVEL_COUNT,
      muted: this.muted,
      ready: this.mode !== "boot",
      upgrades: this.save.upgrades,
      skin: this.save.skin,
      ownedSkins: this.save.ownedSkins,
    });
  }
  private wireControlsTest() {
    window.__controlsTest = {
      getYaw: () => -this.player.x / 80,
      getSpeed: () => Math.hypot(this.player.vx, this.player.vy) + 50,
          setKeys: (codes: string[]) => {
        this.input.qaKeys = codes.length ? new Set(codes) : null;
      },
    };
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
    };
  }
}
