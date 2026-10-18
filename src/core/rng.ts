/** Seedable xorshift32, so a run can be replayed from a seed. */
export class Rng {
  private s: number

  constructor(seed = Date.now() >>> 0) {
    this.s = seed === 0 ? 0x9e3779b9 : seed >>> 0
  }

  next(): number {
    let x = this.s
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    this.s = x >>> 0
    return this.s / 0x1_0000_0000
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive)
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick from empty list')
    return items[this.int(items.length)]!
  }

  /** Index chosen from weights, which need not be normalised. */
  weighted(weights: readonly number[]): number {
    const total = weights.reduce((a, b) => a + b, 0)
    if (total <= 0) return 0
    let roll = this.next() * total
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i]!
      if (roll < 0) return i
    }
    return weights.length - 1
  }
}

export const rng = new Rng()
