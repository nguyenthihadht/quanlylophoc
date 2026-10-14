/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Native Web Audio API Sound Generator for Lucky Wheel & Gamification
// Works 100% offline, zero latency, zero network dependency

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Check localStorage for mute preference
    const saved = localStorage.getItem('class_tracker_wheel_muted');
    if (saved === 'true') {
      this.isMuted = true;
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('class_tracker_wheel_muted', String(muted));
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // Wooden needle tick sound when passing wheel slices
  public playTick(pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = 750 * Math.max(0.6, Math.min(1.6, pitchMultiplier));
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.035);
    } catch {
      // Ignore audio context autoplay warnings
    }
  }

  // Celebratory victory fanfare chime when winning student is picked
  public playCelebration() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Arpeggio: C5 (523), E5 (659), G5 (784), C6 (1046), E6 (1318)
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);

        gain.gain.setValueAtTime(0, now + i * 0.09);
        gain.gain.linearRampToValueAtTime(0.25, now + i * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.46);
      });
    } catch {
      // Ignore
    }
  }
}

export const wheelSounds = new SoundManager();
