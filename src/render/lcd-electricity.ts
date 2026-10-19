/** Integer cell positions keep GPU electricity as crisp as the Canvas LCD scene. */
export function lcdElectricity(x: number, y: number, length: number, depth: number, time: number, cell: number, reducedMotion = false) {
  const c = Math.max(2, cell)
  const step = reducedMotion ? 0 : Math.floor(time * 16)
  const jitter = !reducedMotion && Math.floor(time * 24) % 2 === 0 ? c : 0
  const cx = Math.round(x / c) * c + jitter
  const cy = Math.round(y / c) * c
  const dy = Math.round(length * depth * 0.55 / c) * c
  return {
    x: cx,
    y: cy,
    dots: Array.from({ length: 4 }, (_, i) => ({
      x: Math.round((cx + length * (-0.3 + i * 0.22)) / c) * c,
      y: cy + ((i + step) % 2 === 0 ? -dy : dy),
      size: c - 1,
    })),
  }
}
