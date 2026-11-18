class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicPlaying = false;

  constructor() {
    try {
      const saved = localStorage.getItem('kc_muted');
      if (saved === 'true') this.muted = true;
    } catch {
      // ignore
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    try {
      localStorage.setItem('kc_muted', String(mute));
    } catch {
      // ignore
    }
    if (mute) {
      this.stopMusic();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private tone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'square',
    gainVal = 0.08,
    delay = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private noise(duration: number, gainVal = 0.1, highpass = 400) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const sampleCount = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp((-i / sampleCount) * 3.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = highpass > 800 ? 'highpass' : 'lowpass';
    filter.frequency.value = highpass;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  public sword(step: number) {
    const base = step === 2 ? 420 : 540 + step * 70;
    this.tone(base, 140, 0.09, 'sawtooth', 0.06);
    this.noise(0.06, 0.05, 1600);
  }

  public hit(heavy = false) {
    this.tone(heavy ? 180 : 240, 55, heavy ? 0.16 : 0.1, 'square', heavy ? 0.11 : 0.07);
    this.noise(heavy ? 0.12 : 0.06, heavy ? 0.11 : 0.06, 700);
  }

  public playerHurt() {
    this.tone(280, 95, 0.18, 'sawtooth', 0.11);
    this.tone(190, 75, 0.2, 'square', 0.08, 0.04);
  }

  public dash() {
    this.tone(260, 520, 0.09, 'triangle', 0.07);
    this.noise(0.08, 0.045, 1400);
  }

  public potBreak() {
    this.tone(680, 260, 0.07, 'square', 0.06);
    this.noise(0.09, 0.08, 1200);
  }

  public pickup() {
    this.tone(360, 580, 0.08, 'triangle', 0.07);
  }

  public throwObj() {
    this.tone(420, 220, 0.1, 'triangle', 0.07);
  }

  public explosion() {
    this.tone(130, 34, 0.38, 'sawtooth', 0.14);
    this.noise(0.36, 0.16, 450);
  }

  public ignite() {
    this.tone(320, 760, 0.16, 'triangle', 0.08);
    this.noise(0.14, 0.06, 1500);
  }

  public switchToggle() {
    this.tone(520, 780, 0.07, 'square', 0.07);
    this.tone(780, 1040, 0.08, 'square', 0.06, 0.05);
  }

  public puzzleSolve() {
    const notes = [440, 554, 659, 880];
    notes.forEach((n, i) => {
      this.tone(n, n, 0.14, 'triangle', 0.08, i * 0.07);
    });
  }

  public gem() {
    this.tone(880, 1320, 0.08, 'sine', 0.07);
    this.tone(1320, 1760, 0.08, 'triangle', 0.05, 0.04);
  }

  public heal() {
    this.tone(523, 659, 0.09, 'sine', 0.07);
    this.tone(659, 784, 0.12, 'sine', 0.07, 0.07);
  }

  public starPiece() {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((n, i) => {
      this.tone(n, n * 1.01, 0.16, 'triangle', 0.09, i * 0.065);
    });
  }

  public chestOpen() {
    const notes = [392, 494, 587, 784];
    notes.forEach((n, i) => {
      this.tone(n, n, 0.18, 'square', 0.06, i * 0.08);
    });
  }

  public achievement() {
    const notes = [587, 740, 880, 1175];
    notes.forEach((n, i) => {
      this.tone(n, n, 0.18, 'triangle', 0.085, i * 0.07);
    });
  }

  public bossRoar() {
    this.tone(140, 52, 0.45, 'sawtooth', 0.12);
    this.noise(0.35, 0.09, 350);
  }

  public victory() {
    const notes = [523, 659, 784, 1046, 784, 1046];
    const delays = [0, 0.09, 0.18, 0.28, 0.42, 0.52];
    notes.forEach((n, i) => {
      this.tone(n, n, 0.22, 'triangle', 0.09, delays[i]);
    });
  }

  public startMusic() {
    if (this.muted || this.musicPlaying) return;
    this.musicPlaying = true;
    // Gentle 16-step fantasy adventure loop (D minor / F major Dorian feel)
    const melody = [
      293.66, 0, 349.23, 440, 523.25, 0, 440, 392,
      349.23, 0, 392, 440, 329.63, 0, 293.66, 0,
    ];
    const bass = [
      146.83, 0, 146.83, 0, 174.61, 0, 174.61, 0,
      130.81, 0, 130.81, 0, 110.0, 0, 146.83, 0,
    ];

    const tick = () => {
      if (!this.musicPlaying || this.muted) return;
      const step = this.musicStep % melody.length;
      const m = melody[step];
      const b = bass[step];
      if (m > 0) this.tone(m, m, 0.18, 'triangle', 0.022);
      if (b > 0) this.tone(b, b, 0.22, 'sine', 0.025);
      this.musicStep++;
      this.musicTimer = window.setTimeout(tick, 240);
    };
    tick();
  }

  public stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const sound = new SoundEngine();

export function triggerHaptic(ms = 18, enabled = true) {
  if (!enabled) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    // ignore
  }
}
