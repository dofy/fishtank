import {
  HEART_MAX,
  MAX_LEVEL,
  SYNTHESIS_INPUT_COUNT,
  TIER_NAMES,
  TRADE_HUB_LEVEL,
  USES_BY_TIER,
  nextLevelExp,
} from '../core/balance'
import {
  breed,
  capacity,
  collectionProgress,
  craft,
  isAdult,
  recipeStatus,
  release,
  synthesize,
  tierOdds,
} from '../core/game'
import { SEASON_RECIPES, SPECIES, species } from '../core/species'
import type { Fish, GameState, Grade, Species, Tier } from '../core/types'
import type { Renderer } from '../render/renderer'

type Tab = 'tank' | 'breed' | 'merge' | 'season' | 'book' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'tank', label: 'Tank' },
  { id: 'breed', label: 'Breed' },
  { id: 'merge', label: 'Merge' },
  { id: 'season', label: 'Season' },
  { id: 'book', label: 'Book' },
  { id: 'settings', label: 'Settings' },
]

export interface AppHooks {
  onThemeChange(id: string): void
  onReset(): void
  themes: { id: string; name: string }[]
}

export class App {
  private tab: Tab = 'tank'
  private breedPick: string[] = []
  private mergePick: string[] = []
  private message = ''
  private messageKind: 'good' | 'bad' | '' = ''

  readonly canvas = document.createElement('canvas')
  private readonly hud = document.createElement('header')
  private readonly nav = document.createElement('nav')
  private readonly body = document.createElement('section')

  constructor(
    private state: GameState,
    private renderer: Renderer,
    private readonly hooks: AppHooks,
  ) {
    this.hud.className = 'hud'
    this.nav.className = 'tabs'
    this.body.className = 'panel'
    this.canvas.id = 'tank'
  }

  mount(root: HTMLElement): void {
    root.replaceChildren(this.hud, this.canvas, this.nav, this.body)
    this.render()
  }

  setState(state: GameState): void {
    this.state = state
  }

  setRenderer(renderer: Renderer): void {
    this.renderer = renderer
    this.render()
  }

  private say(text: string, kind: 'good' | 'bad' | '' = ''): void {
    this.message = text
    this.messageKind = kind
  }

  render(now = Date.now()): void {
    this.renderHud(now)
    this.renderNav()
    this.renderBody(now)
  }

  private renderHud(now: number): void {
    const s = this.state
    const next = nextLevelExp(s.level)
    const prev = s.level > 1 ? (nextLevelExp(s.level - 1) ?? 0) : 0
    const span = next === null ? 1 : next - prev
    const filled = next === null ? 1 : Math.min(1, Math.max(0, (s.exp - prev) / span))
    const heartWait =
      s.hearts >= HEART_MAX ? 'full' : formatClock(Math.max(0, s.nextHeartAt - now))

    this.hud.replaceChildren(
      stat('Level', `${s.level}${s.level >= MAX_LEVEL ? ' (max)' : ''}`),
      bar(filled),
      stat('EXP', next === null ? `${s.exp}` : `${s.exp} / ${next}`),
      stat('Tank', `${s.fish.length} / ${capacity(s)}`),
      stat('Hearts', `${s.hearts} / ${HEART_MAX}`),
      stat('Next heart', heartWait),
      stat('Species', `${collectionProgress(s).owned} / ${collectionProgress(s).total}`),
    )
  }

  private renderNav(): void {
    this.nav.replaceChildren(
      ...TABS.map((t) => {
        const b = document.createElement('button')
        b.textContent = t.label
        b.setAttribute('aria-pressed', String(this.tab === t.id))
        b.onclick = () => {
          this.tab = t.id
          this.say('')
          this.render()
        }
        return b
      }),
    )
  }

