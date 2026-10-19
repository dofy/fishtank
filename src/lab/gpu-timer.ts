interface TimerExtension { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

/** Non-blocking GPU timer. Never waits for results or calls gl.finish(). */
export class GpuTimer {
  private readonly extension: TimerExtension | null
  private pending: WebGLQuery[] = []
  private active: WebGLQuery | null = null
  private values: number[] = []
  private enabled = false
  constructor(private readonly gl: WebGL2RenderingContext) {
    this.extension = typeof gl.createQuery === 'function' ? gl.getExtension('EXT_disjoint_timer_query_webgl2') : null
  }
  get supported(): boolean { return !!this.extension }
  reset(enabled: boolean): void {
    this.clear()
    this.values = []
    this.enabled = enabled
  }
  begin(): void {
    if (!this.enabled || !this.extension || this.gl.isContextLost()) return
    if (this.gl.getParameter(this.extension.GPU_DISJOINT_EXT)) { this.clear(); this.values = []; return }
    while (this.pending.length && this.gl.getQueryParameter(this.pending[0]!, this.gl.QUERY_RESULT_AVAILABLE)) {
      const query = this.pending.shift()!
      this.values.push(this.gl.getQueryParameter(query, this.gl.QUERY_RESULT) / 1e6)
      this.gl.deleteQuery(query)
    }
    if (this.pending.length >= 8) return
    this.active = this.gl.createQuery()
    if (this.active) this.gl.beginQuery(this.extension.TIME_ELAPSED_EXT, this.active)
  }
  end(): void {
    if (!this.active || !this.extension) return
    this.gl.endQuery(this.extension.TIME_ELAPSED_EXT)
    this.pending.push(this.active)
    this.active = null
  }
  samples(): number[] { return [...this.values] }
  destroy(): void { this.enabled = false; this.clear() }
  private clear(): void {
    if (this.active && this.extension && !this.gl.isContextLost()) this.gl.endQuery(this.extension.TIME_ELAPSED_EXT)
    for (const query of [...this.pending, ...(this.active ? [this.active] : [])]) this.gl.deleteQuery(query)
    this.pending = []
    this.active = null
  }
}
