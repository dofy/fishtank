import type { AudioConfig, BgmTrackId, Tier } from './types'

export type SfxKind =
  | 'click'
  | 'select'
  | 'error'
  | 'place'
  | 'release'
  | 'feed'
  | 'eat'
  | 'scare'
  | 'zap'
  | 'breed-start'
  | 'merge-start'
  | 'reveal'

export function defaultAudioConfig(): AudioConfig {
  return {
    sfxEnabled: true,
    sfxVolume: 0.7,
    bgmEnabled: true,
    bgmVolume: 0.4,
    bgmTrack: 'lofi',
  }
}

export function syncAudioConfig(raw?: Partial<AudioConfig>): AudioConfig {
  const def = defaultAudioConfig()
  if (!raw || typeof raw !== 'object') return def
  const track: BgmTrackId =
    raw.bgmTrack === 'lofi' || raw.bgmTrack === 'tide' || raw.bgmTrack === 'chiptune'
      ? raw.bgmTrack
      : def.bgmTrack
  return {
    sfxEnabled: typeof raw.sfxEnabled === 'boolean' ? raw.sfxEnabled : def.sfxEnabled,
    sfxVolume:
      typeof raw.sfxVolume === 'number' && Number.isFinite(raw.sfxVolume)
        ? Math.min(1, Math.max(0, raw.sfxVolume))
        : def.sfxVolume,
    bgmEnabled: typeof raw.bgmEnabled === 'boolean' ? raw.bgmEnabled : def.bgmEnabled,
    bgmVolume:
      typeof raw.bgmVolume === 'number' && Number.isFinite(raw.bgmVolume)
        ? Math.min(1, Math.max(0, raw.bgmVolume))
        : def.bgmVolume,
    bgmTrack: track,
  }
}

function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

interface TrackPattern {
  stepMs: number
  wave: OscillatorType
  chords: number[][]
  melody: (number | null)[]
}

const TRACKS: Record<BgmTrackId, TrackPattern> = {
  // Track 1: Coral Lo-Fi (warm Rhodes-like seventh chords + gentle pentatonic melody)
  lofi: {
    stepMs: 420,
    wave: 'triangle',
    chords: [
      [53, 57, 60, 64], // Fmaj7
      [52, 55, 59, 62], // Em7
      [50, 53, 57, 60], // Dm7
      [48, 52, 55, 59], // Cmaj7
    ],
    melody: [
      72, null, 69, 67, null, 64, 67, null,
      71, null, 67, 64, null, 62, 64, null,
      69, null, 65, 62, null, 60, 65, 67,
      64, null, 67, 72, null, 71, 67, null,
    ],
  },
  // Track 2: Deep Sea Tide (slow ambient pad & dreamy arpeggio)
  tide: {
    stepMs: 520,
    wave: 'sine',
    chords: [
      [49, 56, 60, 63], // Dbmaj7
      [44, 51, 56, 60], // Abadd9
      [46, 53, 58, 61], // Bbm7
      [48, 55, 60, 63], // Cm7
    ],
    melody: [
      68, null, 72, null, 75, null, 72, null,
      68, null, 63, null, 68, null, null, null,
      70, null, 73, null, 77, null, 73, null,
      72, null, 67, null, 63, null, null, null,
    ],
  },
  // Track 3: Pixel LCD Breeze (retro chiptune square/triangle arpeggios)
  chiptune: {
    stepMs: 240,
    wave: 'square',
    chords: [
      [60, 64, 67], // C
      [57, 60, 64], // Am
      [53, 57, 60], // F
      [55, 59, 62], // G
    ],
    melody: [
      72, 76, 79, 76, 84, null, 79, null,
      69, 72, 76, 72, 81, null, 76, null,
      65, 69, 72, 69, 77, null, 72, 76,
      67, 71, 74, 79, 76, 74, 71, null,
    ],
  },
}