  private renderBody(now: number): void {
    const nodes: Node[] = []
    switch (this.tab) {
      case 'tank':
        nodes.push(...this.tankPanel(now))
        break
      case 'breed':
        nodes.push(...this.breedPanel(now))
        break
      case 'merge':
        nodes.push(...this.mergePanel(now))
        break
      case 'season':
        nodes.push(...this.seasonPanel(now))
        break
      case 'book':
        nodes.push(...this.bookPanel())
        break
      case 'settings':
        nodes.push(...this.settingsPanel())
        break
    }
    const log = document.createElement('div')
    log.className = `log ${this.messageKind}`
    log.textContent = this.message
    nodes.push(log)
    this.body.replaceChildren(...nodes)
  }

  // ---------------------------------------------------------------- tank

  private tankPanel(now: number): Node[] {
    const title = heading('Your fish')
    const grid = document.createElement('div')
    grid.className = 'grid'
    const sorted = [...this.state.fish].sort((a, b) => a.bornAt - b.bornAt)
    for (const fish of sorted) {
      grid.append(
        this.fishCell(fish, now, {
          onClick: () => {
            this.say(describe(fish, now))
            this.render()
          },
          action: () => {
            if (this.state.fish.length <= 1) {
              this.say('The last fish stays.', 'bad')
            } else if (release(this.state, fish.uid)) {
              this.say(`Released ${species(fish.speciesId).name}.`)
            }
            this.render()
          },
          actionLabel: 'Release',
        }),
      )
    }
    const note = document.createElement('p')
    note.className = 'note'
    note.textContent =
      'Fry mature on a timer and bank EXP the moment they become adults. EXP is what raises the aquarium level, and the level is what raises tank capacity.'
    return [title, grid, note]
  }

  // --------------------------------------------------------------- breed

  private breedPanel(now: number): Node[] {
    const out: Node[] = [heading('Pick two adults')]
    const eligible = this.state.fish.filter((f) => isAdult(f, now) && f.uses > 0 && !species(f.speciesId).seasonal)

    const grid = document.createElement('div')
    grid.className = 'grid'
    for (const fish of eligible) {
      const picked = this.breedPick.includes(fish.uid)
      grid.append(
        this.fishCell(fish, now, {
          selected: picked,
          onClick: () => {
            this.breedPick = picked
              ? this.breedPick.filter((u) => u !== fish.uid)
              : [...this.breedPick, fish.uid].slice(-2)
            this.say('')
            this.render()
          },
        }),
      )
    }
    out.push(grid)

    if (eligible.length < 2) {
      out.push(note('Needs two adults with breeding attempts left. Fry have to grow up first, and an exhausted fish can still be merged.'))
    }

    const [aUid, bUid] = this.breedPick
    const a = aUid ? this.state.fish.find((f) => f.uid === aUid) : undefined
    const b = bUid ? this.state.fish.find((f) => f.uid === bUid) : undefined

    if (a && b) {
      out.push(heading('Offspring odds', 'h3'), oddsTable(a.tier, b.tier))
    }

    const row = document.createElement('div')
    row.className = 'row'
    const go = document.createElement('button')
    go.textContent = 'Breed (1 heart)'
    go.disabled = !a || !b
    go.onclick = () => {
      if (!a || !b) return
      const result = breed(this.state, a.uid, b.uid, Date.now())
      if ('error' in result) {
        this.say(breedError(result.error), 'bad')
      } else {
        const name = species(result.child.speciesId).name
        this.say(
          `${name} hatched at ${stars(result.tier)} ${TIER_NAMES[result.tier]}, grade ${result.child.grade}.${result.novel ? ' New species for the book.' : ''}`,
          'good',
        )
        this.breedPick = []
      }
      this.render()
    }
    row.append(go)
    out.push(row)
    return out
  }

  // --------------------------------------------------------------- merge

