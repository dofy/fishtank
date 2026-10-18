import {
  HEART_MAX,
  SYNTHESIS_INPUT_COUNT,
  TRADE_HUB_LEVEL,
  USES_BY_TIER,
  nextLevelExp,
} from '../core/balance'
import {
  autoPickForMerge,
  breed,
  capacity,
  collectionProgress,
  decorProgress,
  filterMergeCandidates,
  flipDecor,
  isAdult,
  isDecorUnlocked,
  release,
  syncDecor,
  syncMergeFilter,
  syncTank,
  synthesize,
  tierOdds,
  toggleDecor,
  toggleTankFish,
} from '../core/game'
import {
  type Copy,
  copy,
  decorName,
  detectLocale,
  speciesName,
  themeName,
  tierName,
} from '../core/i18n'
import { DECORATIONS, SPECIES, species } from '../core/species'
import type {
  BreedOutcome,
  ColorMode,
  DecorItem,
  Fish,
  GameState,
  Grade,
  Locale,
  Species,
  Tier,
} from '../core/types'
import type { Renderer } from '../render/renderer'
import type { Agent, DecorNode } from '../render/scene'
import { resolveDarkMode } from '../render/theme'

type Tab = 'tank' | 'breed' | 'merge' | 'decor' | 'book' | 'settings'

const TAB_IDS: readonly Tab[] = ['tank', 'breed', 'merge', 'decor', 'book', 'settings']

const TAB_ICONS: Record<Tab, string> = {
  tank: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8s2.5-4.5 7-4.5c2.2 0 4 1.5 5 2.5l1.5-1.5v7L13.5 10c-1 1-2.8 2.5-5 2.5-4.5 0-7-4.5-7-4.5Z"/><circle cx="5.5" cy="7.5" r="0.8" fill="currentColor"/></svg>',
  breed: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13.8S2 9.8 2 5.6A3.1 3.1 0 0 1 8 4.3a3.1 3.1 0 0 1 6 1.3c0 4.2-6 8.2-6 8.2Z"/></svg>',
  merge: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4m0 4v4M2 8h4m4 0h4M4.2 4.2l2.3 2.3m3 3 2.3 2.3m0-7.6-2.3 2.3m-3 3-2.3 2.3"/></svg>',
  decor: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14V5c0-2 1.8-3 1.8-3M5 14v-4c0-1.5-2-2.5-2-4.5M11 14V9c0-1.5 2-2 2-4M3 14h10"/></svg>',
  book: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3h4.2c1 0 1.3.5 1.3 1.3v9.2c0-.7-.5-1-1.3-1H2.5V3Zm11 0H9.3C8.3 3 8 3.5 8 4.3v9.2c0-.7.5-1 1.3-1h4.2V3Z"/></svg>',
  settings: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v1.6m0 9.2v1.6M1.8 8h1.6m9.2 0h1.6M3.6 3.6l1.1 1.1m6.6 6.6 1.1 1.1m0-8.8-1.1 1.1M4.7 11.3l-1.1 1.1"/></svg>',
}

const STAT_ICONS = {
  level: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.8 3.7 4.1.6-3 2.9.7 4.1L8 11.4l-3.6 1.9.7-4.1-3-2.9 4.1-.6L8 2Z"/></svg>',
  tank: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 6.5c2 1 4-1 6 0s4-1 6 0"/></svg>',
  bag: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5.5h10l-.8 8H3.8L3 5.5Z"/><path d="M5.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5"/></svg>',
  heart: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13.8S2 9.8 2 5.6A3.1 3.1 0 0 1 8 4.3a3.1 3.1 0 0 1 6 1.3c0 4.2-6 8.2-6 8.2Z"/></svg>',
  book: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3h4.2c1 0 1.3.5 1.3 1.3v9.2c0-.7-.5-1-1.3-1H2.5V3Zm11 0H9.3C8.3 3 8 3.5 8 4.3v9.2c0-.7.5-1 1.3-1h4.2V3Z"/></svg>',
}

const MODE_ICONS: Record<ColorMode, string> = {
  auto: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5v11A5.5 5.5 0 0 0 8 2.5Z" fill="currentColor"/></svg>',
  light: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v1.8m0 9.4v1.8M1.5 8h1.8m9.4 0h1.8M3.4 3.4l1.3 1.3m6.6 6.6 1.3 1.3m0-9.2-1.3 1.3M4.7 11.3 3.4 12.6"/></svg>',
  dark: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.2 9.8A5.5 5.5 0 0 1 6.2 2.8a5.5 5.5 0 1 0 7 7Z"/></svg>',
}

export interface AppHooks {
  onThemeChange(id: string): void
  onColorModeChange(mode: ColorMode): void
  onLocaleChange(locale: Locale): void
  onSave(): void
  onReset(): void
  themes: { id: string; name: string }[]
}

interface ShowcaseState {
  outcome: BreedOutcome
  decor: DecorItem
  decorX: number
  decorFlip: 1 | -1
  agent: Agent
}

const MINI_TANK_W = 296
const MINI_TANK_H = 164

