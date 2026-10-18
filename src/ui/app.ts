import {
  HEART_MAX,
  MAX_LEVEL,
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
import type { DecorItem, Fish, GameState, Grade, Locale, Species, Tier } from '../core/types'
import type { Renderer } from '../render/renderer'

type Tab = 'tank' | 'breed' | 'merge' | 'decor' | 'book' | 'settings'

const TAB_IDS: readonly Tab[] = ['tank', 'breed', 'merge', 'decor', 'book', 'settings']

export interface AppHooks {
  onThemeChange(id: string): void
  onLocaleChange(locale: Locale): void
  onSave(): void
  onReset(): void
  themes: { id: string; name: string }[]
}

export class App {
  private tab: Tab = 'tank'
  private breedPick: string[] = []
  private mergePick: string[] = []
  private confirmingReset = false
  private message = ''
  private messageKind: 'good' | 'bad' | '' = ''
  private portraitCache = new Map<string, HTMLCanvasElement>()

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

  private get locale(): Locale {
    return this.state.locale ?? detectLocale()
  }

  private get t(): Copy {
    return copy(this.locale)
  }

  mount(root: HTMLElement): void {
    root.replaceChildren(this.hud, this.canvas, this.nav, this.body)
    this.render()
  }

  setState(state: GameState): void {
    this.state = state
    this.breedPick = []
    this.mergePick = []
    this.confirmingReset = false
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

    const topRow = document.createElement('div')
    topRow.className = 'hud-top'

    const lvStat = stat(c.hudLevel, `Lv.${s.level}${s.level >= MAX_LEVEL ? c.hudMax : ''}`)
    lvStat.className = 'stat hud-lv'

    const expBar = bar(filled)
    const expText = document.createElement('span')
    expText.className = 'hud-exp-text'
    expText.textContent = next === null ? `${c.hudExp} ${s.exp}` : `${s.exp} / ${next} EXP`

    const langBtn = makeButton(c.langToggle, () => {
      const nextLocale: Locale = this.locale === 'zh' ? 'en' : 'zh'
      this.hooks.onLocaleChange(nextLocale)
    })
    langBtn.className = 'lang-btn'

    topRow.append(lvStat, expBar, expText, langBtn)

    const grid = document.createElement('div')
    grid.className = 'hud-grid'

    const placed = syncTank(s).length
    const cap = capacity(s)

    const heartStat = stat(c.hudHearts, `${s.hearts}/${HEART_MAX}`)
    const timerChip = document.createElement('span')
    timerChip.className = 'hud-sub'
    timerChip.dataset.heartTimer = '1'
    timerChip.textContent = heartWait
    heartStat.append(timerChip)

    grid.append(
      stat(c.hudTank, `${placed}/${cap}`),
      stat(c.hudBag, `${s.fish.length}`),
      heartStat,
      stat(c.hudSpecies, `${collectionProgress(s).owned}/${collectionProgress(s).total}`),
    )

    this.hud.replaceChildren(topRow, grid)
  }

  private renderNav(): void {
    const c = this.t
    this.nav.replaceChildren(
      ...TAB_IDS.map((id) => {
        const b = makeButton(c.tabs[id], () => {
          this.tab = id
          this.confirmingReset = false
          this.say('')
          this.render()
        })
        b.setAttribute('aria-pressed', String(this.tab === id))
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
        label(tierName(sp.tier, this.locale), `meta tier-${sp.tier}`),
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

  // ------------------------------------------------------------- helpers

  private portrait(sp: Species, tier: Tier, grade: Grade, dim = false): HTMLCanvasElement {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = 96
    const h = 52
    const key = `fish:${this.renderer.manifest.id}:${sp.id}:${tier}:${grade}:${dim ? 1 : 0}:${dpr}`

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
    const key = `decor:${this.renderer.manifest.id}:${item.id}:${dim ? 1 : 0}:${dpr}`

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
      label(
        `${stars(fish.tier)} ${tierName(fish.tier, this.locale)} · ${this.t.gradeLabel(fish.grade)}`,
        `meta tier-${fish.tier}`,
      ),
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
      ...odds.map((_, i) => th(tierName((i + 1) as Tier, this.locale))),
    )
    const row = document.createElement('tr')
    row.append(td(`${stars(a)} + ${stars(b)}`), ...odds.map((value) => td(`${value}%`)))
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
