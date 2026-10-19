import type { DecorItem, Grade, Species, Tier } from '../core/types'
import type { SceneView } from './scene'
import type { ThemeManifest } from './theme'

export interface PortraitRequest {
  species: Species
  tier: Tier
  grade: Grade
  /** Dimmed portraits mark cooling-down or unavailable entries. */
  dim?: boolean
}

export interface DecorPortraitRequest {
  item: DecorItem
  dim?: boolean
}

export interface Renderer {
  readonly manifest: ThemeManifest
  /** Paint the whole tank. */
  scene(ctx: CanvasRenderingContext2D, view: SceneView): void
  /** Draw a local fish pose at x=0..length, centred vertically, for texture baking. */
  fishFrame(ctx: CanvasRenderingContext2D, length: number, req: PortraitRequest, phase: number): void
  /** Paint one fish centred in a w x h box, for grids and lists. */
  portrait(ctx: CanvasRenderingContext2D, w: number, h: number, req: PortraitRequest): void
  /** Paint one decoration centred in a w x h box, for the decorations tab. */
  decorPortrait(ctx: CanvasRenderingContext2D, w: number, h: number, req: DecorPortraitRequest): void
}