export class App {
  private tab: Tab = 'tank'
  private breedPick: string[] = []
  private mergePick: string[] = []
  private confirmingReset = false
  private message = ''
  private messageKind: 'good' | 'bad' | '' = ''
  private portraitCache = new Map<string, HTMLCanvasElement>()
  private showcase: ShowcaseState | null = null
  private showcaseCanvas: HTMLCanvasElement | null = null
  private showcaseRaf = 0
  private showcaseLastMs = 0

  readonly canvas = document.createElement('canvas')
  private readonly hud = document.createElement('header')
  private readonly nav = document.createElement('nav')
  private readonly body = document.createElement('section')
  private readonly modal = document.createElement('div')

  constructor(
    private state: GameState,
    private renderer: Renderer,
    private readonly hooks: AppHooks,
  ) {
    this.hud.className = 'hud'
    this.nav.className = 'tabs'
    this.body.className = 'panel'
    this.modal.className = 'modal-host'
    this.canvas.id = 'tank'
  }

  private get locale(): Locale {
    return this.state.locale ?? detectLocale()
  }

  private get t(): Copy {
    return copy(this.locale)
  }

  mount(root: HTMLElement): void {
    root.replaceChildren(this.hud, this.canvas, this.nav, this.body, this.modal)
    this.render()
  }

  setState(state: GameState): void {
    this.state = state
    this.breedPick = []
    this.mergePick = []
    this.confirmingReset = false
    this.closeShowcase()
  }

  setRenderer(renderer: Renderer): void {
    this.renderer = renderer
    this.portraitCache.clear()
    this.render()
  }

  invalidatePortraits(): void {
    this.portraitCache.clear()
    this.render()
  }

  private say(text: string, kind: 'good' | 'bad' | '' = ''): void {
    this.message = text
    this.messageKind = kind
  }

  /**
   * Lightweight in-place timer update called every second.
   * Never replaces DOM nodes so button/card clicks are never interrupted.
   */
  updateTimers(now = Date.now()): void {
    const s = this.state
    const heartEl = this.hud.querySelector<HTMLElement>('[data-heart-timer]')
    if (heartEl) {
      heartEl.textContent =
        s.hearts >= HEART_MAX ? this.t.hudFull : formatClock(Math.max(0, s.nextHeartAt - now))
    }
    const timers = this.body.querySelectorAll<HTMLElement>('[data-matures-at]')
    for (const el of timers) {
      const target = Number(el.dataset.maturesAt)
      if (!Number.isNaN(target)) {
        el.textContent = `⏱ ${formatClock(Math.max(0, target - now))}`
      }
    }
  }

  render(now = Date.now()): void {
    document.documentElement.lang = this.locale === 'zh' ? 'zh-CN' : 'en'
    this.renderHud(now)
    this.renderNav()
    this.renderBody(now)
    this.renderShowcase()
  }

  private renderHud(now: number): void {
    const s = this.state
    const c = this.t
    const next = nextLevelExp(s.level)
    const prev = s.level > 1 ? (nextLevelExp(s.level - 1) ?? 0) : 0
    const span = next === null ? 1 : next - prev
    const filled = next === null ? 1 : Math.min(1, Math.max(0, (s.exp - prev) / span))
    const heartWait =
      s.hearts >= HEART_MAX ? c.hudFull : formatClock(Math.max(0, s.nextHeartAt - now))
    const placed = syncTank(s).length
    const cap = capacity(s)
    const prog = collectionProgress(s)

    const lvGroup = document.createElement('div')
    lvGroup.className = 'hud-lv-group'
    lvGroup.title =
      next === null
        ? `${c.hudLevel} ${s.level}${c.hudMax} · ${c.hudExp} ${s.exp}`
        : `${c.hudLevel} ${s.level} · ${s.exp} / ${next} EXP`

    const lvStat = stat(STAT_ICONS.level, c.hudLevel, `Lv.${s.level}`)
    const expBar = bar(filled)
    const expText = document.createElement('span')
    expText.className = 'hud-exp-text'
    expText.textContent = next === null ? `${s.exp}` : `${s.exp}/${next}`
    lvGroup.append(lvStat, expBar, expText)

    const heartStat = stat(STAT_ICONS.heart, c.hudHearts, `${s.hearts}/${HEART_MAX}`)
    const timerChip = document.createElement('span')
    timerChip.className = 'hud-sub'
    timerChip.dataset.heartTimer = '1'
    timerChip.textContent = heartWait
    heartStat.append(timerChip)

    const mode: ColorMode = s.colorMode ?? 'auto'
    const modeLabel =
      mode === 'auto' ? c.colorModeAuto : mode === 'light' ? c.colorModeLight : c.colorModeDark
    const modeBtn = makeIconButton(MODE_ICONS[mode], modeLabel, () => {
      const nextMode: ColorMode = mode === 'auto' ? 'light' : mode === 'light' ? 'dark' : 'auto'
      this.hooks.onColorModeChange(nextMode)
    })
    modeBtn.className = 'mode-btn'
    modeBtn.title = `${c.settingsColorModeHeading}: ${modeLabel}`

    const langBtn = makeButton(c.langToggle, () => {
      const nextLocale: Locale = this.locale === 'zh' ? 'en' : 'zh'
      this.hooks.onLocaleChange(nextLocale)
    })
    langBtn.className = 'lang-btn'

    this.hud.replaceChildren(
      lvGroup,
      stat(STAT_ICONS.tank, c.hudTank, `${placed}/${cap}`),
      stat(STAT_ICONS.bag, c.hudBag, `${s.fish.length}`),
      heartStat,
      stat(STAT_ICONS.book, c.hudSpecies, `${prog.owned}/${prog.total}`),
      modeBtn,
      langBtn,
    )
  }

