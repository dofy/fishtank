import type { BodyShape } from '../core/types'
import { elongatedProfile } from '../render/shape'

/** Same deformation as the original mesh, evaluated once per column instead of per vertex. */
export class FishDeformation {
  private readonly u: number[]
  private readonly originalCenter: number[]
  private deformed = false

  constructor(
    private readonly body: BodyShape,
    private readonly length: number,
    private readonly width: number,
    private readonly height: number,
    pad: number,
    private readonly base: Float32Array,
    private readonly cols: number,
  ) {
    this.u = Array.from({ length: cols }, (_, col) => Math.min(1, Math.max(0, (base[col * 2]! + width / 2 - pad) / length)))
    const original = elongatedProfile(body, length, 0)
    this.originalCenter = this.u.map(u => original.center(u))
  }

  update(vertices: Float32Array, time: number, tempo: number, enabled: boolean): boolean {
    if (!enabled) {
      if (!this.deformed) return false
      vertices.set(this.base)
      this.deformed = false
      return true
    }
    const form = this.body.form ?? 'fish'
    const profile = form === 'eel' || form === 'seasnake' ? elongatedProfile(this.body, this.length, time) : null
    const pulseX = Math.sin(time * 2.2) * this.length * 0.08
    const pulseY = Math.sin(time * 2.2 - 0.8) * 0.08
    const fin = Math.sin(time * (form === 'ray' ? 2.6 : 2.8)) * 0.14
    const curl = Math.sin(time * 3) * 3
    for (let col = 0; col < this.cols; col++) {
      const u = this.u[col]!
      const wave = profile ? profile.center(u) - this.originalCenter[col]!
        : Math.sin(time * tempo - u * 2.1) * (1 - u) ** 2 * this.length * 0.065
      const wing = fin * Math.sin(u * Math.PI)
      for (let i = col * 2; i < this.base.length; i += this.cols * 2) {
        const x = this.base[i]!, y = this.base[i + 1]!
        let dx = 0, dy = wave
        if (form === 'jellyfish') { dx = x / this.width * pulseX; dy = Math.max(0, y) * pulseY }
        else if (form === 'ray' || form === 'turtle') dy = y * wing
        else if (form === 'seahorse') { dx = Math.max(0, y / this.height) * curl; dy = 0 }
        vertices[i] = x + dx
        vertices[i + 1] = y + dy
      }
    }
    this.deformed = true
    return true
  }
}