class SoundEngine {
  private ctx: AudioContext | null = null
  private cfg: AudioConfig = defaultAudioConfig()
  private bgmTimer = 0
  private stepIdx = 0
  private unlocked = false

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlocked = true
        if (this.ctx && this.ctx.state === 'suspended') {
          void this.ctx.resume()
        }
        if (this.cfg.bgmEnabled && !this.bgmTimer) {
          this.startBgmLoop()
        }
      }
      window.addEventListener('pointerdown', unlock, { passive: true })
      window.addEventListener('keydown', unlock, { passive: true })
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
    }
    if (this.ctx.state === 'suspended' && this.unlocked) {
      void this.ctx.resume()
    }
    return this.ctx
  }

  configure(next: AudioConfig): void {
    const prevTrack = this.cfg.bgmTrack
    const prevEnabled = this.cfg.bgmEnabled
    this.cfg = syncAudioConfig(next)

    if (!this.cfg.bgmEnabled || this.cfg.bgmVolume <= 0.001) {
      this.stopBgmLoop()
    } else if (this.unlocked && (!prevEnabled || prevTrack !== this.cfg.bgmTrack || !this.bgmTimer)) {
      this.startBgmLoop()
    }
  }

  getConfig(): AudioConfig {
    return this.cfg
  }

  play(kind: SfxKind, tier: Tier = 1): void {
    if (!this.cfg.sfxEnabled || this.cfg.sfxVolume <= 0.001) return
    this.unlocked = true
    const ctx = this.ensureContext()
    if (!ctx) return

    const now = ctx.currentTime
    const vol = this.cfg.sfxVolume * 0.28

    switch (kind) {
      case 'click':
        this.tone(ctx, 620, 740, 0.045, now, vol * 0.7, 'triangle')
        break
      case 'select':
        this.tone(ctx, 520, 780, 0.07, now, vol * 0.85, 'sine')
        break
      case 'place':
        this.tone(ctx, 380, 580, 0.09, now, vol * 0.85, 'sine')
        this.tone(ctx, 580, 760, 0.09, now + 0.06, vol * 0.65, 'sine')
        break
      case 'release':
        this.tone(ctx, 540, 320, 0.14, now, vol * 0.75, 'sine')
        break
      case 'feed':
        this.tone(ctx, 880, 620, 0.055, now, vol * 0.6, 'sine')
        break
      case 'eat':
        this.tone(ctx, 520, 840, 0.06, now, vol * 0.65, 'triangle')
        break
      case 'scare':
        this.tone(ctx, 420, 960, 0.09, now, vol * 0.8, 'sine')
        break
      case 'zap': {
        const zaps = [980, 320, 1180, 260, 860]
        zaps.forEach((f, i) => {
          this.tone(ctx, f, f * 0.65, 0.045, now + i * 0.04, vol * 0.85, 'sawtooth')
        })
        break
      }
      case 'error':
        this.tone(ctx, 220, 175, 0.11, now, vol * 0.95, 'sawtooth')
        this.tone(ctx, 185, 145, 0.14, now + 0.1, vol * 0.95, 'sawtooth')
        break
      case 'breed-start': {
        const notes = [523.25, 659.25, 783.99, 987.77, 1046.5]
        notes.forEach((f, i) => {
          this.tone(ctx, f, f * 1.03, 0.16, now + i * 0.14, vol * 0.85, 'sine')
        })
        break
      }
      case 'merge-start': {
        for (let i = 0; i < 8; i++) {
          const f = 330 * 1.12 ** i
          this.tone(ctx, f, f * 1.08, 0.11, now + i * 0.11, vol * 0.85, 'triangle')
        }
        break
      }
      case 'reveal': {
        // Fanfare scaled by offspring tier
        const base = 523.25 * (1 + tier * 0.05)
        const chord = [base, base * 1.25, base * 1.5, base * 2]
        chord.forEach((f, i) => {
          this.tone(ctx, f, f, 0.28, now + i * 0.08, vol, 'triangle')
        })
        break
      }
    }
  }

  private tone(
    ctx: AudioContext,
    fStart: number,
    fEnd: number,
    duration: number,
    startTime: number,
    gainPeak: number,
    type: OscillatorType,
  ): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(fStart, startTime)
    if (fEnd !== fStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, fEnd), startTime + duration)
    }

    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + Math.min(0.015, duration * 0.25))
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startTime)
    osc.stop(startTime + duration + 0.02)
  }

  private startBgmLoop(): void {
    this.stopBgmLoop()
    if (!this.cfg.bgmEnabled || this.cfg.bgmVolume <= 0.001) return
    const pattern = TRACKS[this.cfg.bgmTrack]
    this.stepIdx = 0
    this.bgmTimer = window.setInterval(() => {
      this.playBgmStep()
    }, pattern.stepMs)
  }

  private stopBgmLoop(): void {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer)
      this.bgmTimer = 0
    }
  }

  private playBgmStep(): void {
    if (!this.cfg.bgmEnabled || this.cfg.bgmVolume <= 0.001 || !this.unlocked) return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    const ctx = this.ensureContext()
    if (!ctx || ctx.state !== 'running') return

    const pattern = TRACKS[this.cfg.bgmTrack]
    const step = this.stepIdx % pattern.melody.length
    this.stepIdx += 1

    const now = ctx.currentTime
    const stepSec = pattern.stepMs / 1000
    const masterVol = this.cfg.bgmVolume * (pattern.wave === 'square' ? 0.055 : 0.11)

    // Play warm background chord at the start of every 8-step bar
    if (step % 8 === 0) {
      const chordIdx = Math.floor(step / 8) % pattern.chords.length
      const chord = pattern.chords[chordIdx] ?? []
      for (const note of chord) {
        const freq = midiToFreq(note)
        this.tone(
          ctx,
          freq,
          freq,
          stepSec * 7.2,
          now,
          masterVol * 0.55,
          pattern.wave === 'square' ? 'triangle' : 'sine',
        )
      }
    }

    // Play melody note
    const mNote = pattern.melody[step]
    if (mNote !== null && mNote !== undefined) {
      const freq = midiToFreq(mNote)
      this.tone(ctx, freq, freq, stepSec * 1.6, now, masterVol, pattern.wave)
    }
  }
}

export const sound = new SoundEngine()