  private renderNav(): void {
    const c = this.t
    this.nav.replaceChildren(
      ...TAB_IDS.map((id) => {
        const b = makeIconButton(TAB_ICONS[id], c.tabs[id], () => {
          this.tab = id
          this.confirmingReset = false
          this.say('')
          this.render()
        })
        b.setAttribute('aria-pressed', String(this.tab === id))
        b.title = c.tabs[id]
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
      case 'decor':
        nodes.push(...this.decorPanel())
        break
      case 'book':
        nodes.push(...this.bookPanel())
        break
      case 'settings':
        nodes.push(...this.settingsPanel())
        break
    }
    const log = document.createElement('div')
    log.className = `log${this.messageKind ? ` ${this.messageKind}` : ''}`
    log.textContent = this.message
    nodes.push(log)
    this.body.replaceChildren(...nodes)
  }

  // ---------------------------------------------------------------- tank

  private tankPanel(now: number): Node[] {
    const c = this.t
    const tankIds = new Set(syncTank(this.state))
    const cap = capacity(this.state)
    const title = heading(c.tankHeading(tankIds.size, cap, this.state.fish.length))
    const grid = document.createElement('div')
    grid.className = 'grid'
    const sorted = [...this.state.fish].sort((a, b) => a.bornAt - b.bornAt)
    for (const fish of sorted) {
      const inTank = tankIds.has(fish.uid)
      const isStarter = fish.tier === 0
      grid.append(
        this.fishCell(fish, now, {
          selected: inTank,
          tagText: inTank ? c.inTankTag : undefined,
          onClick: () => {
            const res = toggleTankFish(this.state, fish.uid)
            const name = speciesName(fish.speciesId, this.locale)
            const placedNow = syncTank(this.state).length
            if (res === 'placed') {
              this.hooks.onSave()
              this.say(c.placedMsg(name, placedNow, cap), 'good')
            } else if (res === 'removed') {
              this.hooks.onSave()
              this.say(c.removedFromTankMsg(name, placedNow, cap))
            } else {
              this.say(c.tankDisplayFullMsg(cap), 'bad')
            }
            this.render(now)
          },
          action: isStarter
            ? undefined
            : () => {
                const name = speciesName(fish.speciesId, this.locale)
                if (release(this.state, fish.uid)) {
                  this.breedPick = this.breedPick.filter((u) => u !== fish.uid)
                  this.mergePick = this.mergePick.filter((u) => u !== fish.uid)
                  this.hooks.onSave()
                  this.say(c.releasedMsg(name))
                }
                this.render(now)
              },
          actionLabel: isStarter ? undefined : c.releaseBtn,
        }),
      )
    }
    return [title, grid, note(c.tankNote)]
  }

  // --------------------------------------------------------------- breed

  private breedPanel(now: number): Node[] {
    const c = this.t
    const candidates = this.state.fish.filter((f) => f.tier === 0 || f.uses > 0)
    const eligible = candidates.filter((f) => isAdult(f, now))
    const eligibleIds = new Set(eligible.map((f) => f.uid))
    this.breedPick = this.breedPick.filter((uid) => eligibleIds.has(uid)).slice(-2)

    const out: Node[] = [heading(c.breedHeading(this.breedPick.length))]

    const grid = document.createElement('div')
    grid.className = 'grid'
    for (const fish of candidates) {
      const adult = isAdult(fish, now)
      const idx = this.breedPick.indexOf(fish.uid)
      const picked = idx !== -1
      grid.append(
        this.fishCell(fish, now, {
          selected: picked,
          pickOrder: picked ? idx + 1 : undefined,
          locked: !adult,
          onClick: () => {
            if (!adult) {
              this.say(c.breedError('not-adult'), 'bad')
              this.render(now)
              return
            }
            this.breedPick = picked
              ? this.breedPick.filter((u) => u !== fish.uid)
              : [...this.breedPick, fish.uid].slice(-2)
            this.say('')
            this.render(now)
          },
        }),
      )
    }
    out.push(grid)

    if (eligible.length < 2) {
      out.push(note(c.breedNotEnoughAdults))
    }

    const [aUid, bUid] = this.breedPick
    const a = aUid ? eligible.find((f) => f.uid === aUid) : undefined
    const b = bUid ? eligible.find((f) => f.uid === bUid) : undefined

    if (a && b) {
      out.push(heading(c.oddsHeading, 'h3'), this.oddsTable(a.tier, b.tier))
    }

    const row = document.createElement('div')
    row.className = 'row'
    const canBreed = Boolean(a && b)
    const go = makeButton(c.breedBtn(this.breedPick.length), () => {
      if (!a || !b) {
        this.say(c.breedError('needs-two'), 'bad')
        this.render(now)
        return
      }
      const clickNow = Date.now()
      const result = breed(this.state, a.uid, b.uid, clickNow)
      if ('error' in result) {
        this.say(c.breedError(result.error), 'bad')
      } else {
        const name = speciesName(result.child.speciesId, this.locale)
        const tName = tierName(result.tier, this.locale)
        this.say(
          c.hatchedMsg(
            name,
            stars(result.tier),
            tName,
            result.child.grade,
            result.expGained,
            result.novel,
          ),
          'good',
        )
        this.breedPick = []
        this.hooks.onSave()
        this.openShowcase(result)
      }
      this.render(clickNow)
    })
    go.setAttribute('aria-disabled', String(!canBreed))
    row.append(go)

    if (this.breedPick.length > 0) {
      const clear = makeButton(c.clearBtn, () => {
        this.breedPick = []
        this.say('')
        this.render(now)
      })
      row.append(clear)
    }

    out.push(row)
    return out
  }

  // --------------------------------------------------------------- merge

  private mergePanel(now: number): Node[] {
    const c = this.t
    const filter = syncMergeFilter(this.state)
    const mergeCandidates = filterMergeCandidates(this.state)
    const candidateIds = new Set(mergeCandidates.map((f) => f.uid))
    this.mergePick = this.mergePick.filter((uid) => candidateIds.has(uid)).slice(0, SYNTHESIS_INPUT_COUNT)

    const pickTier = this.mergePick.length
      ? this.state.fish.find((f) => f.uid === this.mergePick[0])?.tier
      : undefined
    if (pickTier !== undefined) {
      this.mergePick = this.mergePick.filter(
        (uid) => this.state.fish.find((f) => f.uid === uid)?.tier === pickTier,
      )
    }

    const out: Node[] = [heading(c.mergeHeading(SYNTHESIS_INPUT_COUNT, this.mergePick.length))]

    // Filter box matching PC FISH's filter/auto-select UI
    const filterBox = document.createElement('div')
    filterBox.className = 'filter-box'

    const condTitle = document.createElement('div')
    condTitle.className = 'filter-title'
    condTitle.textContent = c.mergeCondTitle

    const condList = document.createElement('div')
    condList.className = 'filter-list'
    condList.append(
      checkRow(c.mergeFilterZeroUses, filter.zeroUsesOnly, () => {
        filter.zeroUsesOnly = !filter.zeroUsesOnly
        this.hooks.onSave()
        this.render(now)
      }),
      checkRow(c.mergeFilterExcludeTank, filter.excludeInTank, () => {
        filter.excludeInTank = !filter.excludeInTank
        this.hooks.onSave()
        this.render(now)
      }),
    )

    const tierTitle = document.createElement('div')
    tierTitle.className = 'filter-title'
    tierTitle.textContent = c.mergeTierTitle

    const tierList = document.createElement('div')
    tierList.className = 'filter-tiers'
    const allMergeTiers: Tier[] = [1, 2, 3, 4]
    for (const t of allMergeTiers) {
      const checked = filter.tiers.includes(t)
      const countInTier = this.state.fish.filter(
        (f) =>
          f.tier === t &&
          (!filter.zeroUsesOnly || f.uses === 0) &&
          (!filter.excludeInTank || !syncTank(this.state).includes(f.uid)),
      ).length
      const row = checkRow(
        `${stars(t)} ${tierName(t, this.locale)} (${countInTier})`,
        checked,
        () => {
          if (checked) {
            filter.tiers = filter.tiers.filter((x) => x !== t)
          } else {
            filter.tiers = [...filter.tiers, t].sort((a, b) => a - b)
          }
          this.hooks.onSave()
          this.render(now)
        },
        `tier-${t}`,
      )
      tierList.append(row)
    }

    filterBox.append(condTitle, condList, tierTitle, tierList)
    out.push(filterBox)

    const grid = document.createElement('div')
    grid.className = 'grid'
    for (const fish of mergeCandidates) {
      const wrongTier = pickTier !== undefined && fish.tier !== pickTier
      const idx = this.mergePick.indexOf(fish.uid)
      const picked = idx !== -1
      const locked = wrongTier || fish.tier >= 5
      grid.append(
        this.fishCell(fish, now, {
          selected: picked,
          pickOrder: picked ? idx + 1 : undefined,
          locked,
          onClick: () => {
            if (fish.tier >= 5) {
              this.say(c.synthError('max-tier', SYNTHESIS_INPUT_COUNT), 'bad')
            } else if (wrongTier) {
              this.say(c.synthError('mixed-tier', SYNTHESIS_INPUT_COUNT), 'bad')
            } else {
              this.mergePick = picked
                ? this.mergePick.filter((u) => u !== fish.uid)
                : [...this.mergePick, fish.uid].slice(0, SYNTHESIS_INPUT_COUNT)
              this.say('')
            }
            this.render(now)
          },
        }),
      )
    }
    out.push(grid)

    if (mergeCandidates.length === 0) {
      out.push(note(c.mergeEmptyByFilter))
    }

    const row = document.createElement('div')
    row.className = 'row'
    const ready = this.mergePick.length === SYNTHESIS_INPUT_COUNT
    const go = makeButton(c.mergeBtn(this.mergePick.length, SYNTHESIS_INPUT_COUNT), () => {
      if (this.mergePick.length !== SYNTHESIS_INPUT_COUNT) {
        this.say(c.synthError('wrong-count', SYNTHESIS_INPUT_COUNT), 'bad')
        this.render(now)
        return
      }
      const clickNow = Date.now()
      const result = synthesize(this.state, this.mergePick, clickNow)
      if ('error' in result) {
        this.say(c.synthError(result.error, SYNTHESIS_INPUT_COUNT), 'bad')
      } else {
        const name = speciesName(result.child.speciesId, this.locale)
        const tName = tierName(result.child.tier, this.locale)
        this.say(c.mergedMsg(name, stars(result.child.tier), tName), 'good')
        this.mergePick = []
        this.hooks.onSave()
      }
      this.render(clickNow)
    })
    go.setAttribute('aria-disabled', String(!ready))

    const autoBtn = makeButton(c.mergeAutoPickBtn, () => {
      const picked = autoPickForMerge(this.state)
      this.mergePick = picked
      this.say(
        c.mergeAutoPickedMsg(picked.length, SYNTHESIS_INPUT_COUNT),
        picked.length === SYNTHESIS_INPUT_COUNT ? 'good' : '',
      )
      this.render(now)
    })
    autoBtn.setAttribute('aria-disabled', String(mergeCandidates.length === 0))

    const clear = makeButton(c.clearBtn, () => {
      this.mergePick = []
      this.say('')
      this.render(now)
    })
    clear.setAttribute('aria-disabled', String(this.mergePick.length === 0))

    row.append(go, autoBtn, clear)
    out.push(row, note(c.mergeNote))
    return out
  }

  // --------------------------------------------------------------- decor

  private decorPanel(): Node[] {
    const c = this.t
    const placedList = syncDecor(this.state)
    const placedIds = new Set(placedList.map((d) => d.id))
    const prog = decorProgress(this.state)
    const out: Node[] = [heading(c.decorHeading(placedIds.size, prog.unlocked, prog.total))]

    const grid = document.createElement('div')
    grid.className = 'grid'

    for (const item of DECORATIONS) {
      const unlocked = isDecorUnlocked(this.state, item.id)
      const placed = placedIds.has(item.id)
      const name = decorName(item.id, this.locale)
      const cell = document.createElement('div')
      cell.className = `cell${unlocked ? '' : ' locked'}`
      cell.setAttribute('aria-pressed', String(placed))

      cell.onclick = () => {
        const res = toggleDecor(this.state, item.id)
        if (res === 'locked') {
          this.say(c.decorLockedMsg(name, item.unlockLevel), 'bad')
        } else if (res === 'placed') {
          this.hooks.onSave()
          this.say(c.decorPlacedMsg(name), 'good')
        } else {
          this.hooks.onSave()
          this.say(c.decorRemovedMsg(name))
        }
        this.render()
      }

      cell.append(
        this.badge(unlocked ? 'ready' : 'none'),
        count(`Lv.${item.unlockLevel}`),
        this.decorPortrait(item, !unlocked),
        label(name, 'name'),
        label(
          unlocked ? c.decorUnlockedAt(item.unlockLevel) : c.decorUnlockAt(item.unlockLevel),
          'meta',
        ),
      )

      if (placed) {
        cell.append(label(c.decorPlacedTag, 'pick-order'))
        const flipBtn = makeButton(c.decorFlipBtn, (event) => {
          event.stopPropagation()
          if (flipDecor(this.state, item.id)) {
            this.hooks.onSave()
            this.say(c.decorFlippedMsg(name))
            this.render()
          }
        })
        cell.append(flipBtn)
      }

      grid.append(cell)
    }

    out.push(grid, note(c.decorNote))
    return out
  }

  // ---------------------------------------------------------------- book

  private bookPanel(): Node[] {
    const c = this.t
    const grid = document.createElement('div')
    grid.className = 'grid'
    for (const sp of SPECIES) {
      const owned = this.state.discovered.includes(sp.id)
      const cell = document.createElement('div')
      cell.className = `cell${owned ? '' : ' locked'}`
      cell.onclick = () => {
        if (owned) {
          this.say(
            `${speciesName(sp.id, this.locale)} — ${stars(sp.tier)} ${tierName(sp.tier, this.locale)}`,
          )
        } else {
          this.say('???')
        }
        this.render()
      }
      cell.append(
        this.portrait(sp, sp.tier, owned ? 3 : 1, !owned),
        label(owned ? speciesName(sp.id, this.locale) : '???', 'name'),
        this.tierMetaLine(sp.tier),
      )
      grid.append(cell)
    }
    return [heading(c.bookHeading), grid]
  }

  // ------------------------------------------------------------ settings

  private settingsPanel(): Node[] {
    const c = this.t
    const out: Node[] = [heading(c.settingsThemeHeading)]
    const themeRow = document.createElement('div')
    themeRow.className = 'row'
    for (const theme of this.hooks.themes) {
      const b = makeButton(themeName(theme.id, theme.name, this.locale), () => {
        this.hooks.onThemeChange(theme.id)
      })
      b.setAttribute('aria-pressed', String(this.state.theme === theme.id))
      themeRow.append(b)
    }

    const modeRow = document.createElement('div')
    modeRow.className = 'row'
    const currentMode: ColorMode = this.state.colorMode ?? 'auto'
    const modes: { id: ColorMode; label: string }[] = [
      { id: 'auto', label: c.colorModeAuto },
      { id: 'light', label: c.colorModeLight },
      { id: 'dark', label: c.colorModeDark },
    ]
    for (const m of modes) {
      const b = makeIconButton(MODE_ICONS[m.id], m.label, () => {
        this.hooks.onColorModeChange(m.id)
      })
      b.className = 'icon-btn'
      b.setAttribute('aria-pressed', String(currentMode === m.id))
      modeRow.append(b)
    }

    const langRow = document.createElement('div')
    langRow.className = 'row'
    const zhBtn = makeButton('简体中文', () => this.hooks.onLocaleChange('zh'))
    zhBtn.setAttribute('aria-pressed', String(this.locale === 'zh'))
    const enBtn = makeButton('English', () => this.hooks.onLocaleChange('en'))
    enBtn.setAttribute('aria-pressed', String(this.locale === 'en'))
    langRow.append(zhBtn, enBtn)

    out.push(
      themeRow,
      note(c.settingsThemeNote),
      heading(c.settingsColorModeHeading, 'h3'),
      modeRow,
      note(c.settingsColorModeNote),
      heading(c.settingsLangHeading, 'h3'),
      langRow,
      heading(c.settingsTradeHeading, 'h3'),
      note(
        this.state.level >= TRADE_HUB_LEVEL
          ? c.settingsTradeUnlocked
          : c.settingsTradeLocked(TRADE_HUB_LEVEL),
      ),
      heading(c.settingsSaveHeading, 'h3'),
    )

    const danger = document.createElement('div')
    danger.className = 'row'
    if (!this.confirmingReset) {
      const reset = makeButton(c.resetBtn, () => {
        this.confirmingReset = true
        this.render()
      })
      danger.append(reset)
    } else {
      const confirmBtn = makeButton(c.confirmResetBtn, () => {
        this.confirmingReset = false
        this.hooks.onReset()
        this.say(this.t.resetDoneMsg, 'good')
        this.render()
      })
      confirmBtn.className = 'danger-confirm'
      const cancelBtn = makeButton(c.cancelBtn, () => {
        this.confirmingReset = false
        this.render()
      })
      danger.append(confirmBtn, cancelBtn)
    }
    out.push(danger, note(c.settingsSaveNote))
    return out
  }

  // ------------------------------------------------------------- showcase

  private openShowcase(outcome: BreedOutcome): void {
    const decor = DECORATIONS[Math.floor(Math.random() * DECORATIONS.length)] ?? DECORATIONS[0]!
    const decorX = 0.28 + Math.random() * 0.44
    const decorFlip: 1 | -1 = Math.random() < 0.5 ? 1 : -1
    const sp = species(outcome.child.speciesId)
    this.showcase = {
      outcome,
      decor,
      decorX,
      decorFlip,
      agent: {
        fish: outcome.child,
        species: sp,
        x: MINI_TANK_W * 0.5,
        y: MINI_TANK_H * 0.42,
        dir: 1,
        speed: 32,
        phase: 0,
        scale: 0.9,
      },
    }
    this.startShowcaseLoop()
  }

  private closeShowcase(): void {
    this.showcase = null
    this.showcaseCanvas = null
    if (this.showcaseRaf) {
      cancelAnimationFrame(this.showcaseRaf)
      this.showcaseRaf = 0
    }
    this.modal.replaceChildren()
  }

  private renderShowcase(): void {
    if (!this.showcase) {
      this.modal.replaceChildren()
      return
    }
    const { outcome, decor } = this.showcase
    const { child, novel, expGained } = outcome
    const c = this.t

    const backdrop = document.createElement('div')
    backdrop.className = 'showcase-backdrop'
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.closeShowcase()
    })

    const card = document.createElement('div')
    card.className = `showcase-card tier-border-${child.tier}`

    const header = document.createElement('div')
    header.className = 'showcase-header'
    const title = document.createElement('span')
    title.className = 'showcase-title'
    title.textContent = c.showcaseTitle
    header.append(title)

    if (novel) {
      const newBadge = document.createElement('span')
      newBadge.className = 'new-badge'
      newBadge.textContent = c.showcaseNewBadge
      header.append(newBadge)
    }

    const tankWrap = document.createElement('div')
    tankWrap.className = 'mini-tank-wrap'
    const miniCanvas = document.createElement('canvas')
    miniCanvas.className = 'mini-tank'
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    miniCanvas.width = Math.round(MINI_TANK_W * dpr)
    miniCanvas.height = Math.round(MINI_TANK_H * dpr)
    miniCanvas.style.width = `${MINI_TANK_W}px`
    miniCanvas.style.height = `${MINI_TANK_H}px`
    this.showcaseCanvas = miniCanvas
    tankWrap.append(miniCanvas)

    if (novel) {
      const cornerNew = document.createElement('span')
      cornerNew.className = 'mini-tank-new'
      cornerNew.textContent = c.showcaseNewBadge
      tankWrap.append(cornerNew)
    }

    const nameRow = document.createElement('div')
    nameRow.className = 'showcase-name-row'
    const fishName = document.createElement('div')
    fishName.className = 'showcase-name'
    fishName.textContent = speciesName(child.speciesId, this.locale)
    nameRow.append(fishName)

    const metaLine = this.tierMetaLine(child.tier, child.grade)
    metaLine.classList.add('showcase-meta')

    const chips = document.createElement('div')
    chips.className = 'showcase-chips'
    const maxU = child.maxUses ?? USES_BY_TIER[child.tier]
    const usesStr = child.tier === 0 ? '∞' : `${child.uses}/${maxU}`

    const usesChip = document.createElement('span')
    usesChip.className = 'showcase-chip'
    usesChip.textContent = c.showcaseUsesLabel(usesStr)

    const expChip = document.createElement('span')
    expChip.className = 'showcase-chip exp'
    expChip.textContent = `+${expGained} EXP`

    const decorChip = document.createElement('span')
    decorChip.className = 'showcase-chip'
    decorChip.textContent = c.showcaseDecorLabel(decorName(decor.id, this.locale))

    chips.append(usesChip, expChip, decorChip)

    const closeBtn = makeButton(c.showcaseCloseBtn, () => this.closeShowcase())
    closeBtn.className = 'showcase-btn'

    card.append(header, tankWrap, nameRow, metaLine, chips, closeBtn)
    backdrop.append(card)
    this.modal.replaceChildren(backdrop)

    this.drawShowcaseFrame(performance.now())
  }

