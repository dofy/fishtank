import type { RailLightConfig } from './types'

export function syncRailLightConfig(value?: unknown): RailLightConfig {
  const config = value && typeof value === 'object' ? value as Partial<RailLightConfig> : {}
  return {
    animated: typeof config.animated === 'boolean' ? config.animated : true,
    frequency: typeof config.frequency === 'number' && Number.isFinite(config.frequency)
      ? Math.round(Math.min(2, Math.max(0.2, config.frequency)) * 10) / 10
      : 0.5,
  }
}

/** A smooth traveling wave: frequency is full brightness cycles per second. */
export function railBeadBrightness(
  time: number, index: number, config: RailLightConfig, reducedMotion = false,
): number {
  if (!config.animated || reducedMotion) return 1
  const wave = (1 + Math.cos(time * Math.PI * 2 * config.frequency - index * 0.7)) / 2
  return 0.25 + 0.75 * wave * wave
}
