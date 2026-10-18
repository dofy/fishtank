import { sound, syncAudioConfig } from '../core/audio'
import {
  BREEDING_MATRIX,
  EXP_BY_TIER,
  GROWTH_MS_BY_TIER,
  HEART_MAX,
  LEVELS,
  SYNTHESIS_INPUT_COUNT,
  USES_BY_TIER,
  nextLevelExp,
} from '../core/balance'
import {
  autoPickForMerge,
  breed,
  capacity,
  collectionProgress,
  decorCapacity,
  decorProgress,
  discoveredGradesFor,
  filterMergeCandidates,
  flipDecor,
  isAdult,
  isDecorUnlocked,
  release,
  sortBreedCandidates,
  sortTankFish,
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
  AudioConfig,
  BgmTrackId,
  BreedOutcome,
  ColorMode,
  DecorItem,
  Fish,
  FishSort,
  GameState,
  Grade,
  Locale,
  Species,
  SpeciesId,
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
  breed: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8s2.5-4.5 7-4.5c2.2 0 4 1.5 5 2.5l1.5-1.5v7L13.5 10c-1 1-2.8 2.5-5 2.5-4.5 0-7-4.5-7-4.5Z"/><circle cx="5.5" cy="7.5" r="0.8" fill="currentColor"/></svg>',
  book: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3h4.2c1 0 1.3.5 1.3 1.3v9.2c0-.7-.5-1-1.3-1H2.5V3Zm11 0H9.3C8.3 3 8 3.5 8 4.3v9.2c0-.7.5-1 1.3-1h4.2V3Z"/></svg>',
}

const HEART_SVG = {
  solid: '<svg viewBox="0 0 16 16" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M8 13.6S2 9.7 2 5.6A3.1 3.1 0 0 1 8 4.3a3.1 3.1 0 0 1 6 1.3c0 4.1-6 8-6 8Z"/></svg>',
  outline: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M8 13.6S2 9.7 2 5.6A3.1 3.1 0 0 1 8 4.3a3.1 3.1 0 0 1 6 1.3c0 4.1-6 8-6 8Z"/></svg>',
}

const MODE_ICONS: Record<ColorMode, string> = {
  auto: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5v11A5.5 5.5 0 0 0 8 2.5Z" fill="currentColor"/></svg>',
  light: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v1.8m0 9.4v1.8M1.5 8h1.8m9.4 0h1.8M3.4 3.4l1.3 1.3m6.6 6.6 1.3 1.3m0-9.2-1.3 1.3M4.7 11.3 3.4 12.6"/></svg>',
  dark: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.2 9.8A5.5 5.5 0 0 1 6.2 2.8a5.5 5.5 0 1 0 7 7Z"/></svg>',
}

const AUDIO_ICONS = {
  on: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h2.5L9 3v10L5.5 10H3V6Z"/><path d="M11.5 5.5a3.5 3.5 0 0 1 0 5M13.2 3.8a6 6 0 0 1 0 8.4"/></svg>',
  off: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h2.5L9 3v10L5.5 10H3V6Z"/><path d="m11 6 4 4m0-4-4 4"/></svg>',
}

const IMMERSIVE_ICONS = {
  enter: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>',
  exit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5.5 8l4.5 4.5M6 8h7.5"/></svg>',
}

const HELP_ICON =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M6.3 6.2a1.8 1.8 0 1 1 2.5 1.7c-.6.3-.8.6-.8 1.3"/><circle cx="8" cy="11.5" r="0.6" fill="currentColor"/></svg>'

const GITHUB_ICON =
  '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8.01 8.01 0 0 0 8 .2Z"/></svg>'

export const APP_VERSION = '1.4.1'
export const GITHUB_URL = 'https://github.com/dofy/fishtank'

export interface AppHooks {
  onThemeChange(id: string): void
  onColorModeChange(mode: ColorMode): void
  onAudioChange(audio: AudioConfig): void
  onLocaleChange(locale: Locale): void
  onSave(): void
  onReset(): void
  themes: { id: string; name: string }[]
}

interface CeremonyData {
  kind: 'breed' | 'merge'
  parents: Fish[]
  outcome: BreedOutcome
  startedAt: number
  durationMs: number
  revealed: boolean
}

interface ShowcaseState {
  ceremony?: CeremonyData
  kind: 'breed' | 'merge'
  outcome: BreedOutcome
  decor: DecorItem
  decorX: number
  decorFlip: 1 | -1
  agent: Agent
}

const MINI_TANK_W = 296
const MINI_TANK_H = 164
const CEREMONY_MS = 1350

export class App {
  private tab: Tab = 'tank'
  private breedPick: string[] = []
  private mergePick: string[] = []
  private confirmingReset = false
  private confirmingReleaseUid: string | null = null
  private bookDetailSpeciesId: SpeciesId | null = null
  private bookDetailGrade: Grade = 1
  private bookSelectedUid: string | null = null
  private immersive = false
  private helpOpen = false
  private portraitCache = new Map<string, HTMLCanvasElement>()
  private showcase: ShowcaseState | null = null
  private showcaseCanvas: HTMLCanvasElement | null = null
  private showcaseRaf = 0
  private showcaseLastMs = 0

  readonly canvas = document.createElement('canvas')
  private readonly hud = document.createElement('header')
  private readonly nav = document.createElement('nav')
  private readonly body = document.createElement('section')
  private readonly footer = document.createElement('footer')
  private readonly modal = document.createElement('div')
  private readonly toastHost = document.createElement('div')

  constructor(
    private state: GameState,
    private renderer: Renderer,
    private readonly hooks: AppHooks,
  ) {
    this.hud.className = 'hud'
    this.nav.className = 'tabs'
    this.body.className = 'panel'
    this.footer.className = 'app-footer'
    this.modal.className = 'modal-host'
    this.toastHost.className = 'toast-host'
    this.canvas.id = 'tank'
  }

  private get locale(): Locale {
    return this.state.locale ?? detectLocale()
  }

  private get t(): Copy {
    return copy(this.locale)
  }

