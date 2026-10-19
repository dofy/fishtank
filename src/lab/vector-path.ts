import { GraphicsPath } from 'pixi.js'
import type { GeometryPath } from '../render/shape'

/** Canvas-compatible commands, recorded as native Pixi geometry. No rasterization. */
export class VectorPath implements GeometryPath {
  readonly path = new GraphicsPath()
  moveTo(x: number, y: number): void { this.path.moveTo(x, y) }
  lineTo(x: number, y: number): void { this.path.lineTo(x, y) }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void { this.path.quadraticCurveTo(cx, cy, x, y) }
  bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number): void { this.path.bezierCurveTo(a, b, c, d, x, y) }
  closePath(): void { this.path.closePath() }
  rect(x: number, y: number, w: number, h: number): void { this.path.rect(x, y, w, h) }
  arc(x: number, y: number, r: number, start: number, end: number, ccw = false): void {
    this.path.moveTo(x + Math.cos(start) * r, y + Math.sin(start) * r)
    this.path.arc(x, y, r, start, end, ccw)
    this.path.closePath()
  }
  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number, ccw = false): void {
    const raw = end - start
    const tau = Math.PI * 2
    const sweep = Math.abs(raw) >= tau ? (ccw ? -tau : tau) : ccw ? -((start - end + tau) % tau) : (raw + tau) % tau
    const point = (angle: number) => ({ x: x + Math.cos(rotation) * rx * Math.cos(angle) - Math.sin(rotation) * ry * Math.sin(angle), y: y + Math.sin(rotation) * rx * Math.cos(angle) + Math.cos(rotation) * ry * Math.sin(angle) })
    const count = Math.max(12, Math.ceil(Math.abs(sweep) * Math.max(rx, ry) / 3))
    const first = point(start)
    this.path.moveTo(first.x, first.y)
    for (let i = 1; i <= count; i++) { const p = point(start + sweep * i / count); this.path.lineTo(p.x, p.y) }
    this.path.closePath()
  }
  contains(x: number, y: number): boolean {
    return this.path.shapePath.shapePrimitives.some(({ shape }) => shape.contains(x, y))
  }
}
