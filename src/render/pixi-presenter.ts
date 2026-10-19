import type { Renderer } from './renderer'
import type { SceneView } from './scene'
import { onSpriteLoad } from './theme'
import { PixiTank } from '../lab/pixi-tank'

/** GPU presentation only: the original canvas continues to own input and fallback. */
export class PixiPresenter {
  private readonly tank = new PixiTank()
  private readonly stage = document.createElement('div')
  private ready = false
  private readonly stopSpriteListener: () => void

  constructor(canvas: HTMLCanvasElement) {
    this.stage.className = 'pixi-stage'
    this.stage.dataset.renderer = 'canvas'
    canvas.before(this.stage)
    this.stage.append(canvas)
    this.stopSpriteListener = onSpriteLoad(() => this.tank.invalidate())
    window.addEventListener('pagehide', this.pageHide)
  }

  async init(): Promise<void> {
    try {
      await this.tank.init()
      this.tank.app.canvas.className = 'pixi-canvas'
      this.tank.app.canvas.hidden = true
      this.stage.append(this.tank.app.canvas)
      this.ready = true
    } catch (error) {
      this.tank.destroy()
      console.warn('PixiJS unavailable; using Canvas', error)
    }
  }

  draw(renderer: Renderer, view: SceneView, ctx: CanvasRenderingContext2D, scale: number, zoom: number): void {
    if (this.ready && this.tank.available) {
      try {
        this.tank.render(renderer, view, true, true, zoom)
        this.tank.app.canvas.hidden = false
        if (this.stage.dataset.renderer !== 'pixi') this.stage.dataset.renderer = 'pixi'
        return
      } catch (error) {
        this.ready = false
        this.tank.app.canvas.hidden = true
        this.tank.destroy()
        console.warn('PixiJS rendering failed; using Canvas', error)
      }
    }
    if (this.ready) this.tank.app.canvas.hidden = true
    if (this.stage.dataset.renderer !== 'canvas') this.stage.dataset.renderer = 'canvas'
    // Paint in the same frame that detected failure, rather than exposing stale pixels.
    ctx.save()
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    renderer.scene(ctx, view)
    ctx.restore()
  }

  private pageHide = (event: PageTransitionEvent): void => {
    if (event.persisted) return
    this.stopSpriteListener()
    this.tank.destroy()
    window.removeEventListener('pagehide', this.pageHide)
  }
}

export async function mountPixiTank(canvas: HTMLCanvasElement): Promise<PixiPresenter> {
  const presenter = new PixiPresenter(canvas)
  await presenter.init()
  return presenter
}
