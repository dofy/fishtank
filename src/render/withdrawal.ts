/** Transient presentation state; never stored on a Fish or in the save. */
export interface Withdrawal {
  elapsed: number
  duration: number
  startX: number
  startY: number
  distance: number
  reducedMotion: boolean
}

export function withdrawalProgress(exit?: Withdrawal): number {
  return exit ? Math.min(1, Math.max(0, exit.elapsed / exit.duration)) : 0
}

export function withdrawalEase(exit?: Withdrawal): number {
  const p = withdrawalProgress(exit)
  return p * p * (3 - 2 * p)
}

export function withdrawalOpacity(exit?: Withdrawal): number {
  return 1 - withdrawalEase(exit)
}

export function withdrawalScale(exit?: Withdrawal): number {
  return exit?.reducedMotion ? 1 : 1 - withdrawalEase(exit) * 0.15
}

export function lcdWithdrawalDensity(exit?: Withdrawal): number {
  return Math.round(withdrawalOpacity(exit) * 16) / 16
}

const DITHER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/** Clip both procedural art and sprite overrides to opaque, whole LCD cells. */
export function clipLcdWithdrawal(ctx: CanvasRenderingContext2D, length: number, height: number, cell: number, density: number): void {
  ctx.beginPath()
  for (let y = -Math.ceil(height / 2 / cell) * cell - cell; y <= height / 2 + cell; y += cell) {
    for (let x = -cell; x <= length + cell; x += cell) {
      const threshold = (DITHER[((y / cell) & 3) * 4 + ((x / cell) & 3)]! + 0.5) / 16
      if (density > threshold) ctx.rect(x, y, cell, cell)
    }
  }
  ctx.clip()
}
