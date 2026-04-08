export class AudioBus {
  private context: AudioContext | null = null;
  private enabled = true;

  unlock(): void {
    if (!this.enabled || typeof window === "undefined") {
      return;
    }
    if (!this.context) {
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.context && this.context.state === "running") {
      void this.context.suspend();
    }
  }

  playShot(team: 0 | 1): void {
    this.beep(team === 0 ? 540 : 410, 0.04, 0.03);
  }

  playHit(team: 0 | 1): void {
    this.beep(team === 0 ? 730 : 290, 0.08, 0.05);
  }

  playSplat(team: 0 | 1): void {
    this.beep(team === 0 ? 220 : 150, 0.2, 0.08);
  }

  playUi(note = 620): void {
    this.beep(note, 0.12, 0.04, "triangle");
  }

  private beep(
    frequency: number,
    duration: number,
    gainLevel: number,
    type: OscillatorType = "square",
  ): void {
    if (!this.enabled) {
      return;
    }
    this.unlock();
    if (!this.context) {
      return;
    }
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    const now = this.context.currentTime;
    gain.gain.exponentialRampToValueAtTime(gainLevel, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}
