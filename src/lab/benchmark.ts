import type { SceneView } from '../render/scene'

export interface Statistics { count: number; mean: number; p50: number; p95: number; max: number }
export function statistics(values: readonly number[]): Statistics | null {
  const sorted = values.filter(v => Number.isFinite(v) && v >= 0).sort((a, b) => a - b)
  if (!sorted.length) return null
  return { count: sorted.length, mean: sorted.reduce((a, b) => a + b, 0) / sorted.length, p50: sorted[Math.ceil(sorted.length * 0.5) - 1]!, p95: sorted[Math.ceil(sorted.length * 0.95) - 1]!, max: sorted[sorted.length - 1]! }
}

export type BenchMode = 'canvas' | 'pixi'
export interface BenchPass { mode: BenchMode; cpu: number[]; frameIntervals: number[]; gpu: number[] }

/** Fixed scene replay; neither the live swimming state nor the save is modified. */
export function replay(base: SceneView, frame: number): SceneView {
  const time = frame / 60
  return {
    ...base, time,
    agents: base.agents.map(a => {
      const margin = Math.max(36, a.species.body.length * 4.2 * a.scale * 0.5 + 10)
      const span = Math.max(1, base.width - margin * 2)
      const travel = ((a.x - margin + a.dir * a.speed * time) % (span * 2) + span * 2) % (span * 2)
      return { ...a, x: margin + (travel > span ? span * 2 - travel : travel), y: Math.max(28, Math.min(base.height - 44, a.y + Math.sin(time * 1.4 + a.phase) * 6)), dir: (travel > span ? -a.dir : a.dir) as 1 | -1, scaredTimer: 0, shockedTimer: 0, dischargingTimer: 0, dropping: false }
    }),
    // Deterministic, visible interaction art is part of both workloads.
    foods: [{ id: -1, x: base.width * 0.37 + Math.sin(time) * 8, y: 20 + time * 25, vy: 25, seed: 1 }],
    splashes: [{ x: base.width * 0.67, y: 18, age: time % 0.75, duration: 0.75 }],
  }
}

export class Benchmark {
  readonly passes: BenchPass[] = []
  readonly order: BenchMode[] = ['canvas', 'pixi', 'pixi', 'canvas']
  private passIndex = 0
  private index = 0
  private previousMs = 0
  private current: BenchPass = { mode: 'canvas', cpu: [], frameIntervals: [], gpu: [] }
  constructor(readonly base: SceneView, readonly warmup = 90, readonly samples = 180) {}
  get mode(): BenchMode { return this.order[this.passIndex]! }
  get warming(): boolean { return this.index < this.warmup }
  get finished(): boolean { return this.passIndex >= this.order.length }
  get progress(): string { return `${this.passIndex + 1}/4 ${this.mode === 'pixi' ? 'PixiJS' : 'Canvas'} · ${this.warming ? '预热' : '采样'} ${this.warming ? this.index : this.index - this.warmup}/${this.warming ? this.warmup : this.samples}` }
  view(): SceneView { return replay(this.base, this.warming ? this.index / this.warmup * this.samples : this.index - this.warmup) }
  record(cpu: number, now: number, gpu: number[]): 'continue' | 'measure' | 'pass' | 'done' {
    if (!this.warming) {
      this.current.cpu.push(cpu)
      if (this.previousMs) this.current.frameIntervals.push(now - this.previousMs)
    }
    this.previousMs = now
    this.index++
    if (this.index === this.warmup) return 'measure'
    if (this.index < this.warmup + this.samples) return 'continue'
    this.current.gpu = gpu
    this.passes.push(this.current)
    this.passIndex++
    this.index = 0
    this.previousMs = 0
    if (this.finished) return 'done'
    this.current = { mode: this.mode, cpu: [], frameIntervals: [], gpu: [] }
    return 'pass'
  }
  results() {
    return this.order.slice(0, 2).map(mode => {
      const runs = this.passes.filter(p => p.mode === mode)
      const intervals = runs.flatMap(p => p.frameIntervals)
      return { mode, cpu: statistics(runs.flatMap(p => p.cpu)), intervals: statistics(intervals), fps: intervals.length ? 1000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length) : null, gpu: statistics(runs.flatMap(p => p.gpu)) }
    })
  }
}