  private mergePanel(now: number): Node[] {
    const out: Node[] = [heading(`Merge ${SYNTHESIS_INPUT_COUNT} fish of one tier`)]
    const pickTier = this.mergePick.length
      ? this.state.fish.find((f) => f.uid === this.mergePick[0])?.tier
      : undefined

    const grid = document.createElement('div')
    grid.className = 'grid'
    for (const fish of this.state.fish) {
      const seasonal = species(fish.speciesId).seasonal
      const wrongTier = pickTier !== undefined && fish.tier !== pickTier
      const picked = this.mergePick.includes(fish.uid)
      grid.append(
        this.fishCell(fish, now, {
          selected: picked,
          locked: Boolean(seasonal) || wrongTier || fish.tier >= 5,
          onClick: () => {
            if (seasonal) {
              this.say('Seasonal creatures are never consumed as materials.', 'bad')
            } else if (fish.tier >= 5) {
              this.say('Mythic is the ceiling; it cannot be merged upward.', 'bad')
            } else if (wrongTier) {
              this.say('All ten materials must share one tier.', 'bad')
            } else {
              this.mergePick = picked
                ? this.mergePick.filter((u) => u !== fish.uid)
                : [...this.mergePick, fish.uid].slice(0, SYNTHESIS_INPUT_COUNT)
              this.say('')
            }
            this.render()
          },
        }),
      )
    }
    out.push(grid)

    const row = document.createElement('div')
    row.className = 'row'
    const go = document.createElement('button')
    go.textContent = `Merge (${this.mergePick.length}/${SYNTHESIS_INPUT_COUNT})`
    go.disabled = this.mergePick.length !== SYNTHESIS_INPUT_COUNT
    go.onclick = () => {
      const result = synthesize(this.state, this.mergePick, Date.now())
      if ('error' in result) {
        this.say(synthError(result.error), 'bad')
      } else {
        this.say(
          `Merged into ${species(result.child.speciesId).name}, ${stars(result.child.tier)} ${TIER_NAMES[result.child.tier]}.`,
          'good',
        )
        this.mergePick = []
      }
      this.render()
    }
    const clear = document.createElement('button')
    clear.textContent = 'Clear'
    clear.onclick = () => {
      this.mergePick = []
      this.render()
    }
    row.append(go, clear)
    out.push(
      row,
      note('Ten go in, one comes out a tier higher, carrying the best grade among them. Spend exhausted duplicates here, never a fish that still has breeding attempts.'),
    )
    return out
  }

  // -------------------------------------------------------------- season

  private seasonPanel(now: number): Node[] {
    const out: Node[] = [heading('Season crafting')]
    for (const recipe of SEASON_RECIPES) {
      const status = recipeStatus(this.state, recipe.id, now)
      const outSpecies = species(recipe.output)
      out.push(heading(`${outSpecies.name}${this.state.crafted.includes(recipe.id) ? ' — crafted' : ''}`, 'h3'))

      const grid = document.createElement('div')
      grid.className = 'grid'
      for (const material of status.materials) {
        const sp = species(material.speciesId)
        const ready = material.have >= material.need
        const cell = document.createElement('div')
        cell.className = 'cell locked'
        cell.append(
          badge(ready ? 'ready' : material.have > 0 ? 'partial' : 'none'),
          count(`${material.have}/${material.need}`),
          this.portrait(sp, material.minTier, 1, !ready),
          label(sp.name, 'name'),
          label(`min ${stars(material.minTier)}`, 'meta'),
        )
        grid.append(cell)
      }
      out.push(grid)

      const row = document.createElement('div')
      row.className = 'row'
      const go = document.createElement('button')
      go.textContent = 'Craft'
      go.disabled = !status.ready
      go.onclick = () => {
        const result = craft(this.state, recipe.id, Date.now())
        if ('error' in result) this.say(craftError(result.error), 'bad')
        else this.say(`Crafted ${species(result.child.speciesId).name}.`, 'good')
        this.render()
      }
      row.append(go)
      out.push(row)
    }
    out.push(
      note('Materials must be adults at or above the listed tier. A green badge means that slot is satisfied; crafting consumes the oldest matching fish first.'),
    )
    return out
  }