  private startShowcaseLoop(): void {
    if (this.showcaseRaf) cancelAnimationFrame(this.showcaseRaf)
    this.showcaseLastMs = performance.now()
    const step = (nowMs: number) => {
      if (!this.showcase) {
        this.showcaseRaf = 0
        return
      }
      this.drawShowcaseFrame(nowMs)
      this.showcaseRaf = requestAnimationFrame(step)
    }
    this.showcaseRaf = requestAnimationFrame(step)
  }

  private drawShowcaseFrame(nowMs: number): void {
    if (!this.showcase || !this.showcaseCanvas) return
    const dt = Math.min(0.1, Math.max(0, (nowMs - this.showcaseLastMs) / 1000))
    this.showcaseLastMs = nowMs
    const elapsed = nowMs / 1000

    const { agent, decor, decorX, decorFlip } = this.showcase
    agent.x += agent.dir * agent.speed * dt
    agent.y = MINI_TANK_H * 0.42 + Math.sin(elapsed * 1.8) * 6

    const halfLen = agent.species.body.length * 4.2 * agent.scale * 0.5
    const margin = Math.max(32, halfLen + 10)
    if (agent.x < margin) {
      agent.x = margin
      agent.dir = 1
    } else if (agent.x > MINI_TANK_W - margin) {
      agent.x = MINI_TANK_W - margin
      agent.dir = -1
    }

    const decorNode: DecorNode = {
      item: decor,
      x: decorX * MINI_TANK_W,
      flip: decorFlip,
      active: false,
    }

    const ctx = this.showcaseCanvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const night = resolveDarkMode(this.state.colorMode ?? 'auto')
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.renderer.scene(ctx, {
      width: MINI_TANK_W,
      height: MINI_TANK_H,
      agents: [agent],
      decors: [decorNode],
      time: elapsed,
      night,
    })
    ctx.restore()
  }