  mount(root: HTMLElement): void {
    root.replaceChildren(
      this.hud,
      this.canvas,
      this.nav,
      this.body,
      this.footer,
      this.modal,
      this.toastHost,
    )
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.helpOpen) {
          this.helpOpen = false
          this.renderShowcase()
        } else if (this.immersive) {
          this.setImmersive(false)
        }
      }
    })
    this.render()
  }

  isImmersive(): boolean {
    return this.immersive
  }

  private setImmersive(next: boolean): void {
    this.immersive = next
    document.documentElement.dataset.immersive = next ? 'on' : 'off'
    document.documentElement.dataset.hudIdle = 'off'
    this.render()
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('pointermove'))
  }

  setState(state: GameState): void {
    this.state = state
    this.breedPick = []
    this.mergePick = []
    this.confirmingReset = false
    this.confirmingReleaseUid = null
    this.bookDetailSpeciesId = null
    this.bookSelectedUid = null
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
    if (!text) return
    if (kind === 'bad') sound.play('error')
    this.showToast(text, kind)
  }

  private showToast(text: string, kind: 'good' | 'bad' | '' = ''): void {
    while (this.toastHost.children.length >= 3) {
      this.toastHost.firstElementChild?.remove()
    }

    const toast = document.createElement('div')
    toast.className = `toast${kind ? ` ${kind}` : ''}`
    toast.setAttribute('role', 'status')

    const icon = document.createElement('span')
    icon.className = 'toast-icon'
    icon.textContent = kind === 'bad' ? '!' : kind === 'good' ? '✓' : 'i'

    const body = document.createElement('span')
    body.className = 'toast-text'
    body.textContent = text

    toast.append(icon, body)

    const dismiss = () => {
      if (!toast.isConnected) return
      toast.classList.add('toast-out')
      window.setTimeout(() => toast.remove(), 180)
    }

    toast.addEventListener('click', dismiss)
    this.toastHost.append(toast)
    window.setTimeout(dismiss, kind === 'bad' ? 3400 : 2600)
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
        el.textContent = formatClock(Math.max(0, target - now))
      }
    }
  }

  render(now = Date.now()): void {
    document.documentElement.lang = this.locale === 'zh' ? 'zh-CN' : 'en'
    this.renderHud(now)
    this.renderNav()
    this.renderBody(now)
    this.renderFooter()
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

    const heartStat = document.createElement('div')
    heartStat.className = 'stat'
    heartStat.title = `${c.hudHearts}: ${s.hearts}/${HEART_MAX} (${heartWait})`

    const breedIco = document.createElement('span')
    breedIco.className = 'ico'
    breedIco.innerHTML = STAT_ICONS.breed

    const breedLabel = document.createElement('span')
    breedLabel.className = 'label'
    breedLabel.textContent = c.hudHearts

    const heartsRow = document.createElement('span')
    heartsRow.className = 'hud-hearts'
    for (let i = 0; i < HEART_MAX; i++) {
      const filledHeart = i < s.hearts
      const hSpan = document.createElement('span')
      hSpan.className = `heart-pip${filledHeart ? ' filled' : ' empty'}`
      hSpan.innerHTML = filledHeart ? HEART_SVG.solid : HEART_SVG.outline
      heartsRow.append(hSpan)
    }

    const timerChip = document.createElement('span')
    timerChip.className = 'hud-sub'
    timerChip.dataset.heartTimer = '1'
    timerChip.textContent = heartWait
    heartStat.append(breedIco, breedLabel, heartsRow, timerChip)

    const mode: ColorMode = s.colorMode ?? 'auto'
    const modeLabel =
      mode === 'auto' ? c.colorModeAuto : mode === 'light' ? c.colorModeLight : c.colorModeDark
    const modeBtn = makeIconButton(MODE_ICONS[mode], modeLabel, () => {
      sound.play('click')
      const nextMode: ColorMode = mode === 'auto' ? 'light' : mode === 'light' ? 'dark' : 'auto'
      this.hooks.onColorModeChange(nextMode)
    })
    modeBtn.className = 'mode-btn'
    modeBtn.title = `${c.settingsColorModeHeading}: ${modeLabel}`

    const langBtn = makeButton(c.langToggle, () => {
      sound.play('click')
      const nextLocale: Locale = this.locale === 'zh' ? 'en' : 'zh'
      this.hooks.onLocaleChange(nextLocale)
    })
    langBtn.className = 'lang-btn'

    const immersiveBtn = makeIconButton(
      this.immersive ? IMMERSIVE_ICONS.exit : IMMERSIVE_ICONS.enter,
      this.immersive ? c.exitImmersiveBtn : c.immersiveBtn,
      () => {
        sound.play('click')
        this.setImmersive(!this.immersive)
      },
    )
    immersiveBtn.className = `mode-btn immersive-btn${this.immersive ? ' btn-primary' : ''}`
    immersiveBtn.title = this.immersive ? c.exitImmersiveBtn : c.immersiveBtn

    const actions = document.createElement('div')
    actions.className = 'hud-actions'
    actions.append(modeBtn, langBtn, immersiveBtn)

    this.hud.replaceChildren(
      lvGroup,
      stat(STAT_ICONS.tank, c.hudTank, `${placed}/${cap}`),
      stat(STAT_ICONS.bag, c.hudBag, `${s.fish.length}`),
      heartStat,
      stat(STAT_ICONS.book, c.hudSpecies, `${prog.owned}/${prog.total}`),
      actions,
    )
  }

  private renderNav(): void {
    const c = this.t
    this.nav.replaceChildren(
      ...TAB_IDS.map((id) => {
        const b = makeIconButton(TAB_ICONS[id], c.tabs[id], () => {
          sound.play('click')
          this.tab = id
          this.confirmingReset = false
          this.confirmingReleaseUid = null
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
    this.body.replaceChildren(...nodes)
  }

  // ---------------------------------------------------------------- tank

  private tankPanel(now: number): Node[] {
    const c = this.t
    const tankIds = new Set(syncTank(this.state))
    const cap = capacity(this.state)
    const currentSort: FishSort = this.state.tankSort ?? 'inTank'

    const headRow = document.createElement('div')
    headRow.className = 'panel-head'
    headRow.append(heading(c.tankHeading(tankIds.size, cap, this.state.fish.length)))

    const sortBar = document.createElement('div')
    sortBar.className = 'sort-bar'
    const sortLbl = document.createElement('span')
    sortLbl.className = 'sort-label'
    sortLbl.textContent = c.sortLabel
    sortBar.append(sortLbl)

    const sorts: { id: FishSort; label: string }[] = [
      { id: 'inTank', label: c.sortInTank },
      { id: 'tier', label: c.sortTier },
      { id: 'grade', label: c.sortGrade },
      { id: 'uses', label: c.sortUses },
      { id: 'acquired', label: c.sortAcquired },
    ]
    for (const s of sorts) {
      const b = makeButton(s.label, () => {
        sound.play('click')
        this.state.tankSort = s.id
        this.hooks.onSave()
        this.render(now)
      })
      b.className = 'sort-btn'
      b.setAttribute('aria-pressed', String(currentSort === s.id))
      sortBar.append(b)
    }
    headRow.append(sortBar)

    const grid = document.createElement('div')
    grid.className = 'grid'
    const sorted = sortTankFish(this.state.fish, currentSort, tankIds)
    for (const fish of sorted) {
      const inTank = tankIds.has(fish.uid)
      const isStarter = fish.tier === 0
      const confirmingRelease = this.confirmingReleaseUid === fish.uid
      grid.append(
        this.fishCell(fish, now, {
          selected: inTank,
          onClick: () => {
            this.confirmingReleaseUid = null
            const res = toggleTankFish(this.state, fish.uid)
            const name = speciesName(fish.speciesId, this.locale)
            const placedNow = syncTank(this.state).length
            if (res === 'placed') {
              sound.play('place')
              this.hooks.onSave()
              this.say(c.placedMsg(name, placedNow, cap), 'good')
            } else if (res === 'removed') {
              sound.play('select')
              this.hooks.onSave()
              this.say(c.removedFromTankMsg(name, placedNow, cap))
            } else {
              this.say(c.tankDisplayFullMsg(cap), 'bad')
            }
            this.render(now)
          },
          action: isStarter
            ? undefined
            : confirmingRelease
              ? () => {
                  const name = speciesName(fish.speciesId, this.locale)
                  this.confirmingReleaseUid = null
                  if (release(this.state, fish.uid)) {
                    sound.play('release')
                    this.breedPick = this.breedPick.filter((u) => u !== fish.uid)
                    this.mergePick = this.mergePick.filter((u) => u !== fish.uid)
                    this.hooks.onSave()
                    this.say(c.releasedMsg(name))
                  }
                  this.render(now)
                }
              : () => {
                  sound.play('click')
                  this.confirmingReleaseUid = fish.uid
                  this.render(now)
                },
          actionLabel: isStarter
            ? undefined
            : confirmingRelease
              ? c.confirmReleaseBtn
              : c.releaseBtn,
          actionDanger: confirmingRelease,
          secondaryAction: confirmingRelease
            ? () => {
                sound.play('click')
                this.confirmingReleaseUid = null
                this.render(now)
              }
            : undefined,
          secondaryActionLabel: confirmingRelease ? c.cancelBtn : undefined,
        }),
      )
    }
    return [headRow, grid, note(c.tankNote, c.tankNoteTitle, TAB_ICONS.tank)]
  }

  // --------------------------------------------------------------- breed

  private breedPanel(now: number): Node[] {
    const c = this.t
    const currentSort: FishSort = this.state.breedSort ?? 'tier'
    const rawCandidates = this.state.fish.filter((f) => f.tier === 0 || f.uses > 0)
    const candidates = sortBreedCandidates(rawCandidates, currentSort, now)
    const eligible = candidates.filter((f) => isAdult(f, now))
    const eligibleIds = new Set(eligible.map((f) => f.uid))
    this.breedPick = this.breedPick.filter((uid) => eligibleIds.has(uid)).slice(-2)

    const headRow = document.createElement('div')
    headRow.className = 'panel-head'
    headRow.append(heading(c.breedHeading(this.breedPick.length)))

    const sortBar = document.createElement('div')
    sortBar.className = 'sort-bar'
    const sortLbl = document.createElement('span')
    sortLbl.className = 'sort-label'
    sortLbl.textContent = c.sortLabel
    sortBar.append(sortLbl)

    const sorts: { id: FishSort; label: string }[] = [
      { id: 'tier', label: c.sortTier },
      { id: 'grade', label: c.sortGrade },
      { id: 'uses', label: c.sortUses },
      { id: 'acquired', label: c.sortAcquired },
    ]
    for (const s of sorts) {
      const b = makeButton(s.label, () => {
        sound.play('click')
        this.state.breedSort = s.id
        this.hooks.onSave()
        this.render(now)
      })
      b.className = 'sort-btn'
      b.setAttribute('aria-pressed', String(currentSort === s.id))
      sortBar.append(b)
    }
    headRow.append(sortBar)

    const out: Node[] = [headRow]

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
          showCooldown: true,
          onClick: () => {
            if (!adult) {
              const name = speciesName(fish.speciesId, this.locale)
              const remain = formatClock(Math.max(0, (fish.maturesAt ?? now) - now))
              this.say(c.breedError('not-adult', `「${name}」（⏱ ${remain}）`), 'bad')
              this.render(now)
              return
            }
            if (!picked && this.state.hearts <= 0) {
              const wait = formatClock(Math.max(0, this.state.nextHeartAt - now))
              this.say(c.breedError('no-hearts', wait), 'bad')
            } else {
              sound.play('select')
              this.say('')
            }
            this.breedPick = picked
              ? this.breedPick.filter((u) => u !== fish.uid)
              : [...this.breedPick, fish.uid].slice(-2)
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
    const canBreed = Boolean(a && b && this.state.hearts > 0)
    const go = makeButton(c.breedBtn(this.breedPick.length), () => {
      const clickNow = Date.now()
      if (this.state.hearts <= 0) {
        const wait = formatClock(Math.max(0, this.state.nextHeartAt - clickNow))
        this.say(c.breedError('no-hearts', wait), 'bad')
        this.render(clickNow)
        return
      }
      if (!a || !b) {
        this.say(c.breedError('needs-two', String(this.breedPick.length)), 'bad')
        this.render(clickNow)
        return
      }
      const parentSnapshots = [{ ...a }, { ...b }]
      const result = breed(this.state, a.uid, b.uid, clickNow)
      if ('error' in result) {
        const wait =
          result.error === 'no-hearts'
            ? formatClock(Math.max(0, this.state.nextHeartAt - clickNow))
            : undefined
        this.say(c.breedError(result.error, wait), 'bad')
      } else {
        sound.play('breed-start')
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
        this.openShowcase(result, 'breed', parentSnapshots)
      }
      this.render(clickNow)
    })
    go.className = 'btn-primary'
    go.setAttribute('aria-disabled', String(!canBreed))
    row.append(go)

    const bestPairBtn = makeButton(c.breedAutoPickBtn, () => {
      if (eligible.length < 2) {
        this.say(c.breedNotEnoughAdults, 'bad')
        this.render(now)
        return
      }
      sound.play('select')
      const best = sortBreedCandidates(eligible, 'tier', now)
      this.breedPick = [best[0]!.uid, best[1]!.uid]
      this.say('')
      this.render(now)
    })
    bestPairBtn.className = 'btn-secondary'
    bestPairBtn.setAttribute('aria-disabled', String(eligible.length < 2))
    row.append(bestPairBtn)

    if (this.breedPick.length > 0) {
      const clear = makeButton(c.clearBtn, () => {
        sound.play('click')
        this.breedPick = []
        this.say('')
        this.render(now)
      })
      clear.className = 'btn-secondary'
      row.append(clear)
    }

    out.push(row, note(c.breedNote, c.breedNoteTitle, TAB_ICONS.breed))
    return out
  }

  // --------------------------------------------------------------- merge

  private mergePanel(now: number): Node[] {
    const c = this.t
    const filter = syncMergeFilter(this.state)
    const mergeCandidates = filterMergeCandidates(this.state)
    const candidateIds = new Set(mergeCandidates.map((f) => f.uid))
    this.mergePick = this.mergePick.filter((uid) => candidateIds.has(uid)).slice(0, SYNTHESIS_INPUT_COUNT)

    const out: Node[] = [heading(c.mergeHeading(SYNTHESIS_INPUT_COUNT, this.mergePick.length))]

    const filterBox = document.createElement('div')
    filterBox.className = 'filter-box'

    const condTitle = document.createElement('div')
    condTitle.className = 'filter-title'
    condTitle.textContent = c.mergeCondTitle

    const condList = document.createElement('div')
    condList.className = 'filter-list'
    condList.append(
      checkRow(c.mergeFilterZeroUses, filter.zeroUsesOnly, () => {
        sound.play('click')
        filter.zeroUsesOnly = !filter.zeroUsesOnly
        this.hooks.onSave()
        this.render(now)
      }),
      checkRow(c.mergeFilterExcludeTank, filter.excludeInTank, () => {
        sound.play('click')
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
          sound.play('click')
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
      const idx = this.mergePick.indexOf(fish.uid)
      const picked = idx !== -1
      const locked = fish.tier >= 5
      grid.append(
        this.fishCell(fish, now, {
          selected: picked,
          pickOrder: picked ? idx + 1 : undefined,
          locked,
          onClick: () => {
            if (fish.tier >= 5) {
              this.say(c.synthError('max-tier', SYNTHESIS_INPUT_COUNT), 'bad')
            } else if (!picked && this.mergePick.length >= SYNTHESIS_INPUT_COUNT) {
              this.say(c.mergeAlreadyFullMsg(SYNTHESIS_INPUT_COUNT), 'bad')
            } else {
              sound.play('select')
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
        this.say(
          c.synthError('wrong-count', SYNTHESIS_INPUT_COUNT, this.mergePick.length),
          'bad',
        )
        this.render(now)
        return
      }
      const clickNow = Date.now()
      const materialSnapshots = this.mergePick
        .map((uid) => this.state.fish.find((f) => f.uid === uid))
        .filter((f): f is Fish => Boolean(f))
        .map((f) => ({ ...f }))

      const result = synthesize(this.state, this.mergePick, clickNow)
      if ('error' in result) {
        this.say(c.synthError(result.error, SYNTHESIS_INPUT_COUNT), 'bad')
      } else {
        sound.play('merge-start')
        const name = speciesName(result.child.speciesId, this.locale)
        const tName = tierName(result.child.tier, this.locale)
        this.say(c.mergedMsg(name, stars(result.child.tier), tName), 'good')
        this.mergePick = []
        this.hooks.onSave()
        this.openShowcase(
          { child: result.child, tier: result.tier, novel: result.novel, expGained: 0 },
          'merge',
          materialSnapshots,
        )
      }
      this.render(clickNow)
    })
    go.className = 'btn-primary'
    go.setAttribute('aria-disabled', String(!ready))

    const autoBtn = makeButton(c.mergeAutoPickBtn, () => {
      const picked = autoPickForMerge(this.state)
      this.mergePick = picked
      if (picked.length === SYNTHESIS_INPUT_COUNT) {
        sound.play('select')
      }
      this.say(
        c.mergeAutoPickedMsg(picked.length, SYNTHESIS_INPUT_COUNT),
        picked.length === SYNTHESIS_INPUT_COUNT ? 'good' : 'bad',
      )
      this.render(now)
    })
    autoBtn.className = 'btn-secondary'
    autoBtn.setAttribute('aria-disabled', String(mergeCandidates.length === 0))

    const clear = makeButton(c.clearBtn, () => {
      if (this.mergePick.length === 0) {
        this.say(c.mergeNothingToClearMsg, 'bad')
        this.render(now)
        return
      }
      sound.play('click')
      this.mergePick = []
      this.say('')
      this.render(now)
    })
    clear.className = 'btn-secondary'
    clear.setAttribute('aria-disabled', String(this.mergePick.length === 0))

    row.append(go, autoBtn, clear)
    out.push(row, note(c.mergeNote, c.mergeNoteTitle, TAB_ICONS.merge))
    return out
  }

  // --------------------------------------------------------------- decor

  private decorPanel(): Node[] {
    const c = this.t
    const placedList = syncDecor(this.state)
    const placedIds = new Set(placedList.map((d) => d.id))
    const cap = decorCapacity(this.state)
    const prog = decorProgress(this.state)
    const out: Node[] = [heading(c.decorHeading(placedIds.size, cap, prog.unlocked, prog.total))]

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
        const nowPlaced = syncDecor(this.state).length
        if (res === 'locked') {
          this.say(c.decorLockedMsg(name, item.unlockLevel), 'bad')
        } else if (res === 'decor-full') {
          this.say(c.decorFullMsg(cap), 'bad')
        } else if (res === 'placed') {
          sound.play('place')
          this.hooks.onSave()
          this.say(c.decorPlacedMsg(name, nowPlaced, cap), 'good')
        } else {
          sound.play('select')
          this.hooks.onSave()
          this.say(c.decorRemovedMsg(name, nowPlaced, cap))
        }
        this.render()
      }

      const artWrap = document.createElement('div')
      artWrap.className = 'cell-art'
      artWrap.append(this.decorPortrait(item, !unlocked))

      const metaText = !unlocked
        ? c.decorUnlockAt(item.unlockLevel)
        : placed
          ? `${c.decorUnlockedAt(item.unlockLevel)} · ${c.decorPlacedTag}`
          : c.decorUnlockedAt(item.unlockLevel)

      cell.append(
        artWrap,
        label(name, 'name'),
        label(metaText, `meta${placed ? ' text-[var(--accent)] font-semibold' : ''}`),
      )

      if (placed) {
        const flipBtn = makeButton(c.decorFlipBtn, (event) => {
          event.stopPropagation()
          if (flipDecor(this.state, item.id)) {
            sound.play('click')
            this.hooks.onSave()
            this.say(c.decorFlippedMsg(name))
            this.render()
          }
        })
        cell.append(flipBtn)
      }

      grid.append(cell)
    }

    out.push(grid, note(c.decorNote, c.decorNoteTitle, TAB_ICONS.decor))
    return out
  }

  // ---------------------------------------------------------------- book

  private bookPanel(): Node[] {
    const c = this.t
    const out: Node[] = []

    const totalVariants = SPECIES.reduce((sum, sp) => sum + (sp.tier === 0 ? 1 : 5), 0)
    const unlockedVariants = SPECIES.reduce(
      (sum, sp) =>
        sum + Math.min(sp.tier === 0 ? 1 : 5, discoveredGradesFor(this.state, sp.id).length),
      0,
    )
    const pctStr = ((unlockedVariants / Math.max(1, totalVariants)) * 100).toFixed(1)

    const headRow = document.createElement('div')
    headRow.className = 'panel-head'
    const prog = collectionProgress(this.state)
    headRow.append(
      heading(`${c.bookHeading} (${prog.owned} / ${prog.total})`),
      label(c.bookCompletion(pctStr), 'sort-label'),
    )
    out.push(headRow)

    const layout = document.createElement('div')
    layout.className = `book-layout${this.bookDetailSpeciesId ? ' with-detail' : ''}`

    if (this.bookDetailSpeciesId) {
      const detailSp = SPECIES.find((s) => s.id === this.bookDetailSpeciesId)
      if (detailSp && this.state.discovered.includes(detailSp.id)) {
        layout.append(this.bookDetailView(detailSp))
      } else {
        this.bookDetailSpeciesId = null
      }
    }

    const grid = document.createElement('div')
    grid.className = 'grid book-grid'
    for (const sp of SPECIES) {
      const owned = this.state.discovered.includes(sp.id)
      const ownedCopies = this.state.fish.filter((f) => f.speciesId === sp.id)
      const bestOwnedGrade = ownedCopies.length
        ? (Math.max(...ownedCopies.map((f) => f.grade)) as Grade)
        : (Math.max(1, ...discoveredGradesFor(this.state, sp.id)) as Grade)
      const isActive = this.bookDetailSpeciesId === sp.id

      const cell = document.createElement('div')
      cell.className = `cell${owned ? '' : ' locked'}`
      cell.setAttribute('aria-pressed', String(isActive))
      cell.onclick = () => {
        if (owned) {
          sound.play('select')
          if (this.bookDetailSpeciesId === sp.id) {
            this.bookDetailSpeciesId = null
          } else {
            this.bookDetailSpeciesId = sp.id
            this.bookDetailGrade = bestOwnedGrade
            this.bookSelectedUid =
              ownedCopies.find((f) => f.grade === bestOwnedGrade)?.uid ??
              ownedCopies[0]?.uid ??
              null
            if (window.innerWidth <= 720) {
              this.body.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }
        } else {
          this.say(c.bookLockedMsg(`${stars(sp.tier)} ${tierName(sp.tier, this.locale)}`), 'bad')
        }
        this.render()
      }

      if (owned) {
        const countBadge = document.createElement('div')
        countBadge.className = 'book-count'
        countBadge.textContent = `x${ownedCopies.length}`
        cell.append(countBadge)
      }

      cell.append(
        this.portrait(sp, sp.tier, owned ? bestOwnedGrade : 1, !owned),
        label(owned ? speciesName(sp.id, this.locale) : '???', 'name'),
        this.tierMetaLine(sp.tier),
      )
      grid.append(cell)
    }

    layout.append(grid)
    out.push(layout, note(c.bookNote, c.bookNoteTitle, TAB_ICONS.book))
    return out
  }

  private bookDetailView(sp: Species): HTMLElement {
    const c = this.t
    const now = Date.now()
    const card = document.createElement('aside')
    card.className = 'book-detail'

    // Header: Species Name + Rarity Tier + Close X
    const top = document.createElement('div')
    top.className = 'book-detail-head'
    const titles = document.createElement('div')
    const nameEl = document.createElement('div')
    nameEl.className = 'book-detail-name'
    nameEl.textContent = speciesName(sp.id, this.locale)
    const tierEl = this.tierMetaLine(sp.tier)
    titles.append(nameEl, tierEl)

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'book-close-btn'
    closeBtn.innerHTML =
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>'
    closeBtn.addEventListener('click', () => {
      sound.play('click')
      this.bookDetailSpeciesId = null
      this.render()
    })
    top.append(titles, closeBtn)

    // Specimens of this species currently in inventory
    const specimens = sortTankFish(
      this.state.fish.filter((f) => f.speciesId === sp.id),
      'grade',
      new Set(syncTank(this.state)),
    )
    if (this.bookSelectedUid && !specimens.some((f) => f.uid === this.bookSelectedUid)) {
      this.bookSelectedUid =
        specimens.find((f) => f.grade === this.bookDetailGrade)?.uid ?? null
    }
    const activeSpecimen = this.bookSelectedUid
      ? (specimens.find((f) => f.uid === this.bookSelectedUid) ?? null)
      : null
    const displayGrade = activeSpecimen ? activeSpecimen.grade : this.bookDetailGrade

    // Large preview portrait
    const previewWrap = document.createElement('div')
    previewWrap.className = 'book-preview'
    previewWrap.append(this.largePortrait(sp, sp.tier, displayGrade))

    const previewMeta = document.createElement('div')
    previewMeta.className = 'book-preview-meta'
    if (activeSpecimen) {
      const maxU = activeSpecimen.maxUses ?? USES_BY_TIER[activeSpecimen.tier]
      const usesStr = activeSpecimen.tier === 0 ? '∞' : `${activeSpecimen.uses}/${maxU}`
      previewMeta.append(
        label(c.showcaseUsesLabel(usesStr), 'meta'),
        this.tierMetaLine(activeSpecimen.tier, activeSpecimen.grade),
      )
    } else {
      previewMeta.append(this.tierMetaLine(sp.tier, displayGrade))
    }

    // Action bar for the selected specimen (Place/Store + Quick Jump to Breed/Merge)
    const actionsRow = document.createElement('div')
    actionsRow.className = 'book-detail-actions'
    if (activeSpecimen) {
      const inTank = syncTank(this.state).includes(activeSpecimen.uid)
      const cap = capacity(this.state)
      const placeBtn = makeButton(inTank ? c.bookStoreAction : c.bookPlaceAction, () => {
        const res = toggleTankFish(this.state, activeSpecimen.uid)
        const name = speciesName(sp.id, this.locale)
        const placedNow = syncTank(this.state).length
        if (res === 'placed') {
          sound.play('place')
          this.hooks.onSave()
          this.say(c.placedMsg(name, placedNow, cap), 'good')
        } else if (res === 'removed') {
          sound.play('select')
          this.hooks.onSave()
          this.say(c.removedFromTankMsg(name, placedNow, cap))
        } else {
          this.say(c.tankDisplayFullMsg(cap), 'bad')
        }
        this.render()
      })
      placeBtn.className = 'btn-primary'
      actionsRow.append(placeBtn)

      if (activeSpecimen.tier === 0 || activeSpecimen.uses > 0) {
        const goBreed = makeButton(c.bookGoBreedAction, () => {
          sound.play('click')
          this.tab = 'breed'
          if (isAdult(activeSpecimen, now) && !this.breedPick.includes(activeSpecimen.uid)) {
            this.breedPick = [...this.breedPick, activeSpecimen.uid].slice(-2)
          }
          this.render()
        })
        goBreed.className = 'btn-secondary'
        actionsRow.append(goBreed)
      }

      if (activeSpecimen.tier > 0 && activeSpecimen.tier < 5) {
        const goMerge = makeButton(c.bookGoMergeAction, () => {
          sound.play('click')
          this.tab = 'merge'
          this.render()
        })
        goMerge.className = 'btn-secondary'
        actionsRow.append(goMerge)
      }
    }

    // Grade Variant Color Swatches (1 for starter fish, 5 for regular species)
    const unlockedGrades = new Set(discoveredGradesFor(this.state, sp.id))
    const maxGrades: Grade[] = sp.tier === 0 ? [1] : [1, 2, 3, 4, 5]
    const varTitle = heading(c.bookVariantsTitle, 'h3')
    const varRow = document.createElement('div')
    varRow.className = 'variant-strip'
    for (const g of maxGrades) {
      const isUnlocked = unlockedGrades.has(g)
      const chip = document.createElement('button')
      chip.type = 'button'
      chip.className = `variant-chip${isUnlocked ? '' : ' locked'}`
      chip.setAttribute('aria-pressed', String(displayGrade === g && isUnlocked))
      chip.onclick = () => {
        if (!isUnlocked) return
        sound.play('select')
        this.bookDetailGrade = g
        const matching = specimens.find((f) => f.grade === g)
        this.bookSelectedUid = matching ? matching.uid : null
        this.render()
      }
      chip.append(
        this.portrait(sp, sp.tier, g, !isUnlocked),
        label(isUnlocked ? c.gradeLabel(g) : '🔒', `meta grade-${g}`),
      )
      varRow.append(chip)
    }

    // Owned specimens grid (matching screenshot 2 & 3 left bottom grid)
    const specTitle = heading(c.bookSpecimensTitle(specimens.length), 'h3')
    const specGrid = document.createElement('div')
    specGrid.className = 'specimen-grid'
    if (specimens.length === 0) {
      specGrid.append(note(c.bookNoSpecimens))
    } else {
      for (const f of specimens) {
        const selected = activeSpecimen?.uid === f.uid
        specGrid.append(
          this.fishCell(f, now, {
            selected,
            onClick: () => {
              sound.play('select')
              this.bookSelectedUid = f.uid
              this.bookDetailGrade = f.grade
              this.render()
            },
          }),
        )
      }
    }

    // Footer: Held count & Variant discovery rate
    const footer = document.createElement('div')
    footer.className = 'book-detail-foot'
    const varCount = Math.min(maxGrades.length, unlockedGrades.size)
    const varPct = Math.round((varCount / maxGrades.length) * 100)
    footer.append(
      label(c.bookOwnedBadge(specimens.length), 'meta'),
      label(c.bookVariantRate(varCount, maxGrades.length, varPct), 'meta'),
    )

    card.append(
      top,
      previewWrap,
      previewMeta,
      actionsRow,
      varTitle,
      varRow,
      specTitle,
      specGrid,
      footer,
    )
    return card
  }

  // ------------------------------------------------------------ settings

  private settingsPanel(): Node[] {
    const c = this.t
    const out: Node[] = [heading(c.settingsThemeHeading)]
    const themeRow = document.createElement('div')
    themeRow.className = 'row'
    for (const theme of this.hooks.themes) {
      const b = makeButton(themeName(theme.id, theme.name, this.locale), () => {
        sound.play('click')
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
        sound.play('click')
        this.hooks.onColorModeChange(m.id)
      })
      b.className = 'icon-btn'
      b.setAttribute('aria-pressed', String(currentMode === m.id))
      modeRow.append(b)
    }

    // Audio & BGM controls
    const audioCfg = syncAudioConfig(this.state.audio)
    const audioBox = document.createElement('div')
    audioBox.className = 'audio-box'

    const sfxRow = document.createElement('div')
    sfxRow.className = 'audio-row'
    const sfxToggle = makeIconButton(
      audioCfg.sfxEnabled ? AUDIO_ICONS.on : AUDIO_ICONS.off,
      `${c.audioSfxLabel}: ${audioCfg.sfxEnabled ? c.audioOn : c.audioOff}`,
      () => {
        const next: AudioConfig = { ...audioCfg, sfxEnabled: !audioCfg.sfxEnabled }
        this.hooks.onAudioChange(next)
        if (next.sfxEnabled) sound.play('click')
      },
    )
    sfxToggle.className = 'icon-btn'
    sfxToggle.setAttribute('aria-pressed', String(audioCfg.sfxEnabled))

    const sfxSlider = document.createElement('input')
    sfxSlider.type = 'range'
    sfxSlider.className = 'vol-slider'
    sfxSlider.min = '0'
    sfxSlider.max = '100'
    sfxSlider.value = String(Math.round(audioCfg.sfxVolume * 100))
    const sfxPct = document.createElement('span')
    sfxPct.className = 'vol-pct'
    sfxPct.textContent = `${Math.round(audioCfg.sfxVolume * 100)}%`
    sfxSlider.addEventListener('input', () => {
      const v = Number(sfxSlider.value) / 100
      sfxPct.textContent = `${Math.round(v * 100)}%`
      const next: AudioConfig = { ...audioCfg, sfxVolume: v, sfxEnabled: v > 0 }
      this.state.audio = next
      sound.configure(next)
    })
    sfxSlider.addEventListener('change', () => {
      sound.play('click')
      this.hooks.onAudioChange(syncAudioConfig(this.state.audio))
    })
    sfxRow.append(sfxToggle, sfxSlider, sfxPct)

    const bgmRow = document.createElement('div')
    bgmRow.className = 'audio-row'
    const bgmToggle = makeIconButton(
      audioCfg.bgmEnabled ? AUDIO_ICONS.on : AUDIO_ICONS.off,
      `${c.audioBgmLabel}: ${audioCfg.bgmEnabled ? c.audioOn : c.audioOff}`,
      () => {
        sound.play('click')
        const next: AudioConfig = { ...audioCfg, bgmEnabled: !audioCfg.bgmEnabled }
        this.hooks.onAudioChange(next)
      },
    )
    bgmToggle.className = 'icon-btn'
    bgmToggle.setAttribute('aria-pressed', String(audioCfg.bgmEnabled))

    const bgmSlider = document.createElement('input')
    bgmSlider.type = 'range'
    bgmSlider.className = 'vol-slider'
    bgmSlider.min = '0'
    bgmSlider.max = '100'
    bgmSlider.value = String(Math.round(audioCfg.bgmVolume * 100))
    const bgmPct = document.createElement('span')
    bgmPct.className = 'vol-pct'
    bgmPct.textContent = `${Math.round(audioCfg.bgmVolume * 100)}%`
    bgmSlider.addEventListener('input', () => {
      const v = Number(bgmSlider.value) / 100
      bgmPct.textContent = `${Math.round(v * 100)}%`
      const next: AudioConfig = { ...audioCfg, bgmVolume: v, bgmEnabled: v > 0 }
      this.state.audio = next
      sound.configure(next)
    })
    bgmSlider.addEventListener('change', () => {
      this.hooks.onAudioChange(syncAudioConfig(this.state.audio))
    })
    bgmRow.append(bgmToggle, bgmSlider, bgmPct)

    const trackRow = document.createElement('div')
    trackRow.className = 'row'
    const tracks: { id: BgmTrackId; label: string }[] = [
      { id: 'lofi', label: `♪ ${c.bgmTrackLofi}` },
      { id: 'tide', label: `♪ ${c.bgmTrackTide}` },
      { id: 'chiptune', label: `♪ ${c.bgmTrackChiptune}` },
    ]
    for (const tr of tracks) {
      const b = makeButton(tr.label, () => {
        sound.play('click')
        this.hooks.onAudioChange({ ...audioCfg, bgmTrack: tr.id, bgmEnabled: true })
      })
      b.setAttribute('aria-pressed', String(audioCfg.bgmTrack === tr.id))
      trackRow.append(b)
    }

    audioBox.append(sfxRow, bgmRow, heading(c.audioTrackHeading, 'h3'), trackRow)

    const langRow = document.createElement('div')
    langRow.className = 'row'
    const zhBtn = makeButton('简体中文', () => {
      sound.play('click')
      this.hooks.onLocaleChange('zh')
    })
    zhBtn.setAttribute('aria-pressed', String(this.locale === 'zh'))
    const enBtn = makeButton('English', () => {
      sound.play('click')
      this.hooks.onLocaleChange('en')
    })
    enBtn.setAttribute('aria-pressed', String(this.locale === 'en'))
    langRow.append(zhBtn, enBtn)

    const helpRow = document.createElement('div')
    helpRow.className = 'row'
    const openHelp = makeIconButton(HELP_ICON, c.openHelpBtn, () => {
      sound.play('click')
      this.helpOpen = true
      this.renderShowcase()
    })
    openHelp.className = 'icon-btn btn-secondary'
    helpRow.append(openHelp)

    out.push(
      themeRow,
      note(c.settingsThemeNote),
      heading(c.settingsColorModeHeading, 'h3'),
      modeRow,
      note(c.settingsColorModeNote),
      heading(c.settingsAudioHeading, 'h3'),
      audioBox,
      heading(c.settingsLangHeading, 'h3'),
      langRow,
      heading(c.settingsHelpHeading, 'h3'),
      helpRow,
      heading(c.settingsSaveHeading, 'h3'),
    )

    const danger = document.createElement('div')
    danger.className = 'row'
    if (!this.confirmingReset) {
      const reset = makeButton(c.resetBtn, () => {
        sound.play('click')
        this.confirmingReset = true
        this.render()
      })
      danger.append(reset)
    } else {
      const confirmBtn = makeButton(c.confirmResetBtn, () => {
        sound.play('release')
        this.confirmingReset = false
        this.hooks.onReset()
        this.say(this.t.resetDoneMsg, 'good')
        this.render()
      })
      confirmBtn.className = 'danger-confirm'
      const cancelBtn = makeButton(c.cancelBtn, () => {
        sound.play('click')
        this.confirmingReset = false
        this.render()
      })
      danger.append(confirmBtn, cancelBtn)
    }
    out.push(danger, note(c.settingsSaveNote))
    return out
  }

  private renderFooter(): void {
    const c = this.t
    const left = document.createElement('div')
    left.className = 'footer-meta'
    left.textContent = `Fishtank v${APP_VERSION} · © 2026 Seven Yu`

    const right = document.createElement('div')
    right.className = 'footer-links'

    const helpLink = document.createElement('button')
    helpLink.type = 'button'
    helpLink.className = 'footer-link'
    helpLink.innerHTML = `<span class="ico">${HELP_ICON}</span><span>${c.helpBtn}</span>`
    helpLink.onclick = () => {
      sound.play('click')
      this.helpOpen = true
      this.renderShowcase()
    }

    const ghLink = document.createElement('a')
    ghLink.href = GITHUB_URL
    ghLink.target = '_blank'
    ghLink.rel = 'noopener noreferrer'
    ghLink.className = 'footer-link'
    ghLink.title = 'GitHub: dofy/fishtank'
    ghLink.innerHTML = `<span class="ico">${GITHUB_ICON}</span><span>GitHub</span>`

    right.append(helpLink, ghLink)
    this.footer.replaceChildren(left, right)
  }

  private renderHelpModal(): HTMLElement {
    const c = this.t
    const backdrop = document.createElement('div')
    backdrop.className = 'showcase-backdrop'
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        sound.play('click')
        this.helpOpen = false
        this.renderShowcase()
      }
    })

    const card = document.createElement('div')
    card.className = 'help-modal'

    const top = document.createElement('div')
    top.className = 'book-detail-head'
    const title = document.createElement('h2')
    title.className = 'm-0 text-base font-bold text-[var(--accent)]'
    title.textContent = `${c.helpModalTitle} (v${APP_VERSION})`

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'book-close-btn'
    closeBtn.innerHTML =
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>'
    closeBtn.onclick = () => {
      sound.play('click')
      this.helpOpen = false
      this.renderShowcase()
    }
    top.append(title, closeBtn)

    const content = document.createElement('div')
    content.className = 'help-body'

    // Section 1: Core Guide
    content.append(heading(c.helpIntroTitle, 'h3'))
    const ul = document.createElement('ul')
    ul.className = 'help-list'
    for (const item of c.helpIntroItems) {
      const li = document.createElement('li')
      li.textContent = item
      ul.append(li)
    }
    content.append(ul)

    // Section 2: Breeding Probability Matrix
    content.append(heading(c.helpMatrixTitle, 'h3'))
    const matrixTable = document.createElement('table')
    matrixTable.className = 'odds'
    const mHead = document.createElement('tr')
    mHead.append(
      th(c.pairingCol),
      ...([1, 2, 3, 4, 5] as Tier[]).map((t) => {
        const cell = th(`${stars(t)} ${tierName(t, this.locale)}`)
        cell.className = `tier-${t}`
        return cell
      }),
    )
    matrixTable.append(mHead)
    for (const [key, odds] of Object.entries(BREEDING_MATRIX)) {
      const [lo, hi] = key.split('+').map(Number) as [Tier, Tier]
      const tr = document.createElement('tr')
      tr.append(
        td(`${stars(lo)} + ${stars(hi)}`),
        ...odds.map((v, idx) => {
          const cell = td(`${v}%`)
          if (v > 0) cell.className = `tier-${idx + 1}`
          return cell
        }),
      )
      matrixTable.append(tr)
    }
    content.append(matrixTable)

    // Section 3: Aquarium Levels & Capacity
    content.append(heading(c.helpLevelTitle, 'h3'))
    const lvTable = document.createElement('table')
    lvTable.className = 'odds'
    const lvHead = document.createElement('tr')
    lvHead.append(
      th(c.helpLevelColLv),
      th(c.helpLevelColExp),
      th(c.helpLevelColCap),
      th(c.helpLevelColDecor),
    )
    lvTable.append(lvHead)
    for (const row of LEVELS) {
      const tr = document.createElement('tr')
      const decorsAtLv = DECORATIONS.filter((d) => d.unlockLevel === row.level)
        .map((d) => decorName(d.id, this.locale))
        .join(' / ')
      tr.append(
        td(`Lv.${row.level}`),
        td(`${row.totalExp}`),
        td(`${row.capacity} / ${row.decorCapacity}`),
        td(decorsAtLv || '—'),
      )
      lvTable.append(tr)
    }
    content.append(lvTable)

    // Section 4: Rarity Tiers & Grade Multipliers
    content.append(heading(c.helpTierTitle, 'h3'))
    const tierTable = document.createElement('table')
    tierTable.className = 'odds'
    const tHead = document.createElement('tr')
    tHead.append(
      th(c.helpTierColTier),
      th(c.helpTierColGrowth),
      th(c.helpTierColExp),
      th(c.helpTierColUses),
    )
    tierTable.append(tHead)
    for (const t of [0, 1, 2, 3, 4, 5] as Tier[]) {
      const tr = document.createElement('tr')
      const tierCell = td(`${stars(t)} ${tierName(t, this.locale)}`)
      tierCell.className = `tier-${t}`
      const mins = Math.round(GROWTH_MS_BY_TIER[t] / 60_000)
      const usesStr = t === 0 ? '∞' : `1–5 (avg ${USES_BY_TIER[t]})`
      tr.append(tierCell, td(`${mins} min`), td(`${EXP_BY_TIER[t]} EXP`), td(usesStr))
      tierTable.append(tr)
    }
    content.append(tierTable, note(c.helpGradeNote))

    card.append(top, content)
    backdrop.append(card)
    return backdrop
  }

  // ------------------------------------------------------------- showcase

  private openShowcase(
    outcome: BreedOutcome,
    kind: 'breed' | 'merge' = 'breed',
    parents: Fish[] = [],
  ): void {
    const unlockedFloorDecors = DECORATIONS.filter(
      (d) => (d.mount ?? 'floor') === 'floor' && isDecorUnlocked(this.state, d.id),
    )
    const decor =
      unlockedFloorDecors[Math.floor(Math.random() * unlockedFloorDecors.length)] ??
      DECORATIONS[0]!
    const decorX = 0.28 + Math.random() * 0.44
    const decorFlip: 1 | -1 = Math.random() < 0.5 ? 1 : -1
    const sp = species(outcome.child.speciesId)
    this.showcase = {
      ceremony:
        parents.length > 0
          ? {
              kind,
              parents,
              outcome,
              startedAt: performance.now(),
              durationMs: CEREMONY_MS,
              revealed: false,
            }
          : undefined,
      kind,
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
      if (this.helpOpen) {
        this.modal.replaceChildren(this.renderHelpModal())
      } else {
        this.modal.replaceChildren()
      }
      return
    }
    const { ceremony, kind, outcome, decor } = this.showcase
    const { child, novel, expGained } = outcome
    const c = this.t
    const inCeremony = Boolean(ceremony && !ceremony.revealed)

    const backdrop = document.createElement('div')
    backdrop.className = 'showcase-backdrop'
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && !inCeremony) {
        sound.play('click')
        this.closeShowcase()
      }
    })

    const card = document.createElement('div')
    card.className = `showcase-card tier-border-${inCeremony ? 1 : child.tier}`

    const header = document.createElement('div')
    header.className = 'showcase-header'
    const title = document.createElement('span')
    title.className = 'showcase-title'
    title.textContent = inCeremony
      ? kind === 'merge'
        ? c.mergingAnimTitle
        : c.breedingAnimTitle
      : kind === 'merge'
        ? c.showcaseMergeTitle
        : c.showcaseTitle
    header.append(title)

    if (!inCeremony && novel) {
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

    card.append(header, tankWrap)

    if (!inCeremony) {
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
      chips.append(usesChip)

      if (expGained > 0) {
        const expChip = document.createElement('span')
        expChip.className = 'showcase-chip exp'
        expChip.textContent = `+${expGained} EXP`
        chips.append(expChip)
      }

      const decorChip = document.createElement('span')
      decorChip.className = 'showcase-chip'
      decorChip.textContent = c.showcaseDecorLabel(decorName(decor.id, this.locale))
      chips.append(decorChip)

      const closeBtn = makeButton(c.showcaseCloseBtn, () => {
        sound.play('click')
        this.closeShowcase()
      })
      closeBtn.className = 'showcase-btn btn-primary'

      card.append(nameRow, metaLine, chips, closeBtn)
    } else {
      const progressOuter = document.createElement('div')
      progressOuter.className = 'ceremony-bar'
      const progressInner = document.createElement('span')
      progressInner.dataset.ceremonyBar = '1'
      progressOuter.append(progressInner)
      card.append(progressOuter)
    }

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

    const { ceremony, agent, decor, decorX, decorFlip } = this.showcase
    const ctx = this.showcaseCanvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const night = resolveDarkMode(this.state.colorMode ?? 'auto')

    const decorScale = Math.min(1, (MINI_TANK_H * 0.58) / decor.height)
    const scaledDecor: DecorItem =
      decorScale < 1
        ? {
            ...decor,
            width: Math.round(decor.width * decorScale),
            height: Math.round(decor.height * decorScale),
          }
        : decor
    const decorNode: DecorNode = {
      item: scaledDecor,
      x: decorX * MINI_TANK_W,
      flip: decorFlip,
      active: false,
    }

    // Phase 1: Breeding or Merging process animation
    if (ceremony && !ceremony.revealed) {
      const p = Math.min(1, Math.max(0, (nowMs - ceremony.startedAt) / ceremony.durationMs))
      const barEl = this.modal.querySelector<HTMLElement>('[data-ceremony-bar]')
      if (barEl) barEl.style.width = `${Math.round(p * 100)}%`

      const tempAgents: Agent[] = []
      const cx = MINI_TANK_W * 0.5
      const cy = MINI_TANK_H * 0.44

      if (ceremony.kind === 'breed' && ceremony.parents.length >= 2) {
        const pA = ceremony.parents[0]!
        const pB = ceremony.parents[1]!
        const dist = (1 - p * 0.85) * (MINI_TANK_W * 0.34)
        const bob = Math.sin(p * Math.PI * 4) * 8
        tempAgents.push(
          {
            fish: pA,
            species: species(pA.speciesId),
            x: cx - dist,
            y: cy + bob,
            dir: 1,
            speed: 0,
            phase: 0,
            scale: 0.72 * (1 - p * 0.25),
          },
          {
            fish: pB,
            species: species(pB.speciesId),
            x: cx + dist,
            y: cy - bob,
            dir: -1,
            speed: 0,
            phase: Math.PI,
            scale: 0.72 * (1 - p * 0.25),
          },
        )
      } else {
        // Merge vortex: up to 10 fish spiraling inward
        const n = ceremony.parents.length
        const radius = (1 - p * 0.92) * (MINI_TANK_W * 0.38)
        for (let i = 0; i < n; i++) {
          const f = ceremony.parents[i]!
          const angle = (i / n) * Math.PI * 2 + p * Math.PI * 3.2
          const px = cx + Math.cos(angle) * radius
          const py = cy + Math.sin(angle) * (radius * 0.55)
          tempAgents.push({
            fish: f,
            species: species(f.speciesId),
            x: px,
            y: py,
            dir: Math.sin(angle) >= 0 ? -1 : 1,
            speed: 0,
            phase: i,
            scale: 0.58 * (1 - p * 0.45),
          })
        }
      }

      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.renderer.scene(ctx, {
        width: MINI_TANK_W,
        height: MINI_TANK_H,
        agents: tempAgents,
        decors: [decorNode],
        time: elapsed,
        night,
      })

      // Draw glowing convergence core / heart rings
      const glowRadius = 10 + p * 56
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowRadius)
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.25 + p * 0.7})`)
      grad.addColorStop(
        0.5,
        ceremony.kind === 'breed'
          ? `rgba(244, 114, 182, ${0.2 + p * 0.5})`
          : `rgba(56, 189, 248, ${0.2 + p * 0.5})`,
      )
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2)
      ctx.fill()

      if (p > 0.78) {
        const flash = (p - 0.78) / 0.22
        ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.85})`
        ctx.fillRect(0, 0, MINI_TANK_W, MINI_TANK_H)
      }
      ctx.restore()

      if (p >= 1) {
        ceremony.revealed = true
        sound.play('reveal', this.showcase.outcome.tier)
        this.renderShowcase()
      }
      return
    }

    // Phase 2: Revealed child fish swimming freely in the mini-tank
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

  private largePortrait(sp: Species, tier: Tier, grade: Grade): HTMLCanvasElement {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = 148
    const h = 84
    const canvas = document.createElement('canvas')
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      this.renderer.portrait(ctx, w, h, { species: sp, tier, grade, dim: false })
    }
    return canvas
  }

  private fishCell(
    fish: Fish,
    now: number,
    opts: {
      selected?: boolean
      pickOrder?: number
      tagText?: string
      showCooldown?: boolean
      locked?: boolean
      onClick?: () => void
      action?: () => void
      actionLabel?: string
      actionDanger?: boolean
      secondaryAction?: () => void
      secondaryActionLabel?: string
    },
  ): HTMLElement {
    const sp = species(fish.speciesId)
    const adult = isAdult(fish, now)
    const inTank = syncTank(this.state).includes(fish.uid)
    const coolingInBreed = Boolean(opts.showCooldown && !adult && fish.maturesAt !== null)

    const cell = document.createElement('div')
    cell.className = `cell${opts.locked ? ' locked' : ''}`
    cell.setAttribute('aria-pressed', String(Boolean(opts.selected)))
    if (opts.onClick) cell.onclick = opts.onClick

    // Top-left green downward arrow badge indicates this fish is currently placed in the tank
    if (inTank) {
      cell.append(this.badge(coolingInBreed ? 'partial' : 'ready'))
    }

    const maxU = fish.maxUses ?? USES_BY_TIER[fish.tier]
    const usesText = fish.tier === 0 ? '∞' : `${fish.uses}/${maxU}`

    const artWrap = document.createElement('div')
    artWrap.className = 'cell-art'
    artWrap.append(this.portrait(sp, fish.tier, fish.grade, coolingInBreed))

    if (coolingInBreed && fish.maturesAt !== null) {
      const cdOverlay = document.createElement('div')
      cdOverlay.className = 'cell-overlay cooldown'
      const clockIcon = document.createElement('span')
      clockIcon.className = 'cd-clock'
      clockIcon.innerHTML =
        '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>'
      const timerEl = document.createElement('span')
      timerEl.className = 'timer'
      timerEl.dataset.maturesAt = String(fish.maturesAt)
      timerEl.textContent = formatClock(Math.max(0, fish.maturesAt - now))
      cdOverlay.append(clockIcon, timerEl)
      artWrap.append(cdOverlay)
    }

    cell.append(
      count(usesText),
      artWrap,
      label(speciesName(sp.id, this.locale), 'name'),
      this.tierMetaLine(fish.tier, fish.grade),
    )
    if (opts.pickOrder !== undefined) {
      cell.append(label(`#${opts.pickOrder}`, 'pick-order'))
    } else if (opts.tagText) {
      cell.append(label(opts.tagText, 'pick-order'))
    }
    if (opts.action && opts.actionLabel) {
      const actWrap = document.createElement('div')
      actWrap.className = 'cell-actions'
      const b = makeButton(opts.actionLabel, (event) => {
        event.stopPropagation()
        opts.action?.()
      })
      if (opts.actionDanger) b.className = 'danger-confirm'
      actWrap.append(b)

      if (opts.secondaryAction && opts.secondaryActionLabel) {
        const b2 = makeButton(opts.secondaryActionLabel, (event) => {
          event.stopPropagation()
          opts.secondaryAction?.()
        })
        actWrap.append(b2)
      }
      cell.append(actWrap)
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

const NOTE_INFO_ICON =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.2"/><path d="M8 7.2v4M8 4.8h.01"/></svg>'

function appendFormattedNoteText(container: HTMLElement, text: string): void {
  const tokenRe = /【([^】]+)】|\*\*([^*]+)\*\*/g
  let lastIdx = 0
  let match: RegExpExecArray | null
  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > lastIdx) {
      container.append(document.createTextNode(text.slice(lastIdx, match.index)))
    }
    if (match[1] !== undefined) {
      const tag = document.createElement('span')
      tag.className = 'note-tag'
      tag.textContent = match[1]
      container.append(tag)
    } else if (match[2] !== undefined) {
      const strong = document.createElement('strong')
      strong.className = 'note-em'
      strong.textContent = match[2]
      container.append(strong)
    }
    lastIdx = tokenRe.lastIndex
  }
  if (lastIdx < text.length) {
    container.append(document.createTextNode(text.slice(lastIdx)))
  }
}

function note(text: string, title?: string, iconSvg?: string): HTMLElement {
  const box = document.createElement('div')
  box.className = title ? 'note note-featured' : 'note'

  const ico = document.createElement('span')
  ico.className = 'note-ico'
  ico.innerHTML = iconSvg ?? NOTE_INFO_ICON

  const content = document.createElement('div')
  content.className = 'note-content'

  if (title) {
    const head = document.createElement('div')
    head.className = 'note-title'
    head.textContent = title
    content.append(head)
  }

  const body = document.createElement('div')
  body.className = 'note-text'
  appendFormattedNoteText(body, text)
  content.append(body)

  box.append(ico, content)
  return box
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