  // ---------------------------------------------------------------- book

  private bookPanel(): Node[] {
    const grid = document.createElement('div')
    grid.className = 'grid'
    for (const sp of SPECIES) {
      const owned = this.state.discovered.includes(sp.id)
      const cell = document.createElement('div')
      cell.className = `cell${owned ? '' : ' locked'}`
      cell.append(
        this.portrait(sp, sp.tier, owned ? 3 : 1, !owned),
        label(owned ? sp.name : '???', 'name'),
        label(`${TIER_NAMES[sp.tier]}${sp.seasonal ? ' · seasonal' : ''}`, 'meta'),
      )
      grid.append(cell)
    }
    return [heading('Collection'), grid]
  }

  // ------------------------------------------------------------ settings

  private settingsPanel(): Node[] {
    const out: Node[] = [heading('Art theme')]
    const row = document.createElement('div')
    row.className = 'row'
    for (const theme of this.hooks.themes) {
      const b = document.createElement('button')
      b.textContent = theme.name
      b.setAttribute('aria-pressed', String(this.state.theme === theme.id))
      b.onclick = () => this.hooks.onThemeChange(theme.id)
      row.append(b)
    }
    out.push(
      row,
      note('A theme is a folder under public/themes/. Its manifest supplies the palette, the renderer and an optional sprites/ directory; dropping <speciesId>.png in there replaces that fish everywhere with no code change.'),
      heading('Trade hub', 'h3'),
      note(
        this.state.level >= TRADE_HUB_LEVEL
          ? 'Unlocked. This build keeps trading out of scope: there is no economy, no server and no market.'
          : `Locked until aquarium level ${TRADE_HUB_LEVEL}, mirroring the original's gate.`,
      ),
      heading('Save', 'h3'),
    )
    const danger = document.createElement('div')
    danger.className = 'row'
    const reset = document.createElement('button')
    reset.textContent = 'Reset progress'
    reset.onclick = () => {
      if (confirm('Delete this aquarium and start over? This cannot be undone.')) this.hooks.onReset()
    }
    danger.append(reset)
    out.push(danger, note('Progress lives in localStorage on this device only.'))
    return out
  }

  // ------------------------------------------------------------- helpers

  private portrait(sp: Species, tier: Tier, grade: Grade, dim = false): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = 96
    const h = 52
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      this.renderer.portrait(ctx, w, h, { species: sp, tier, grade, dim })
    }
    return canvas
  }

  private fishCell(
    fish: Fish,
    now: number,
    opts: {
      selected?: boolean
      locked?: boolean
      onClick?: () => void
      action?: () => void
      actionLabel?: string
    },
  ): HTMLElement {
    const sp = species(fish.speciesId)
    const adult = isAdult(fish, now)
    const cell = document.createElement('div')
    cell.className = `cell${opts.locked ? ' locked' : ''}`
    cell.setAttribute('aria-pressed', String(Boolean(opts.selected)))
    if (opts.onClick && !opts.locked) cell.onclick = opts.onClick

    cell.append(
      badge(adult && fish.uses > 0 ? 'ready' : adult ? 'none' : 'partial'),
      count(`${fish.uses}/${USES_BY_TIER[fish.tier]}`),
      this.portrait(sp, fish.tier, fish.grade, !adult),
      label(sp.name, 'name'),
      label(`${stars(fish.tier)} · grade ${fish.grade}`, 'meta'),
    )
    if (!adult && fish.maturesAt !== null) {
      cell.append(label(formatClock(fish.maturesAt - now), 'timer'))
    }
    if (opts.action && opts.actionLabel) {
      const b = document.createElement('button')
      b.textContent = opts.actionLabel
      b.onclick = (event) => {
        event.stopPropagation()
        opts.action?.()
      }
      cell.append(b)
    }
    return cell
  }
}