  // ------------------------------------------------------------- helpers

  private portrait(sp: Species, tier: Tier, grade: Grade, dim = false): HTMLCanvasElement {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = 96
    const h = 52
    const mode = document.documentElement.dataset.mode ?? 'dark'
    const key = `fish:${this.renderer.manifest.id}:${mode}:${sp.id}:${tier}:${grade}:${dim ? 1 : 0}:${dpr}`

    let cached = this.portraitCache.get(key)
    if (!cached) {
      cached = document.createElement('canvas')
      cached.width = w * dpr
      cached.height = h * dpr
      const ctx = cached.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
        this.renderer.portrait(ctx, w, h, { species: sp, tier, grade, dim })
      }
      this.portraitCache.set(key, cached)
    }

    const canvas = document.createElement('canvas')
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const outCtx = canvas.getContext('2d')
    if (outCtx) outCtx.drawImage(cached, 0, 0)
    return canvas
  }

  private decorPortrait(item: DecorItem, dim = false): HTMLCanvasElement {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = 96
    const h = 56
    const mode = document.documentElement.dataset.mode ?? 'dark'
    const key = `decor:${this.renderer.manifest.id}:${mode}:${item.id}:${dim ? 1 : 0}:${dpr}`

    let cached = this.portraitCache.get(key)
    if (!cached) {
      cached = document.createElement('canvas')
      cached.width = w * dpr
      cached.height = h * dpr
      const ctx = cached.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
        this.renderer.decorPortrait(ctx, w, h, { item, dim })
      }
      this.portraitCache.set(key, cached)
    }

    const canvas = document.createElement('canvas')
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const outCtx = canvas.getContext('2d')
    if (outCtx) outCtx.drawImage(cached, 0, 0)
    return canvas
  }

  private fishCell(
    fish: Fish,
    now: number,
    opts: {
      selected?: boolean
      pickOrder?: number
      tagText?: string
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
    if (opts.onClick) cell.onclick = opts.onClick

    const maxU = fish.maxUses ?? USES_BY_TIER[fish.tier]
    const usesText = fish.tier === 0 ? '∞' : `${fish.uses}/${maxU}`
    const canUse = adult && (fish.tier === 0 || fish.uses > 0)

    cell.append(
      this.badge(canUse ? 'ready' : adult ? 'none' : 'partial'),
      count(usesText),
      this.portrait(sp, fish.tier, fish.grade, !adult),
      label(speciesName(sp.id, this.locale), 'name'),
      this.tierMetaLine(fish.tier, fish.grade),
    )
    if (opts.pickOrder !== undefined) {
      cell.append(label(`#${opts.pickOrder}`, 'pick-order'))
    } else if (opts.tagText) {
      cell.append(label(opts.tagText, 'pick-order'))
    }
    if (!adult && fish.maturesAt !== null) {
      const timerEl = label(`⏱ ${formatClock(fish.maturesAt - now)}`, 'timer')
      timerEl.dataset.maturesAt = String(fish.maturesAt)
      cell.append(timerEl)
    }
    if (opts.action && opts.actionLabel) {
      const b = makeButton(opts.actionLabel, (event) => {
        event.stopPropagation()
        opts.action?.()
      })
      cell.append(b)
    }
    cell.title = this.describe(fish, now)
    return cell
  }

  private tierMetaLine(tier: Tier, grade?: Grade): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'meta'

    const starSpan = document.createElement('span')
    starSpan.className = `stars${tier === 0 ? ' stars-zero' : ''}`
    starSpan.textContent = stars(tier)

    const tierSpan = document.createElement('span')
    tierSpan.className = `tier-tag tier-${tier}`
    tierSpan.textContent = tierName(tier, this.locale)

    wrap.append(starSpan, ' ', tierSpan)

    if (grade !== undefined) {
      const sep = document.createElement('span')
      sep.className = 'meta-sep'
      sep.textContent = ' · '

      const gradeSpan = document.createElement('span')
      gradeSpan.className = `grade-tag grade-${grade}`
      gradeSpan.textContent = this.t.gradeLabel(grade)

      wrap.append(sep, gradeSpan)
    }

    return wrap
  }

  private badge(kind: 'ready' | 'partial' | 'none'): HTMLElement {
    const c = this.t
    const el = document.createElement('div')
    el.className = `badge${kind === 'ready' ? '' : ' idle'}`
    el.textContent = kind === 'none' ? '·' : '↓'
    el.title =
      kind === 'ready'
        ? c.badgeReadyTitle
        : kind === 'partial'
          ? c.badgePartialTitle
          : c.badgeNoneTitle
    return el
  }

  private oddsTable(a: Tier, b: Tier): HTMLElement {
    const odds = tierOdds(a, b)
    const table = document.createElement('table')
    table.className = 'odds'
    const head = document.createElement('tr')
    head.append(
      th(this.t.pairingCol),
      ...odds.map((_, i) => {
        const t = (i + 1) as Tier
        const cell = th(`${stars(t)} ${tierName(t, this.locale)}`)
        cell.className = `tier-${t}`
        return cell
      }),
    )
    const row = document.createElement('tr')
    row.append(
      td(`${stars(a)} + ${stars(b)}`),
      ...odds.map((value, i) => {
        const cell = td(`${value}%`)
        if (value > 0) cell.className = `tier-${i + 1}`
        return cell
      }),
    )
    table.append(head, row)
    return table
  }

  private describe(fish: Fish, now: number): string {
    const c = this.t
    const name = speciesName(fish.speciesId, this.locale)
    const tName = tierName(fish.tier, this.locale)
    const maxU = fish.maxUses ?? USES_BY_TIER[fish.tier]
    const usesStr = fish.tier === 0 ? '∞' : `${fish.uses}/${maxU}`
    const stateStr = isAdult(fish, now)
      ? c.describeAdult
      : c.describeFry(formatClock((fish.maturesAt ?? now) - now))
    return c.describeFish(name, stars(fish.tier), tName, fish.grade, usesStr, stateStr)
  }
}

