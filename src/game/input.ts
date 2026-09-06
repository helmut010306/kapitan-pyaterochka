export type Actions = {
  moveX: number;
  moveY: number;
  bomb: boolean;
  bombPressed: boolean;
  pausePressed: boolean;
  pointer: boolean;
  pointerX: number;
  pointerY: number;
  grabOffsetX: number;
  grabOffsetY: number;
};

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "Space",
  "KeyP",
  "Escape",
  "KeyB",
]);

function radialDeadzone(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export class Input {
  keys = new Set<string>();
  qaKeys: Set<string> | null = null;
  private prevBomb = false;
  private prevPause = false;
  private pointers = new Map<number, { x: number; y: number }>();
  private dragId: number | null = null;
  grabOffsetX = 0;
  grabOffsetY = 0;
  private canvas: HTMLCanvasElement;
  private toWorld: (cx: number, cy: number) => { x: number; y: number };
  private getPlayer: () => { x: number; y: number };

  constructor(
    canvas: HTMLCanvasElement,
    toWorld: (cx: number, cy: number) => { x: number; y: number },
    getPlayer: () => { x: number; y: number },
  ) {
    this.canvas = canvas;
    this.toWorld = toWorld;
    this.getPlayer = getPlayer;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
  }


  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onBlur);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onBlur);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }

  setGrab(px: number, py: number, wx: number, wy: number) {
    this.grabOffsetX = px - wx;
    this.grabOffsetY = py - wy;
  }

  sample(): Actions {
    const keys = this.qaKeys ?? this.keys;
    let moveX = 0;
    let moveY = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) moveX -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) moveX += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) moveY -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) moveY += 1;

    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : [];
    if (pads) {
      for (const pad of pads) {
        if (!pad || pad.mapping !== "standard") continue;
        const stick = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
        moveX += stick.x;
        moveY += stick.y;
        if (pad.buttons[12]?.pressed) moveY -= 1;
        if (pad.buttons[13]?.pressed) moveY += 1;
        if (pad.buttons[14]?.pressed) moveX -= 1;
        if (pad.buttons[15]?.pressed) moveX += 1;
        if (pad.buttons[0]?.pressed) keys.add("_padBomb");
        if (pad.buttons[9]?.pressed) keys.add("_padPause");
      }
    }

    const mag = Math.hypot(moveX, moveY);
    if (mag > 1) {
      moveX /= mag;
      moveY /= mag;
    }

    const bombHeld = keys.has("Space") || keys.has("KeyB") || keys.has("_padBomb");
    const pauseHeld = keys.has("KeyP") || keys.has("Escape") || keys.has("_padPause");
    const bombPressed = bombHeld && !this.prevBomb;
    const pausePressed = pauseHeld && !this.prevPause;
    this.prevBomb = bombHeld;
    this.prevPause = pauseHeld;
    keys.delete("_padBomb");
    keys.delete("_padPause");

    let pointer = false;
    let pointerX = 0;
    let pointerY = 0;
    if (this.dragId !== null) {
      const p = this.pointers.get(this.dragId);
      if (p) {
        pointer = true;
        pointerX = p.x;
        pointerY = p.y;
      }
    }

    return {
      moveX,
      moveY,
      bomb: bombHeld,
      bombPressed,
      pausePressed,
      pointer,
      pointerX,
      pointerY,
      grabOffsetX: this.grabOffsetX,
      grabOffsetY: this.grabOffsetY,
    };
  }

  private onKeyDown(e: KeyboardEvent) {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    this.keys.add(e.code);
  }
  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }
  private onBlur() {
    this.keys.clear();
    this.pointers.clear();
    this.dragId = null;
  }

  private onPointerDown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-ui]")) return;
    const w = this.toWorld(e.clientX, e.clientY);
    this.pointers.set(e.pointerId, w);
    if (this.dragId === null) {
      this.dragId = e.pointerId;
      const p = this.getPlayer();
      this.grabOffsetX = p.x - w.x;
      this.grabOffsetY = p.y - w.y;
      this.canvas.setPointerCapture(e.pointerId);
    }

  }
  private onPointerMove(e: PointerEvent) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, this.toWorld(e.clientX, e.clientY));
  }
  private onPointerUp(e: PointerEvent) {
    this.pointers.delete(e.pointerId);
    if (this.dragId === e.pointerId) this.dragId = null;
  }
}