function stat(labelText: string, value: string): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'stat'
  const l = document.createElement('span')
  l.className = 'label'
  l.textContent = labelText
  const v = document.createElement('b')
  v.textContent = value
  wrap.append(l, v)
  return wrap
}

function bar(fraction: number): HTMLElement {
  const outer = document.createElement('div')
  outer.className = 'bar'
  const inner = document.createElement('span')
  inner.style.width = `${Math.round(fraction * 100)}%`
  outer.append(inner)
  return outer
}

function heading(text: string, tag: 'h2' | 'h3' = 'h2'): HTMLElement {
  const el = document.createElement(tag)
  el.textContent = text
  return el
}

function note(text: string): HTMLElement {
  const p = document.createElement('p')
  p.className = 'note'
  p.textContent = text
  return p
}

function label(text: string, className: string): HTMLElement {
  const el = document.createElement('div')
  el.className = className
  el.textContent = text
  return el
}

function count(text: string): HTMLElement {
  return label(text, 'count')
}

function badge(kind: 'ready' | 'partial' | 'none'): HTMLElement {
  const el = document.createElement('div')
  el.className = `badge${kind === 'ready' ? '' : ' idle'}`
  el.textContent = kind === 'none' ? '·' : '↓'
  el.title =
    kind === 'ready'
      ? 'Available to use now'
      : kind === 'partial'
        ? 'Present but not usable yet'
        : 'Nothing to use'
  return el
}

function oddsTable(a: Tier, b: Tier): HTMLElement {
  const odds = tierOdds(a, b)
  const table = document.createElement('table')
  table.className = 'odds'
  const head = document.createElement('tr')
  head.append(th('Pairing'), ...odds.map((_, i) => th(TIER_NAMES[i + 1] ?? '')))
  const row = document.createElement('tr')
  row.append(td(`${stars(a)} + ${stars(b)}`), ...odds.map((value) => td(`${value}%`)))
  table.append(head, row)
  return table
}

function th(text: string): HTMLElement {
  const el = document.createElement('th')
  el.textContent = text
  return el
}

function td(text: string): HTMLElement {
  const el = document.createElement('td')
  el.textContent = text
  return el
}

export function stars(tier: Tier): string {
  return tier === 0 ? '—' : '★'.repeat(tier)
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function describe(fish: Fish, now: number): string {
  const sp = species(fish.speciesId)
  const state = isAdult(fish, now) ? 'adult' : `fry, ${formatClock((fish.maturesAt ?? now) - now)} to adulthood`
  return `${sp.name} — ${stars(fish.tier)} ${TIER_NAMES[fish.tier]}, grade ${fish.grade}, ${fish.uses} breeding attempts left, ${state}.`
}

function breedError(error: string): string {
  switch (error) {
    case 'no-hearts':
      return 'Out of hearts. One regenerates every seven minutes.'
    case 'tank-full':
      return 'Tank is full. Raise the aquarium level or release a fish.'
    case 'not-adult':
      return 'Both parents must be adults.'
    case 'no-uses':
      return 'One parent has no breeding attempts left.'
    case 'seasonal-parent':
      return 'Seasonal creatures cannot breed.'
    default:
      return 'Pick two different adults.'
  }
}

function synthError(error: string): string {
  switch (error) {
    case 'mixed-tier':
      return 'All ten materials must share one tier.'
    case 'max-tier':
      return 'Mythic cannot be merged upward.'
    case 'seasonal-material':
      return 'Seasonal creatures are never consumed as materials.'
    case 'tank-full':
      return 'Tank is full.'
    default:
      return `Select exactly ${SYNTHESIS_INPUT_COUNT} fish.`
  }
}

function craftError(error: string): string {
  switch (error) {
    case 'missing-materials':
      return 'Materials are short.'
    case 'tank-full':
      return 'Tank is full.'
    default:
      return 'Unknown recipe.'
  }
}