function makeButton(text: string, onClick: (event: MouseEvent) => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = text
  b.addEventListener('click', onClick)
  return b
}

function makeIconButton(
  svgHtml: string,
  text: string,
  onClick: (event: MouseEvent) => void,
): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  const ico = document.createElement('span')
  ico.className = 'ico'
  ico.innerHTML = svgHtml
  const txt = document.createElement('span')
  txt.className = 'btn-text'
  txt.textContent = text
  b.append(ico, txt)
  b.addEventListener('click', onClick)
  return b
}

function checkRow(
  text: string,
  checked: boolean,
  onToggle: () => void,
  extraClass = '',
): HTMLButtonElement {
  const row = document.createElement('button')
  row.type = 'button'
  row.className = `check-row${extraClass ? ` ${extraClass}` : ''}`
  row.setAttribute('aria-checked', String(checked))
  row.setAttribute('role', 'checkbox')

  const labelSpan = document.createElement('span')
  labelSpan.className = 'check-label'
  labelSpan.textContent = text

  const box = document.createElement('span')
  box.className = 'check-box'
  const dot = document.createElement('span')
  dot.className = 'check-dot'
  box.append(dot)

  row.append(labelSpan, box)
  row.addEventListener('click', onToggle)
  return row
}

function stat(svgHtml: string, labelText: string, value: string): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'stat'
  wrap.title = `${labelText}: ${value}`
  const ico = document.createElement('span')
  ico.className = 'ico'
  ico.innerHTML = svgHtml
  const l = document.createElement('span')
  l.className = 'label'
  l.textContent = labelText
  const v = document.createElement('b')
  v.textContent = value
  wrap.append(ico, l, v)
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
