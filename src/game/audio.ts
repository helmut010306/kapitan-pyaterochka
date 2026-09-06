export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private muted = false;
  private musicTimer = 0;
  private unlocked = false;

  unlock() {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: "interactive" });
    this.master = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.sfx.gain.value = 0.28;
    this.music.gain.value = 0.12;
    this.sfx.connect(this.master);
    this.music.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.master.gain.value = this.muted ? 0 : 1;
    void this.ctx.resume();
    this.unlocked = true;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.03);
    }
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  shoot() {
    this.blip(880, 0.045, "square", 0.09, 0.08);
  }

  rocket() {
    this.sweep(220, 90, 0.22, 0.12);
  }

  explosion(heavy = false) {
    this.noise(heavy ? 0.28 : 0.14, heavy ? 0.22 : 0.12);
    this.blip(heavy ? 90 : 140, heavy ? 0.22 : 0.12, "sawtooth", 0.18, 0.02);
  }

  hit() {
    this.blip(180, 0.09, "square", 0.16, 0.04);
  }

  pickup() {
    this.blip(523, 0.07, "sine", 0.12, 0.05);
    this.blip(784, 0.1, "sine", 0.1, 0.08);
  }

  bomb() {
    this.noise(0.4, 0.32);
    this.sweep(140, 40, 0.45, 0.25);
  }

  wave() {
    this.blip(392, 0.12, "triangle", 0.1, 0.04);
    this.blip(523, 0.16, "triangle", 0.1, 0.1);
  }

  tickMusic(dt: number) {
    if (!this.ctx || this.muted) return;
    this.musicTimer += dt;
    if (this.musicTimer < 0.5) return;
    this.musicTimer = 0;
    const t = this.ctx.currentTime;
    const notes = [110, 146.8, 130.8, 164.8];
    const n = notes[Math.floor(Math.random() * notes.length)] ?? 110;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = n;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
    o.connect(g);
    g.connect(this.music!);
    o.start(t);
    o.stop(t + 0.48);
  }

  private blip(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slide: number,
  ) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    const f = freq * (0.94 + Math.random() * 0.12);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfx!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private sweep(from: number, to: number, dur: number, vol: number) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfx!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number) {
    if (!this.ctx || this.muted) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx!);
    src.start();
  }
}
