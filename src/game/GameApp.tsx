import { useEffect, useRef, useState } from "react";
import {
  Heart,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Bomb,
  ChevronLeft,
  Crosshair,
  Shield,
  Zap,
  Shirt,
} from "lucide-react";
import { Game, type HudState } from "./engine";
import { initTelegram } from "./telegram";
import { LEVEL_COUNT } from "./levels";
import { EMPTY_UPGRADES, SKINS, UPGRADES, maxUpgrade, upgradeCost, type UpgradeId } from "./shop";

const idleHud: HudState = {
  mode: "boot",
  lives: 3,
  maxLives: 3,
  score: 0,
  coins: 0,
  bank: 60,
  bombs: 2,
  wave: 0,
  wavesInLevel: 4,
  level: 1,
  weapon: 1,
  shield: 0,
  warehouse: 100,
  warehouseMax: 100,
  best: 0,
  waveBanner: "",
  levelName: "ДВОР СКЛАДА",
  levelCount: LEVEL_COUNT,
  muted: false,
  ready: false,
  upgrades: { ...EMPTY_UPGRADES },
  skin: "default",
  ownedSkins: ["default"],
};

const UPGRADE_ICON: Record<UpgradeId, typeof Zap> = {
  caliber: Crosshair,
  weapon: Zap,
  bombs: Bomb,
  armor: Shield,
  lives: Heart,
};

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="var(--color-primary)" />
      <path d="M42 10c6 4 10 8 11 14-8-1-14-4-18-9 3-2 5-4 7-5z" fill="var(--color-accent)" />
      <text
        x="32"
        y="44"
        textAnchor="middle"
        fill="var(--color-primary-fg)"
        fontFamily="Unbounded, Manrope, sans-serif"
        fontSize="28"
        fontWeight="700"
      >
        5
      </text>
    </svg>
  );
}

function ApelsinMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--color-coin)" />
      <path d="M7 14c0 6.2 4 11 9 11s9-4.8 9-11H7z" fill="#fff" />
    </svg>
  );
}

function ApelsinChip({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-elevated px-3 py-1.5">
      <ApelsinMark className="size-5" />
      <span className="font-display text-sm font-semibold tabular-nums text-coin">{value}</span>
    </div>
  );
}

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudState>(idleHud);
  const [tgName, setTgName] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tg = initTelegram();
    const name = tg?.initDataUnsafe?.user?.first_name;
    if (name) setTgName(name);
    const game = new Game(canvas, setHud);
    gameRef.current = game;
    void game.init();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const g = gameRef.current;
  const playing = hud.mode === "playing";
  const menu =
    hud.mode === "title" ||
    hud.mode === "paused" ||
    hud.mode === "over" ||
    hud.mode === "win" ||
    hud.mode === "boot" ||
    hud.mode === "shop";
  const warehousePct = hud.warehouseMax > 0 ? (hud.warehouse / hud.warehouseMax) * 100 : 0;

  return (
    <div className="flex h-dvh w-full items-center justify-center overflow-hidden bg-bg text-fg">
      <div
        className="relative overflow-hidden bg-bg"
        style={{
          width: "min(100vw, calc(100dvh * 432 / 768))",
          height: "min(100dvh, calc(100vw * 768 / 432))",
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

        {playing ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between gap-2">
              <div className="rounded-xl bg-bg/70 px-3 py-2">
                <div className="flex gap-1">
                  {Array.from({ length: hud.maxLives }).map((_, i) => (
                    <Heart
                      key={i}
                      className={`size-4 ${i < hud.lives ? "fill-heart text-heart" : "text-border"}`}
                      strokeWidth={2}
                    />
                  ))}
                </div>
                <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-elevated">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${warehousePct}%` }} />
                </div>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted">Склад</p>
              </div>
              <div className="text-center">
                <p className="font-display text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                  Ур. {hud.level}/{hud.levelCount}
                </p>
                <p className="font-display text-lg font-semibold tabular-nums">{hud.score}</p>
                <p className="max-w-28 truncate text-[10px] font-medium uppercase tracking-wider text-faint">
                  Волна {hud.wave}/{hud.wavesInLevel}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="rounded-xl bg-bg/70 px-3 py-2 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Баллы</p>
                  <p className="font-display text-sm font-semibold tabular-nums text-coin">{hud.coins}</p>
                </div>
                <button
                  type="button"
                  data-ui
                  className="pointer-events-auto flex size-11 items-center justify-center rounded-xl bg-surface text-fg"
                  onClick={() => g?.pause()}
                  aria-label="Пауза"
                >
                  <Pause className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div className="rounded-xl bg-bg/70 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Оружие</p>
                <div className="mt-1 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-4 rounded-full ${i < hud.weapon ? "bg-primary" : "bg-border"}`}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                data-ui
                className="pointer-events-auto flex h-14 min-w-14 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-primary-fg"
                onClick={() => g?.dropBomb()}
                aria-label="Бомба"
              >
                <Bomb className="size-5" />
                <span className="font-display text-lg font-semibold tabular-nums">{hud.bombs}</span>
              </button>
            </div>
          </div>
        ) : null}

        {menu ? (
          <div
            className={`absolute inset-0 z-20 flex flex-col overflow-hidden px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] ${
              hud.mode === "title" || hud.mode === "boot" ? "" : "bg-bg/85"
            }`}
          >
            {hud.mode === "paused" ? (
              <div className="m-auto w-full rounded-[28px] bg-surface p-6">
                <h2 className="font-display text-2xl font-semibold">Пауза</h2>
                <p className="mt-2 text-sm text-muted">
                  {hud.levelName} · волна {hud.wave}/{hud.wavesInLevel}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary font-medium text-primary-fg"
                    onClick={() => g?.resume()}
                  >
                    <Play className="size-4" />
                    Продолжить
                  </button>
                  <button
                    type="button"
                    className="flex h-12 items-center justify-center rounded-2xl border border-border font-medium"
                    onClick={() => g?.play()}
                  >
                    Начать заново
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 py-2 text-sm text-muted"
                    onClick={() => g?.toggleMute()}
                  >
                    {hud.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                    Звук
                  </button>
                </div>
              </div>
            ) : null}

            {hud.mode === "win" ? (
              <div className="m-auto w-full rounded-[28px] bg-surface p-6 text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">Миссия выполнена</p>
                <h2 className="mt-2 font-display text-2xl font-semibold">Склад спасён</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Все 10 уровней пройдены. Капитан держит периметр.
                </p>
                <p className="mt-4 font-display text-4xl font-semibold tabular-nums">{hud.score}</p>
                <p className="mt-1 text-sm text-coin">+{hud.coins} баллов Апельсина · на карте {hud.bank}</p>
                <p className="mt-1 text-sm text-muted">рекорд {hud.best}</p>
                <button
                  type="button"
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-display text-sm font-semibold text-primary-fg"
                  onClick={() => g?.play()}
                >
                  ЕЩЁ РЕЙС
                </button>
                <button
                  type="button"
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl border border-border font-medium"
                  onClick={() => g?.openShop()}
                >
                  Ангар
                </button>
              </div>
            ) : null}

            {hud.mode === "over" ? (
              <div className="m-auto w-full rounded-[28px] bg-surface p-6 text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">Миссия завершена</p>
                <h2 className="mt-2 font-display text-2xl font-semibold">Склад под ударом</h2>
                <p className="mt-4 font-display text-4xl font-semibold tabular-nums">{hud.score}</p>
                <p className="mt-1 text-sm text-coin">+{hud.coins} баллов Апельсина · на карте {hud.bank}</p>
                <p className="mt-1 text-sm text-muted">
                  Уровень {hud.level}/{LEVEL_COUNT} · рекорд {hud.best}
                </p>
                <button
                  type="button"
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-display text-sm font-semibold text-primary-fg"
                  onClick={() => g?.play()}
                >
                  ЕЩЁ РАЗ
                </button>
                <button
                  type="button"
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl border border-border font-medium"
                  onClick={() => g?.openShop()}
                >
                  Потратить в ангаре
                </button>
              </div>
            ) : null}

            {hud.mode === "shop" ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="flex size-11 items-center justify-center rounded-xl bg-surface"
                    onClick={() => g?.closeShop()}
                    aria-label="Назад"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <div className="text-center">
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">Ангар сети</p>
                    <h2 className="font-display text-lg font-semibold">Прокачка</h2>
                  </div>
                  <ApelsinChip value={hud.bank} />
                </div>
                <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">
                  <section>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Улучшения</p>
                    <div className="space-y-2">
                      {UPGRADES.map((item) => {
                        const level = hud.upgrades[item.id];
                        const max = maxUpgrade(item.id);
                        const cost = upgradeCost(item.id, level);
                        const Icon = UPGRADE_ICON[item.id];
                        const maxed = cost == null;
                        const can = !maxed && hud.bank >= cost;
                        return (
                          <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-elevated text-accent">
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-display text-sm font-semibold">{item.name}</p>
                              <p className="truncate text-xs text-muted">{item.hint}</p>
                              <div className="mt-1.5 flex gap-1">
                                {Array.from({ length: max }).map((_, i) => (
                                  <span
                                    key={i}
                                    className={`h-1.5 w-5 rounded-full ${i < level ? "bg-accent" : "bg-border"}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={maxed || !can}
                              className="min-w-16 rounded-xl bg-primary px-3 py-2 text-center font-display text-xs font-semibold text-primary-fg disabled:bg-elevated disabled:text-faint"
                              onClick={() => g?.buyUpgrade(item.id)}
                            >
                              {maxed ? "МАКС" : cost}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                  <section>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Скины</p>
                    <div className="grid grid-cols-3 gap-2">
                      {SKINS.map((skin) => {
                        const owned = hud.ownedSkins.includes(skin.id);
                        const on = hud.skin === skin.id;
                        const src =
                          `${import.meta.env.BASE_URL}game/` +
                          (skin.id === "gold"
                            ? "player-gold.png"
                            : skin.id === "night"
                              ? "player-night.png"
                              : "player.png");
                        return (
                          <button
                            key={skin.id}
                            type="button"
                            className={`rounded-2xl bg-surface p-2 text-left ${on ? "ring-2 ring-accent" : ""}`}
                            onClick={() => g?.buySkin(skin.id)}
                          >
                            <div className="relative aspect-square overflow-hidden rounded-xl bg-elevated">
                              <img
                                src={src}
                                alt=""
                                className="absolute left-0 top-0 h-[200%] w-[200%] max-w-none"
                              />
                            </div>
                            <p className="mt-2 truncate font-display text-[11px] font-semibold">{skin.name}</p>
                            <p className="truncate text-[10px] text-muted">
                              {on ? "Надет" : owned ? "Надеть" : `${skin.cost}`}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}

            {hud.mode === "title" || hud.mode === "boot" ? (
              <>
                <img
                  src={`${import.meta.env.BASE_URL}game/menu-poster.jpg?v=2`}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85" />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-center gap-2">
                    <LogoMark className="size-10 drop-shadow-lg" />
                    <div className="min-w-0 flex-1" />
                    <ApelsinChip value={hud.bank} />
                  </div>
                  <div className="flex-1" />
                  <div className="space-y-3">
                    <p className="text-sm leading-relaxed text-white/80">
                      {tgName ? `${tgName}, ` : null}
                      10 складов, на каждом несколько волн и босс. За дронов капают баллы карты Апельсин.
                    </p>
                    <p className="text-xs text-white/50">Рекорд: {hud.best} · WASD / стрелки · Пробел — бомба</p>
                    <button
                      type="button"
                      disabled={!hud.ready}
                      className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-display text-sm font-semibold tracking-wide text-primary-fg disabled:opacity-50"
                      onClick={() => g?.play()}
                    >
                      {hud.ready ? "В БОЙ" : "ЗАГРУЗКА СКЛАДА"}
                    </button>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/70"
                        onClick={() => g?.openShop()}
                      >
                        <Shirt className="size-4" />
                        Ангар
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/70"
                        onClick={() => g?.toggleMute()}
                      >
                        {hud.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                        {hud.muted ? "Звук выкл" : "Звук вкл"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
