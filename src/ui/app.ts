import { reforge, reforgeCandidates, reforgeMisses, autoPickForReforge } from '../core/reforge'
import { REGULAR_SPECIES, HIDDEN_SPECIES } from '../core/species'
import { reforgeCopy } from './reforge-copy'
import { fishPath } from '../render/shape'
import { heartReminder } from '../notifications'
import { itemCard } from './item-card'
import { collectionCopy } from './collection-copy'
import { fishCare, fishDisplayName, saveTools } from './collection'
import { choosePlaque, milestoneCopy, milestonePanel } from './milestones'
import { medalArt } from './medals'
import { milestoneProgress } from '../core/milestones'
import { lockOwnedSpecies, setFishLocked } from '../core/collection'
import { sound, syncAudioConfig } from '../core/audio'
import { syncRailLightConfig } from '../core/lighting'
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
  autoPickForBreed,
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
import { drawCeremonyLight } from '../render/ceremony'
import { renderChangelogDialog } from './changelog'
import { bindShortcut, SHORTCUTS, shortcutForKey, shortcutLabels, type ShortcutAction } from './shortcuts'
import {
  bar,
  checkRow,
  formatClock,
  heading,
  label,
  makeButton,
  makeActionButton,
  makeIconButton,
  makeStatusIcon,
  note,
  renderSortBar,
  scrollPanelTo,
  stars,
  stat,
  td,
  th,
} from './dom'
import {
  ACTION_ICONS,
  AUDIO_ICONS,
  BG_SCENERY_LEFT_SVG,
  BG_SCENERY_RIGHT_SVG,
  CLOCK_ICON,
  CHANGELOG_ICON,
  CLOSE_ICON,
  GITHUB_ICON,
  HEART_SVG,
  HELP_ICON,
  IMMERSIVE_ICONS,
  MODE_ICONS,
  NOTE_INFO_ICON,
  STAT_ICONS,
  TAB_ICONS,
  TAB_IDS,
  type Tab,
} from './icons'

export { formatClock, stars } from './dom'

export const APP_VERSION = '1.9.0'
export const GITHUB_URL = 'https://github.com/dofy/fishtank'

export interface AppHooks {
  onThemeChange(id: string): void
  onColorModeChange(mode: ColorMode): void
  onAudioChange(audio: AudioConfig): void
  onLocaleChange(locale: Locale): void
  onSave(): boolean
  onRestore(next: GameState): Promise<boolean>
  onFishWithdraw(uid: string): void
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

const MINI_TANK_W = 384
const MINI_TANK_H = 208
const CEREMONY_MS = 1350

export class App {
  private tab: Tab = 'tank'
  private breedPick: string[] = []
  private mergePick: string[] = []
  private reforgePick: string[] = []
  private mergeMode: 'merge' | 'reforge' = 'merge'
  private confirmingReset = false
  private confirmingReleaseUid: string | null = null
  private bookPage: 'species' | 'medals' = 'species'
  private bookDetailSpeciesId: SpeciesId | null = null
  private bookDetailGrade: Grade = 1
  private bookSelectedUid: string | null = null
  private bookVariantsOpen = false
  private immersive = false
  private helpOpen = false
  private helpReturnFocus: HTMLElement | null = null
  private changelogOpen = false
  private portraitCache = new Map<string, HTMLCanvasElement>()
  private showcase: ShowcaseState | null = null
  private showcaseCanvas: HTMLCanvasElement | null = null
  private showcaseRaf = 0
  private showcaseLastMs = 0

  readonly canvas = document.createElement('canvas')
  private readonly bgScenery = document.createElement('div')
  private readonly hud = document.createElement('header')
  private readonly nav = document.createElement('nav')
  private readonly body = document.createElement('section')
  private readonly footer = document.createElement('footer')
  private readonly modal = document.createElement('div')
  private readonly toastHost = document.createElement('div')
  private readonly tankShell = document.createElement('div')
  private readonly plaque = document.createElement('div')

  constructor(
    private state: GameState,
    private renderer: Renderer,
    private readonly hooks: AppHooks,
  ) {
    this.bgScenery.className = 'bg-scenery'
    this.bgScenery.setAttribute('aria-hidden', 'true')
    this.bgScenery.innerHTML = `<div class="bg-side bg-left">${BG_SCENERY_LEFT_SVG}</div><div class="bg-side bg-right">${BG_SCENERY_RIGHT_SVG}</div>`
    this.hud.className = 'hud'
    this.nav.className = 'tabs'
    this.body.className = 'panel'
    this.footer.className = 'app-footer'
    this.modal.className = 'modal-host'
    this.toastHost.className = 'toast-host'
    this.canvas.id = 'tank'
    this.tankShell.className = 'tank-shell'
    this.plaque.className = 'tank-plaque'; this.plaque.hidden = true
    this.plaque.setAttribute('role', 'img')
    this.tankShell.append(this.canvas, this.plaque)
  }

  private get locale(): Locale {
    return this.state.locale ?? detectLocale()
  }

  private get t(): Copy {
    return copy(this.locale)
  }

  mount(root: HTMLElement): void {
    root.replaceChildren(
      this.bgScenery,
      this.hud,
      this.tankShell,
      this.nav,
      this.body,
      this.footer,
      this.modal,
      this.toastHost,
    )
    window.addEventListener('keydown', (event) => this.handleShortcut(event))
    this.render()
  }

  private handleShortcut(event: KeyboardEvent): void {
    if ((this.helpOpen || this.showcase) && event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const focusable = [...this.modal.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')]
        .filter(el => el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length > 0)
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first) { event.preventDefault(); return }
      if (!this.modal.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first)?.focus()
      }
      return
    }
    const action = shortcutForKey(event)
    if (!action) return
    const target = event.target instanceof HTMLElement ? event.target : null
    if (action !== 'escape' && target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="slider"]')) return
    // Native Enter activation of focused controls must remain a single normal click.
    if (event.key === 'Enter' && action === 'run' && target?.closest('button, a, summary, [role="button"], [role="checkbox"]')) return

    if (action === 'escape') {
      if (this.changelogOpen) this.closeChangelog()
      else if (this.helpOpen) this.closeHelp()
      else if (this.showcase) this.closeShowcase()
      else if (this.confirmingReset || this.confirmingReleaseUid) {
        const releaseUid = this.confirmingReleaseUid
        this.confirmingReset = false
        this.confirmingReleaseUid = null
        this.render()
        if (releaseUid) this.body.querySelector<HTMLElement>('[data-fish-release]')?.focus({ preventScroll: true })
      } else if (this.immersive) this.setImmersive(false)
      else if (this.bookDetailSpeciesId && this.tab === 'book') {
        const speciesId = this.bookDetailSpeciesId
        this.bookDetailSpeciesId = null
        this.bookDetailGrade = 1
        this.render()
        this.body.querySelector<HTMLButtonElement>(`[data-species="${speciesId}"] .item-card-main`)?.focus({ preventScroll: true })
      } else return
      event.preventDefault()
      return
    }

    if (this.modal.childElementCount > 0 || this.confirmingReset || this.confirmingReleaseUid) {
      // R or a fresh Enter can collect an already revealed result; all background actions stay paused.
      if (action === 'run' && this.showcase && !this.helpOpen && !this.changelogOpen) {
        const collect = this.modal.querySelector<HTMLButtonElement>('[data-shortcut="collect"]')
        if (collect) { event.preventDefault(); collect.click() }
      }
      return
    }
    if (action.startsWith('tab-') && this.immersive) this.setImmersive(false)
    if (['autoPick', 'clear', 'run'].includes(action) && this.immersive) return
    if (action === 'bgm' || action === 'sfx') {
      const config = syncAudioConfig(this.state.audio)
      if (action === 'bgm') config.bgmEnabled = !config.bgmEnabled
      else config.sfxEnabled = !config.sfxEnabled
      event.preventDefault()
      this.hooks.onAudioChange(config)
      return
    }
    const button = [this.hud, this.nav, this.body, this.footer]
      .map(root => root.querySelector<HTMLButtonElement>(`[data-shortcut="${action}"]`))
      .find((candidate): candidate is HTMLButtonElement => candidate !== null)
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return
    event.preventDefault()
    button.click()
  }

  private openHelp(): void {
    this.helpReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    this.helpOpen = true
    this.renderShowcase()
    this.modal.querySelector<HTMLButtonElement>('[data-help-close]')?.focus()
  }

  private closeHelp(): void {
    this.helpOpen = false
    this.renderShowcase()
    if (this.helpReturnFocus?.isConnected && this.helpReturnFocus !== document.body) this.helpReturnFocus.focus()
    else this.footer.querySelector<HTMLButtonElement>('[data-shortcut="help"]')?.focus()
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
    this.bookPage = 'species'
    this.state = state
    this.breedPick = []
    this.mergePick = []
    this.reforgePick = []
    this.mergeMode = 'merge'
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
    const reminderStatus = this.body.querySelector<HTMLElement>('[data-heart-reminder-status]')
    if (reminderStatus) {
      const status = heartReminder.status()
      if (reminderStatus.dataset.heartReminderStatus !== status) {
        reminderStatus.dataset.heartReminderStatus = status
        reminderStatus.textContent = this.t.reminderStatus[status]
      }
      const button = this.body.querySelector<HTMLButtonElement>('[data-heart-reminder]')
      if (button) {
        const enabled = heartReminder.enabled()
        const text = enabled ? this.t.reminderDisable : this.t.reminderEnable
        if (button.textContent !== text) button.textContent = text
        button.setAttribute('aria-pressed', String(enabled))
      }
    }
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
    const ids = this.state.milestones?.displayed ?? []
    const c = milestoneCopy(this.locale)
    this.plaque.hidden = ids.length === 0
    this.plaque.replaceChildren(...ids.map(id => {
      const item = document.createElement('span'); item.className = 'tank-medal'; item.dataset.medalId = id
      item.title = c.entries[id].title; item.append(medalArt(id)); return item
    }))
    this.plaque.setAttribute('aria-label', `${c.plaqueLabel}: ${ids.map(id => c.entries[id].title).join('、')}`)
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
    bindShortcut(modeBtn, 'mode')

    const langBtn = makeButton(c.langToggle, () => {
      sound.play('click')
      const nextLocale: Locale = this.locale === 'zh' ? 'en' : 'zh'
      this.hooks.onLocaleChange(nextLocale)
    })
    langBtn.className = 'lang-btn'
    bindShortcut(langBtn, 'locale')

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
    bindShortcut(immersiveBtn, 'immersive')

    const actions = document.createElement('div')
    actions.className = 'hud-actions'
    actions.append(modeBtn, langBtn, immersiveBtn)

    const statsGroup = document.createElement('div')
    statsGroup.className = 'hud-stats'
    statsGroup.append(
      stat(STAT_ICONS.tank, c.hudTank, `${placed}/${cap}`),
      stat(STAT_ICONS.bag, c.hudBag, `${s.fish.length}`),
      stat(STAT_ICONS.book, c.hudSpecies, `${prog.owned}/${prog.total}`),
      heartStat,
    )

    this.hud.replaceChildren(lvGroup, statsGroup, actions)
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
          scrollPanelTo(this.body)
        })
        b.setAttribute('aria-pressed', String(this.tab === id))
        b.title = c.tabs[id]
        bindShortcut(b, `tab-${id}`)
        return b
      }),
    )
  }

  private renderBody(now: number): void {
    if (this.confirmingReleaseUid && (this.tab !== 'book' || !this.bookDetailSpeciesId || this.bookSelectedUid !== this.confirmingReleaseUid)) this.confirmingReleaseUid = null
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

  private collectionChanged(fish: Fish, locked: boolean): void {
    const previous = fish.locked
    setFishLocked(this.state, fish.uid, locked)
    this.confirmingReleaseUid = null
    if (!this.hooks.onSave()) {
      if (previous === undefined) delete fish.locked
      else fish.locked = previous
      this.say(collectionCopy(this.locale).storageError, 'bad')
    }
    this.render()
    this.body.querySelector<HTMLButtonElement>(`[data-fish-lock="${fish.uid}"]`)?.focus({ preventScroll: true })
  }

  private openFishCare(fish: Fish): void {
    this.tab = 'book'
    this.bookPage = 'species'
    this.bookDetailSpeciesId = fish.speciesId
    this.bookSelectedUid = fish.uid
    this.bookDetailGrade = fish.grade
    this.render()
    const detail = this.body.querySelector<HTMLElement>('.book-detail')
    scrollPanelTo(this.body, detail ?? this.body)
    if (detail) { detail.tabIndex = -1; detail.focus({ preventScroll: true }) }
  }

  // ---------------------------------------------------------------- tank

  private tankPanel(now: number): Node[] {
    const c = this.t
    const tankIds = new Set(syncTank(this.state))
    const cap = capacity(this.state)
    const currentSort: FishSort = this.state.tankSort ?? 'inTank'

    const headRow = document.createElement('div')
    headRow.className = 'panel-head tank-panel-head'
    headRow.append(
      heading(c.tankHeading(tankIds.size, cap, this.state.fish.length)),
      renderSortBar(
        c.sortLabel,
        currentSort,
        [
          { id: 'inTank', label: c.sortInTank },
          { id: 'tier', label: c.sortTier },
          { id: 'grade', label: c.sortGrade },
          { id: 'uses', label: c.sortUses },
          { id: 'acquired', label: c.sortAcquired },
        ],
        (id) => {
          sound.play('click')
          this.state.tankSort = id
          this.hooks.onSave()
          this.render(now)
        },
      ),
    )

    const grid = document.createElement('div')
    grid.className = 'fish-grid item-grid'
    const sorted = sortTankFish(this.state.fish, currentSort, tankIds)
    for (const fish of sorted) {
      const inTank = tankIds.has(fish.uid)
      grid.append(
        this.fishCell(fish, now, {
          selected: inTank,
          manage: true,
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
              this.hooks.onFishWithdraw(fish.uid)
              sound.play('select')
              this.hooks.onSave()
              this.say(c.removedFromTankMsg(name, placedNow, cap))
            } else {
              this.say(c.tankDisplayFullMsg(cap), 'bad')
            }
            this.render(now)
          },
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
    const recommendedPair = autoPickForBreed(this.state, now)
    const eligibleIds = new Set(eligible.map((f) => f.uid))
    this.breedPick = this.breedPick.filter((uid) => eligibleIds.has(uid)).slice(-2)

    const headRow = document.createElement('div')
    headRow.className = 'panel-head'
    headRow.append(
      heading(c.breedHeading(this.breedPick.length)),
      renderSortBar(
        c.sortLabel,
        currentSort,
        [
          { id: 'tier', label: c.sortTier },
          { id: 'grade', label: c.sortGrade },
          { id: 'uses', label: c.sortUses },
          { id: 'acquired', label: c.sortAcquired },
        ],
        (id) => {
          sound.play('click')
          this.state.breedSort = id
          this.hooks.onSave()
          this.render(now)
        },
      ),
    )

    const [aUid, bUid] = this.breedPick
    const a = aUid ? eligible.find((f) => f.uid === aUid) : undefined
    const b = bUid ? eligible.find((f) => f.uid === bUid) : undefined

    const actionBar = document.createElement('div')
    actionBar.className = 'action-bar breeding-actions'

    const row = document.createElement('div')
    row.className = 'action-buttons'
    const canBreed = Boolean(a && b && this.state.hearts > 0)
    const go = makeButton(c.breedBtn, () => {
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
    bindShortcut(go, 'run')
    row.append(go)

    const bestPairBtn = makeButton(c.breedAutoPickBtn, () => {
      if (recommendedPair.length < 2) {
        this.say(collectionCopy(this.locale).autoPairUnavailable, 'bad')
        this.render(now)
        return
      }
      sound.play('select')
      this.breedPick = recommendedPair
      this.say('')
      this.render(now)
    })
    bestPairBtn.className = 'btn-secondary'
    bestPairBtn.setAttribute('aria-disabled', String(recommendedPair.length < 2))
    bindShortcut(bestPairBtn, 'autoPick')
    row.append(bestPairBtn)

    if (this.breedPick.length > 0) {
      const clear = makeButton(c.clearBtn, () => {
        sound.play('click')
        this.breedPick = []
        this.say('')
        this.render(now)
      })
      clear.className = 'btn-secondary'
      bindShortcut(clear, 'clear')
      row.append(clear)
    }

    actionBar.append(row)
    if (a && b) {
      actionBar.append(this.oddsTable(a.tier, b.tier))
    }

    const out: Node[] = [headRow, actionBar]

    const grid = document.createElement('div')
    grid.className = 'fish-grid'
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

    out.push(note(c.breedNote, c.breedNoteTitle, TAB_ICONS.breed))
    return out
  }

  // --------------------------------------------------------------- merge

  private mergeModeTabs(): HTMLElement {
    const row = document.createElement('div')
    row.className = 'book-pages'
    const c = reforgeCopy(this.locale)
    row.setAttribute('aria-label', this.locale === 'zh' ? '合成方式' : 'Merge mode')
    for (const [mode, text] of [['merge', c.merge], ['reforge', c.title]] as const) {
      const button = makeButton(text, () => {
        this.mergeMode = mode
        this.mergePick = []; this.reforgePick = []
        this.render()
        this.body.querySelector<HTMLButtonElement>(`[data-merge-mode="${mode}"]`)?.focus({ preventScroll: true })
      })
      button.dataset.mergeMode = mode
      button.setAttribute('aria-pressed', String(this.mergeMode === mode))
      row.append(button)
    }
    return row
  }

  private reforgePanel(now: number): Node[] {
    const c = reforgeCopy(this.locale)
    const candidates = reforgeCandidates(this.state, now)
    const valid = new Set(candidates.map(f => f.uid))
    this.reforgePick = this.reforgePick.filter(id => valid.has(id)).slice(0, 3)
    const header = document.createElement('div'); header.className = 'panel-head'
    header.append(heading(c.heading(this.reforgePick.length)))
    const row = document.createElement('div'); row.className = 'action-buttons'
    const go = makeButton(c.run, () => {
      const clickNow = Date.now()
      const before = structuredClone(this.state)
      const snapshots = this.reforgePick.map(id => this.state.fish.find(f => f.uid === id)).filter((f): f is Fish => Boolean(f)).map(f => ({ ...f }))
      const result = reforge(this.state, this.reforgePick, clickNow)
      if ('error' in result) this.say(c.error(result.error), 'bad')
      else if (!this.hooks.onSave()) {
        Object.assign(this.state, before)
        this.state.reforgeMisses = before.reforgeMisses
        this.say(c.storage, 'bad')
      } else {
        sound.play('merge-start')
        this.reforgePick = []
        this.say(c.done(speciesName(result.child.speciesId, this.locale), result.novel), 'good')
        this.openShowcase({ ...result, expGained: 0 }, 'merge', snapshots)
      }
      this.render(clickNow)
    })
    go.className = 'btn-primary'; go.dataset.reforgeRun = '1'
    go.setAttribute('aria-disabled', String(this.reforgePick.length !== 3)); bindShortcut(go, 'run')
    const auto = makeButton(this.t.mergeAutoPickBtn, () => {
      this.reforgePick = autoPickForReforge(this.state)
      this.render()
    })
    auto.className = 'btn-secondary'; auto.dataset.reforgeAuto = '1'
    auto.setAttribute('aria-disabled', String(candidates.length === 0)); bindShortcut(auto, 'autoPick')
    const clear = makeButton(this.t.clearBtn, () => { this.reforgePick = []; this.render() })
    clear.className = 'btn-secondary'; bindShortcut(clear, 'clear')
    clear.setAttribute('aria-disabled', String(this.reforgePick.length === 0))
    row.append(go, auto, clear)
    const action = document.createElement('div'); action.className = 'action-bar'; action.append(row)
    const missing = HIDDEN_SPECIES.filter(sp => !this.state.discovered.includes(sp.id))
    const pity = note(missing.length ? c.pity(reforgeMisses(this.state)) : c.complete)
    pity.dataset.reforgePity = String(reforgeMisses(this.state))
    const out: Node[] = [this.mergeModeTabs(), header, action, note(c.rule), note(c.odds), pity]
    const grid = document.createElement('div'); grid.className = 'fish-grid'
    grid.dataset.reforgeCandidates = '1'
    for (const fish of candidates) {
      const index = this.reforgePick.indexOf(fish.uid)
      grid.append(this.fishCell(fish, now, {
        selected: index !== -1, pickOrder: index + 1,
        onClick: () => {
          if (index !== -1) this.reforgePick = this.reforgePick.filter(id => id !== fish.uid)
          else if (this.reforgePick.length < 3) this.reforgePick.push(fish.uid)
          this.render()
        },
      }))
    }
    out.push(grid)
    if (!candidates.length) out.push(note(c.empty))
    return out
  }

  private mergePanel(now: number): Node[] {
    if (this.mergeMode === 'reforge') return this.reforgePanel(now)
    const c = this.t
    const filter = syncMergeFilter(this.state)
    const mergeCandidates = filterMergeCandidates(this.state)
    const candidateIds = new Set(mergeCandidates.map((f) => f.uid))
    this.mergePick = this.mergePick.filter((uid) => candidateIds.has(uid)).slice(0, SYNTHESIS_INPUT_COUNT)

    const headRow = document.createElement('div')
    headRow.className = 'panel-head'
    headRow.append(heading(c.mergeHeading(SYNTHESIS_INPUT_COUNT, this.mergePick.length)))

    const row = document.createElement('div')
    row.className = 'action-buttons'
    const ready = this.mergePick.length === SYNTHESIS_INPUT_COUNT
    const go = makeButton(c.mergeBtn, () => {
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
        this.say(result.error === 'locked-material' ? collectionCopy(this.locale).protectedMaterial : c.synthError(result.error, SYNTHESIS_INPUT_COUNT), 'bad')
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
    bindShortcut(go, 'run')

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
    bindShortcut(autoBtn, 'autoPick')

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
    bindShortcut(clear, 'clear')

    row.append(go, autoBtn, clear)

    const actionBar = document.createElement('div')
    actionBar.className = 'action-bar'
    actionBar.append(row)

    const out: Node[] = [this.mergeModeTabs(), headRow, actionBar]

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
    const countCandidates = filterMergeCandidates({
      ...this.state, mergeFilter: { ...filter, tiers: allMergeTiers },
    })
    for (const t of allMergeTiers) {
      const checked = filter.tiers.includes(t)
      const countInTier = countCandidates.filter(f => f.tier === t).length
      const tierRow = checkRow(
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
      tierList.append(tierRow)
    }

    filterBox.append(condTitle, condList, tierTitle, tierList)
    out.push(filterBox)

    const grid = document.createElement('div')
    grid.className = 'fish-grid'
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

    out.push(note(c.mergeNote, c.mergeNoteTitle, TAB_ICONS.merge))
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
    grid.className = 'fish-grid'

    for (const item of DECORATIONS) {
      const unlocked = isDecorUnlocked(this.state, item.id)
      const placed = placedIds.has(item.id)
      const name = decorName(item.id, this.locale)
      const metaText = !unlocked
        ? c.decorUnlockAt(item.unlockLevel)
        : placed
          ? `${c.decorUnlockedAt(item.unlockLevel)} · ${c.decorPlacedTag}`
          : c.decorUnlockedAt(item.unlockLevel)

      const flipBtn = placed ? makeActionButton(ACTION_ICONS.flip, `${c.decorFlipBtn}: ${name}`, () => {
        if (flipDecor(this.state, item.id)) {
          sound.play('click')
          this.hooks.onSave()
          this.say(c.decorFlippedMsg(name))
          this.render()
        }
      }) : undefined
      if (flipBtn) flipBtn.dataset.flipDecor = item.id
      const cell = itemCard({
        key: `decor:${item.id}`, label: `${name}: ${metaText}`, name,
        portrait: this.decorPortrait(item, !unlocked), meta: label(metaText, 'meta'),
        density: 'compact', selected: placed, unavailable: !unlocked, action: flipBtn,
        onActivate: () => {
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
        },
      })
      cell.dataset.decorId = item.id

      grid.append(cell)
    }

    out.push(grid, note(c.decorNote, c.decorNoteTitle, TAB_ICONS.decor))
    return out
  }

  // ---------------------------------------------------------------- book

  private bookPanel(): Node[] {
    const c = this.t
    const out: Node[] = []

    const totalVariants = REGULAR_SPECIES.reduce((sum, sp) => sum + (sp.tier === 0 ? 1 : 5), 0)
    const unlockedVariants = REGULAR_SPECIES.reduce(
      (sum, sp) =>
        sum + Math.min(sp.tier === 0 ? 1 : 5, discoveredGradesFor(this.state, sp.id).length),
      0,
    )
    const pctStr = ((unlockedVariants / Math.max(1, totalVariants)) * 100).toFixed(1)

    const headRow = document.createElement('div')
    headRow.className = 'panel-head'
    const prog = collectionProgress(this.state)
    headRow.append(
      heading(c.bookHeading),
    )
    if (this.bookPage === 'species') headRow.append(label(c.bookCompletion(pctStr), 'sort-label'))
    out.push(headRow)
    const pages = document.createElement('div'); pages.className = 'book-pages'; pages.setAttribute('role', 'tablist')
    pages.setAttribute('aria-label', this.locale === 'zh' ? '图鉴分页' : 'Book pages')
    const knownHidden = HIDDEN_SPECIES.filter(sp => this.state.discovered.includes(sp.id))
    const medals = milestoneProgress(this.state)
    const earned = medals.filter(p => p.unlocked).length
    for (const [id, text, count] of [
      ['species', this.locale === 'zh' ? '鱼种' : 'Species', `${prog.owned}/${prog.total}`],
      ['medals', this.locale === 'zh' ? '勋章' : 'Medals', `${earned}/${medals.length}`],
    ] as const) {
      const button = makeButton(text, () => {
        this.bookPage = id; this.bookDetailSpeciesId = null; this.render()
        scrollPanelTo(this.body, this.body)
        this.body.querySelector<HTMLButtonElement>(`[data-book-page="${id}"]`)?.focus({ preventScroll: true })
      })
      const progress = document.createElement('span'); progress.className = 'book-page-count'; progress.textContent = count
      button.append(progress)
      button.setAttribute('aria-label', `${text} ${count}`)
      button.id = `book-tab-${id}`; button.setAttribute('aria-controls', 'book-page-content'); button.dataset.bookPage = id; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(this.bookPage === id)); button.tabIndex = this.bookPage === id ? 0 : -1
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const ids = ['species', 'medals'] as const
        const next = event.key === 'Home' ? 'species' : event.key === 'End' ? 'medals' : ids[(ids.indexOf(id) + 1) % 2]
        this.body.querySelector<HTMLButtonElement>(`[data-book-page="${next}"]`)?.click()
      })
      pages.append(button)
    }
    out.push(pages)
    if (this.bookPage === 'medals') {
      const panel = milestonePanel(this.state, this.locale, id => {
        const c = milestoneCopy(this.locale), ok = choosePlaque(this.state, id, () => this.hooks.onSave())
        this.say(ok ? c.saved : c.storage, ok ? 'good' : 'bad'); this.render()
        const trigger = this.body.querySelector<HTMLButtonElement>(id === 'all' || id === 'none' ? `[data-medals="${id}"]` : `[data-milestone-equip="${id}"]`)
        const focusTarget = trigger && !trigger.disabled ? trigger : this.body.querySelector<HTMLButtonElement>('[data-book-page="medals"]')
        focusTarget?.focus({ preventScroll: true })
      })
      panel.id = 'book-page-content'; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'book-tab-medals'); out.push(panel)
      return out
    }
    const layout = document.createElement('div')
    layout.className = `book-layout${this.bookDetailSpeciesId ? ' with-detail' : ''}`
    layout.id = 'book-page-content'; layout.setAttribute('role', 'tabpanel'); layout.setAttribute('aria-labelledby', `book-tab-${this.bookPage}`)

    if (this.bookDetailSpeciesId) {
      const detailSp = SPECIES.find((s) => s.id === this.bookDetailSpeciesId)
      if (detailSp && this.state.discovered.includes(detailSp.id)) {
        layout.append(this.bookDetailView(detailSp))
      } else {
        this.bookDetailSpeciesId = null
      }
    }

    const grid = document.createElement('div')
    grid.className = 'fish-grid book-grid item-grid'
    for (const sp of [...REGULAR_SPECIES, ...knownHidden]) {
      const owned = this.state.discovered.includes(sp.id)
      const ownedCopies = this.state.fish.filter((f) => f.speciesId === sp.id)
      const lockedCount = ownedCopies.filter(f => f.locked).length
      const lockedLabel = collectionCopy(this.locale).lockedCount(lockedCount, ownedCopies.length)
      const lockedStatus = lockedCount ? makeStatusIcon(ACTION_ICONS.lock, lockedLabel) : undefined
      lockedStatus?.append(label(`${lockedCount}/${ownedCopies.length}`, 'item-card-count'))
      const bestOwnedGrade = ownedCopies.length
        ? (Math.max(...ownedCopies.map((f) => f.grade)) as Grade)
        : (Math.max(1, ...discoveredGradesFor(this.state, sp.id)) as Grade)
      const isActive = this.bookDetailSpeciesId === sp.id
      const hiddenLabel = sp.hidden ? (this.locale === 'zh' ? '隐藏' : 'Hidden') : ''

      const cell = itemCard({
        key: `species:${sp.id}`, selected: isActive, unavailable: !owned,
        label: owned ? `${speciesName(sp.id, this.locale)}${hiddenLabel ? ` · ${hiddenLabel}` : ''}${lockedCount ? ` · ${lockedLabel}` : ''}` : c.bookLockedMsg(`${stars(sp.tier)} ${tierName(sp.tier, this.locale)}`),
        name: owned ? speciesName(sp.id, this.locale) : '???',
        portrait: this.cardPortrait(sp, sp.tier, owned ? bestOwnedGrade : 1, !owned),
        meta: this.tierMetaLine(sp.tier),
        count: owned ? { text: `×${ownedCopies.length}` } : undefined,
        status: lockedStatus ? [lockedStatus] : undefined,
        onActivate: () => {
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
            }
          } else {
            this.say(c.bookLockedMsg(`${stars(sp.tier)} ${tierName(sp.tier, this.locale)}`), 'bad')
          }
          this.render()
          if (owned && this.bookDetailSpeciesId && (window.innerWidth <= 720 || getComputedStyle(this.body).overflowY === 'visible')) {
            const detail = this.body.querySelector<HTMLElement>('.book-detail')
            if (detail) scrollPanelTo(this.body, detail, this.renderer.manifest.renderer === 'lcd' || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')
          }
          if (owned) {
            const focus = this.body.querySelector<HTMLElement>(this.bookDetailSpeciesId ? '.book-detail' : `[data-species="${sp.id}"] .item-card-main`)
            if (focus) { if (this.bookDetailSpeciesId) focus.tabIndex = -1; focus.focus({ preventScroll: true }) }
          }
        },
      })
      cell.dataset.species = sp.id
      cell.dataset.hiddenSpecies = String(Boolean(sp.hidden))
      if (hiddenLabel) cell.querySelector('.item-card-header')?.append(label(hiddenLabel, 'item-card-secret'))
      grid.append(cell)
    }

    layout.append(grid)
    out.push(layout, note(c.bookNote, c.bookNoteTitle, TAB_ICONS.book))
    return out
  }

  private bookDetailView(sp: Species): HTMLElement {
    const c = this.t
    const cc = collectionCopy(this.locale)
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
    closeBtn.innerHTML = CLOSE_ICON
    closeBtn.addEventListener('click', () => {
      sound.play('click')
      this.bookDetailSpeciesId = null
      this.confirmingReleaseUid = null
      this.render()
      this.body.querySelector<HTMLButtonElement>(`[data-species="${sp.id}"] .item-card-main`)?.focus({ preventScroll: true })
    })
    closeBtn.setAttribute('aria-label', this.locale === 'zh' ? '关闭详情' : 'Close details')
    top.append(titles, closeBtn)

    // Specimens of this species currently in inventory
    const specimens = sortTankFish(
      this.state.fish.filter((f) => f.speciesId === sp.id),
      'grade',
      new Set(syncTank(this.state)),
    )
    if (this.bookSelectedUid && !specimens.some((f) => f.uid === this.bookSelectedUid)) {
      this.bookSelectedUid =
        specimens.find((f) => f.grade === this.bookDetailGrade)?.uid ?? specimens[0]?.uid ?? null
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

    // Place or store the selected specimen.
    const actionsRow = document.createElement('div')
    actionsRow.className = 'book-detail-actions'
    if (activeSpecimen) {
      const inTank = syncTank(this.state).includes(activeSpecimen.uid)
      const cap = capacity(this.state)
      const placeBtn = makeButton(inTank ? c.bookStoreAction : c.bookPlaceAction, () => {
        this.confirmingReleaseUid = null
        const res = toggleTankFish(this.state, activeSpecimen.uid)
        const name = speciesName(sp.id, this.locale)
        const placedNow = syncTank(this.state).length
        if (res === 'placed') {
          sound.play('place')
          this.hooks.onSave()
          this.say(c.placedMsg(name, placedNow, cap), 'good')
        } else if (res === 'removed') {
          this.hooks.onFishWithdraw(activeSpecimen.uid)
          sound.play('select')
          this.hooks.onSave()
          this.say(c.removedFromTankMsg(name, placedNow, cap))
        } else {
          this.say(c.tankDisplayFullMsg(cap), 'bad')
        }
        this.render()
      }, inTank ? ACTION_ICONS.store : ACTION_ICONS.place)
      placeBtn.className = 'btn-primary'
      actionsRow.append(placeBtn)

    }

    const care = activeSpecimen
      ? fishCare(activeSpecimen, this.locale, actionsRow, locked => this.collectionChanged(activeSpecimen, locked))
      : document.createDocumentFragment()
    if (activeSpecimen && activeSpecimen.tier > 0 && !activeSpecimen.locked) care.append(this.fishReleaseControl(activeSpecimen))

    // Grade Variant Color Swatches (1 for starter fish, 5 for regular species)
    const unlockedGrades = new Set(discoveredGradesFor(this.state, sp.id))
    const maxGrades: Grade[] = sp.tier === 0 ? [1] : [1, 2, 3, 4, 5]
    const varRow = document.createElement('div')
    varRow.className = 'variant-strip'
    for (const g of maxGrades) {
      const isUnlocked = unlockedGrades.has(g)
      const chip = itemCard({
        key: `grade:${sp.id}:${g}`, density: 'mini',
        label: c.gradeLabel(g), selected: this.bookDetailGrade === g && isUnlocked, unavailable: !isUnlocked,
        portrait: this.portrait(sp, sp.tier, g, !isUnlocked),
        meta: isUnlocked ? label(c.gradeLabel(g), `meta grade-${g}`) : makeStatusIcon(ACTION_ICONS.lock, collectionCopy(this.locale).locked),
        onActivate: () => {
          if (!isUnlocked) return
          sound.play('select')
          this.bookDetailGrade = g
          this.render()
          this.body.querySelector<HTMLButtonElement>(`[data-variant-grade="${g}"] .item-card-main`)?.focus({ preventScroll: true })
        },
      })
      chip.dataset.variantGrade = String(g)
      varRow.append(chip)
    }

    // Owned specimens grid
    const specTitle = heading(c.bookSpecimensTitle(specimens.length), 'h3')
    const specHead = document.createElement('div')
    specHead.className = 'book-specimen-head'
    specHead.append(specTitle)
    if (specimens.length) {
      const allLocked = specimens.every(f => f.locked)
      const lockAll = makeButton(allLocked ? cc.allOwnedLocked : cc.lockOwned, () => {
        const previous = specimens.map(fish => ({ fish, locked: fish.locked }))
        if (!lockOwnedSpecies(this.state, sp.id)) return
        this.confirmingReleaseUid = null
        if (!this.hooks.onSave()) {
          for (const { fish, locked } of previous) {
            if (locked === undefined) delete fish.locked
            else fish.locked = locked
          }
          this.say(cc.storageError, 'bad')
        }
        this.render()
        const button = this.body.querySelector<HTMLButtonElement>('[data-lock-owned]')
        const focus = button?.disabled
          ? this.body.querySelector<HTMLButtonElement>('.book-selected-specimen [data-fish-lock]')
          : button
        focus?.focus({ preventScroll: true })
      }, ACTION_ICONS.lock)
      lockAll.disabled = allLocked
      lockAll.title = cc.lockOwnedNote
      lockAll.dataset.lockOwned = sp.id
      specHead.append(lockAll)
    }
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
            pickOrder: specimens.indexOf(f) + 1,
            density: 'mini',
            onClick: () => {
              sound.play('select')
              this.bookSelectedUid = f.uid
              this.bookDetailGrade = f.grade
              this.confirmingReleaseUid = null
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

    const selection = document.createElement('section')
    selection.className = 'book-selected-specimen'
    if (activeSpecimen) {
      const selectedTitle = heading(cc.currentSpecimen(specimens.indexOf(activeSpecimen) + 1), 'h3')
      selection.setAttribute('aria-label', selectedTitle.textContent!)
      selection.append(selectedTitle, previewWrap, previewMeta, care)
    }

    const variants = document.createElement('details')
    variants.className = 'book-appearance-section'
    variants.open = this.bookVariantsOpen || !specimens.length
    variants.addEventListener('toggle', () => { this.bookVariantsOpen = variants.open })
    const summary = document.createElement('summary')
    summary.textContent = `${cc.appearanceBook} · ${varCount}/${maxGrades.length}`
    const appearance = document.createElement('div')
    appearance.className = 'book-preview book-appearance-preview'
    appearance.append(this.largePortrait(sp, sp.tier, this.bookDetailGrade))
    const appearanceMeta = document.createElement('div')
    appearanceMeta.className = 'book-preview-meta'
    appearanceMeta.append(label(cc.appearancePreview, 'collection-hint'), this.tierMetaLine(sp.tier, this.bookDetailGrade))
    variants.append(summary, varRow, appearance, appearanceMeta)

    card.append(top, specHead, specGrid)
    if (activeSpecimen) card.append(selection)
    card.append(variants, footer)
    return card
  }

  // ------------------------------------------------------------ settings

  private settingsPanel(): Node[] {
    const c = this.t

    // Card 1: Theme
    const themeCard = document.createElement('div')
    themeCard.className = 'settings-card'

    const themeRow = document.createElement('div')
    themeRow.className = 'row m-0'
    for (const theme of this.hooks.themes) {
      const b = makeButton(themeName(theme.id, theme.name, this.locale), () => {
        sound.play('click')
        this.hooks.onThemeChange(theme.id)
      })
      b.setAttribute('aria-pressed', String(this.state.theme === theme.id))
      themeRow.append(b)
    }
    themeCard.dataset.settingsSection = 'display'
    themeCard.append(heading(c.settingsThemeHeading, 'h3'), themeRow)

    // Card 2: Color Mode
    const modeCard = document.createElement('div')
    modeCard.className = 'settings-section'

    const modeRow = document.createElement('div')
    modeRow.className = 'row m-0'
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
    modeCard.append(
      heading(c.settingsColorModeHeading, 'h3'),
      modeRow,
      label(c.settingsColorModeNote, 'collection-hint'),
    )

    const railConfig = syncRailLightConfig(this.state.railLights)
    const railToggle = checkRow(c.railLightsAnimated, railConfig.animated, () => {
      const current = syncRailLightConfig(this.state.railLights)
      this.state.railLights = { ...current, animated: !current.animated }
      this.hooks.onSave()
      this.render()
      this.body.querySelector<HTMLButtonElement>('[data-rail-toggle]')?.focus()
    })
    railToggle.dataset.railToggle = '1'
    const frequencyRow = document.createElement('div')
    frequencyRow.className = 'audio-row'
    const frequencyLabel = document.createElement('label')
    frequencyLabel.htmlFor = 'rail-light-frequency'
    frequencyLabel.textContent = c.railLightsFrequency
    const frequencySlider = document.createElement('input')
    frequencySlider.id = 'rail-light-frequency'
    frequencySlider.type = 'range'
    frequencySlider.className = 'vol-slider'
    frequencySlider.min = '0.2'
    frequencySlider.max = '2'
    frequencySlider.step = '0.1'
    frequencySlider.value = String(railConfig.frequency)
    frequencySlider.disabled = !railConfig.animated
    frequencySlider.setAttribute('aria-valuetext', c.railLightsRate(railConfig.frequency))
    const frequencyValue = document.createElement('span')
    frequencyValue.className = 'vol-pct'
    frequencyValue.textContent = c.railLightsRate(railConfig.frequency)
    frequencySlider.addEventListener('input', () => {
      this.state.railLights = syncRailLightConfig({
        ...this.state.railLights, frequency: Number(frequencySlider.value),
      })
      const text = c.railLightsRate(this.state.railLights.frequency)
      frequencyValue.textContent = text
      frequencySlider.setAttribute('aria-valuetext', text)
    })
    frequencySlider.addEventListener('change', () => this.hooks.onSave())
    frequencyRow.append(frequencyLabel, frequencySlider, frequencyValue)
    modeCard.append(heading(c.settingsRailLightsHeading, 'h3'), railToggle, frequencyRow, label(c.railLightsNote, 'collection-hint'))

    // Card 3: Audio & BGM controls
    const audioCfg = syncAudioConfig(this.state.audio)
    const audioCard = document.createElement('div')
    audioCard.className = 'settings-card'

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
    bindShortcut(sfxToggle, 'sfx')

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
    bindShortcut(bgmToggle, 'bgm')

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
    trackRow.className = 'row m-0'
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

    audioCard.append(
      heading(c.settingsAudioHeading, 'h3'),
      sfxRow,
      bgmRow,
      heading(c.audioTrackHeading, 'h3'),
      trackRow,
    )

    // Language and help stay separate from save management.
    const systemCard = document.createElement('div')
    systemCard.className = 'settings-card'

    const langHelpRow = document.createElement('div')
    langHelpRow.className = 'row m-0'
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

    const openHelp = makeIconButton(HELP_ICON, c.openHelpBtn, () => {
      sound.play('click')
      this.openHelp()
    })
    openHelp.className = 'icon-btn btn-secondary'
    langHelpRow.append(zhBtn, enBtn, openHelp)

    const danger = document.createElement('div')
    danger.className = 'row m-0'
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

    systemCard.append(
      heading(c.settingsLangHeading, 'h3'),
      langHelpRow,
    )

    const grid = document.createElement('div')
    grid.className = 'settings-grid'
    const notificationCard = document.createElement('div')
    notificationCard.className = 'settings-card'
    const notificationStatus = heartReminder.status()
    const notificationEnabled = heartReminder.enabled()
    const notificationButton = makeButton(notificationEnabled ? c.reminderDisable : c.reminderEnable, async () => {
      notificationButton.disabled = true
      if (heartReminder.enabled()) heartReminder.disable()
      else await heartReminder.enable()
      await heartReminder.check(() => this.state)
      this.render()
      this.body.querySelector<HTMLButtonElement>('[data-heart-reminder]')?.focus()
    })
    notificationButton.dataset.heartReminder = '1'
    notificationButton.setAttribute('aria-pressed', String(notificationEnabled))
    notificationButton.disabled = notificationStatus === 'unsupported'
    const notificationMessage = document.createElement('p')
    notificationMessage.className = 'collection-hint'
    notificationMessage.dataset.heartReminderStatus = notificationStatus
    notificationMessage.setAttribute('role', 'status')
    notificationMessage.textContent = c.reminderStatus[notificationStatus]
    notificationCard.append(heading(c.reminderHeading, 'h3'), notificationButton, notificationMessage, label(c.reminderNote, 'collection-hint'))
    themeCard.append(modeCard)
    const secondary = document.createElement('div')
    secondary.className = 'settings-stack'
    secondary.append(audioCard, notificationCard, systemCard)
    const saves = saveTools(this.state, this.locale, async next => {
      const ok = await this.hooks.onRestore(next)
      if (ok) this.say(collectionCopy(this.locale).importDone, 'good')
      return ok
    })
    const resetSection = document.createElement('div')
    resetSection.className = 'settings-section settings-reset'
    resetSection.append(heading(c.settingsSaveHeading, 'h3'), danger, label(c.settingsSaveNote, 'collection-hint'))
    saves.append(resetSection)
    grid.append(themeCard, secondary, saves)

    return [grid]
  }

  private renderFooter(): void {
    const c = this.t
    const left = document.createElement('div')
    left.className = 'footer-meta'
    const version = document.createElement('span')
    version.textContent = `Fishtank v${APP_VERSION}`
    const separator = document.createElement('span')
    separator.className = 'footer-separator'
    separator.textContent = ' · '
    const copyright = document.createElement('span')
    copyright.className = 'footer-copyright'
    copyright.textContent = '© 2026 Seven Yu'
    left.append(version, separator, copyright)

    const right = document.createElement('div')
    right.className = 'footer-links'

    const helpLink = document.createElement('button')
    helpLink.type = 'button'
    helpLink.className = 'footer-link'
    helpLink.innerHTML = `<span class="ico">${HELP_ICON}</span><span class="btn-text">${c.helpBtn}</span>`
    helpLink.setAttribute('aria-label', c.helpBtn)
    helpLink.onclick = () => {
      sound.play('click')
      this.openHelp()
    }
    bindShortcut(helpLink, 'help')

    const changelogLink = makeIconButton(CHANGELOG_ICON, c.changelogBtn, () => {
      sound.play('click')
      this.helpOpen = false
      this.changelogOpen = true
      this.renderShowcase()
    })
    changelogLink.className = 'footer-link'
    changelogLink.setAttribute('aria-label', c.changelogBtn)
    changelogLink.dataset.changelog = '1'
    bindShortcut(changelogLink, 'changelog')

    const ghLink = document.createElement('a')
    ghLink.href = GITHUB_URL
    ghLink.target = '_blank'
    ghLink.rel = 'noopener noreferrer'
    ghLink.className = 'footer-link'
    ghLink.title = 'GitHub: dofy/fishtank'
    ghLink.setAttribute('aria-label', 'GitHub')
    ghLink.innerHTML = `<span class="ico">${GITHUB_ICON}</span><span class="btn-text">GitHub</span>`

    right.append(helpLink, changelogLink, ghLink)
    this.footer.replaceChildren(left, right)
  }

  private renderHelpModal(): HTMLElement {
    const c = this.t
    const backdrop = document.createElement('div')
    backdrop.className = 'showcase-backdrop help-backdrop'
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        sound.play('click')
        this.closeHelp()
      }
    })

    const card = document.createElement('div')
    card.className = 'help-modal'
    card.dataset.helpDialog = this.locale
    card.setAttribute('role', 'dialog')
    card.setAttribute('aria-modal', 'true')
    card.setAttribute('aria-labelledby', 'help-title')

    const top = document.createElement('div')
    top.className = 'book-detail-head modal-header'
    const title = document.createElement('h2')
    title.className = 'm-0 text-base font-bold text-[var(--accent)]'
    title.id = 'help-title'
    title.textContent = `${c.helpModalTitle} (v${APP_VERSION})`

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'book-close-btn'
    closeBtn.innerHTML = CLOSE_ICON
    closeBtn.dataset.helpClose = '1'
    closeBtn.setAttribute('aria-label', c.shortcutsCloseHelp)
    closeBtn.onclick = () => {
      sound.play('click')
      this.closeHelp()
    }
    top.append(title, closeBtn)

    const tabs = document.createElement('div')
    tabs.className = 'help-tabs'
    tabs.setAttribute('role', 'tablist')
    tabs.setAttribute('aria-label', c.shortcutsHelpContents)
    const sections = ['guide', 'matrix', 'levels', 'tiers', 'grades', 'shortcuts'] as const
    const panels = new Map<string, HTMLElement>()
    const buttons = new Map<string, HTMLButtonElement>()
    const activate = (id: string): void => {
      for (const [key, panel] of panels) {
        panel.hidden = key !== id
        const button = buttons.get(key)!
        button.setAttribute('aria-selected', String(key === id))
        button.tabIndex = key === id ? 0 : -1
      }
    }
    for (const [index, id] of sections.entries()) {
      const panel = document.createElement('div')
      panel.className = 'help-body help-panel'
      panel.id = `help-panel-${id}`
      panel.tabIndex = 0
      panel.setAttribute('role', 'tabpanel')
      panel.setAttribute('aria-labelledby', `help-tab-${id}`)
      const button = makeButton(c.helpTabs[id], () => activate(id))
      button.id = `help-tab-${id}`
      button.setAttribute('role', 'tab')
      button.setAttribute('aria-controls', panel.id)
      button.addEventListener('keydown', event => {
        let next: number
        if (event.key === 'ArrowRight') next = (index + 1) % sections.length
        else if (event.key === 'ArrowLeft') next = (index + sections.length - 1) % sections.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = sections.length - 1
        else return
        if (event.ctrlKey || event.metaKey || event.altKey) return
        event.preventDefault()
        const target = sections[next]!
        activate(target)
        buttons.get(target)!.focus()
      })
      panels.set(id, panel)
      buttons.set(id, button)
      tabs.append(button)
    }
    activate('guide')
    const content = panels.get('shortcuts')!
    const guideContent = panels.get('guide')!
    const matrixContent = panels.get('matrix')!
    const levelContent = panels.get('levels')!
    const tierContent = panels.get('tiers')!
    const gradeContent = panels.get('grades')!

    content.append(heading(c.shortcutsTitle, 'h3'))
    const shortcutGuide = document.createElement('section')
    shortcutGuide.className = 'shortcut-guide'
    const shortcutTabs = document.createElement('dl')
    shortcutTabs.className = 'shortcut-tabs'
    shortcutTabs.setAttribute('aria-label', c.shortcutsTabsLabel)
    const shortcutActions = document.createElement('dl')
    shortcutActions.className = 'shortcut-actions'
    shortcutActions.setAttribute('aria-label', c.shortcutsActionsLabel)
    const descriptions: Record<Exclude<ShortcutAction, `tab-${Tab}`>, string> = {
      immersive: c.shortcutsImmersive, mode: c.shortcutsMode, bgm: c.shortcutsBgm, sfx: c.shortcutsSfx,
      locale: c.shortcutsLocale, help: c.helpBtn, changelog: c.changelogBtn,
      autoPick: c.shortcutsAutoPick, clear: c.shortcutsClear, run: c.shortcutsRun, escape: c.shortcutsEscape,
    }
    // R is the context action; Enter gives focused controls priority. Explain them separately.
    const guideShortcuts = SHORTCUTS.flatMap(shortcut => shortcut.action === 'run'
      ? [{ ...shortcut, keys: ['r'] }, { ...shortcut, keys: ['Enter'] }]
      : [shortcut])
    for (const shortcut of guideShortcuts) {
      const isEnter = shortcut.action === 'run' && shortcut.keys[0] === 'Enter'
      const row = document.createElement('div')
      row.className = 'shortcut-item'
      row.dataset.shortcutGuide = isEnter ? 'enter' : shortcut.action
      const keys = document.createElement('dt')
      keys.className = 'shortcut-keys'
      const labels = shortcut.action === 'run' ? [isEnter ? 'Enter' : 'R'] : shortcutLabels(shortcut.action)
      for (const [index, key] of labels.entries()) {
        if (index) keys.append(' / ')
        const badge = document.createElement('kbd')
        badge.textContent = key
        keys.append(badge)
      }
      const description = isEnter ? c.shortcutsEnter : shortcut.action.startsWith('tab-')
        ? c.tabs[shortcut.action.slice(4) as Tab]
        : descriptions[shortcut.action as keyof typeof descriptions]
      const text = document.createElement('dd')
      text.textContent = description
      row.append(keys, text)
      ;(shortcut.action.startsWith('tab-') ? shortcutTabs : shortcutActions).append(row)
    }
    shortcutGuide.append(shortcutTabs, shortcutActions)
    content.append(shortcutGuide, note(c.shortcutsNote))

    // Section 1: Core Guide
    guideContent.append(heading(c.helpIntroTitle, 'h3'))
    const lead = document.createElement('p')
    lead.className = 'help-intro-lead'
    lead.textContent = c.helpIntroLead
    guideContent.append(lead)
    const ul = document.createElement('ul')
    ul.className = 'help-list'
    for (const item of c.helpIntroItems) {
      const li = document.createElement('li')
      const title = document.createElement('h4')
      title.textContent = item.title
      const text = document.createElement('p')
      text.textContent = item.text
      li.append(title, text)
      ul.append(li)
    }
    guideContent.append(ul, note(collectionCopy(this.locale).help), note(milestoneCopy(this.locale).help))

    // Section 2: Breeding Probability Matrix
    matrixContent.append(heading(c.helpMatrixTitle, 'h3'))
    const matrixNote = document.createElement('p')
    matrixNote.className = 'help-table-note'
    matrixNote.textContent = c.helpMatrixNote
    matrixContent.append(matrixNote)
    const matrixTable = document.createElement('table')
    matrixTable.className = 'odds help-table help-matrix'
    const mHead = document.createElement('tr')
    mHead.append(
      th(c.pairingCol),
      ...([1, 2, 3, 4, 5] as Tier[]).map((t) => {
        const cell = document.createElement('th')
        cell.className = `tier-${t}`
        cell.textContent = `${t}★`
        cell.setAttribute('aria-label', `${t}★ ${tierName(t, this.locale)}`)
        return cell
      }),
    )
    matrixTable.append(mHead)
    const matrixRows: { lower: Tier; row: HTMLTableRowElement }[] = []
    for (const [key, odds] of Object.entries(BREEDING_MATRIX)) {
      const [lo, hi] = key.split('+').map(Number) as [Tier, Tier]
      const tr = document.createElement('tr')
      tr.append(
        td(`${lo}★ + ${hi}★`),
        ...odds.map((v, idx) => {
          const cell = td(`${v}%`)
          if (v > 0) cell.className = `tier-${idx + 1}`
          return cell
        }),
      )
      matrixTable.append(tr)
      matrixRows.push({ lower: lo, row: tr })
    }
    const appendTable = (parent: HTMLElement, table: HTMLTableElement, label: string): void => {
      table.setAttribute('aria-label', label)
      for (const cell of table.querySelectorAll('th')) cell.scope = 'col'
      parent.append(table)
    }
    const parentTiers = document.createElement('div')
    parentTiers.className = 'help-parent-tiers'
    parentTiers.setAttribute('role', 'group')
    parentTiers.setAttribute('aria-label', c.helpParentTierPicker)
    const parentButtons: HTMLButtonElement[] = []
    const selectParentTier = (tier: Tier): void => {
      for (const entry of matrixRows) entry.row.hidden = entry.lower !== tier
      parentButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === tier)))
    }
    for (const tier of [0, 1, 2, 3, 4, 5] as Tier[]) {
      const button = makeButton(`${tier}★`, () => selectParentTier(tier))
      button.dataset.helpParentTier = String(tier)
      parentButtons.push(button)
      parentTiers.append(button)
    }
    selectParentTier(0)
    matrixContent.append(parentTiers)
    appendTable(matrixContent, matrixTable, c.helpMatrixTitle)

    // Section 3: Aquarium Levels & Capacity
    levelContent.append(heading(c.helpLevelTitle, 'h3'))
    const lvTable = document.createElement('table')
    lvTable.className = 'odds help-table help-levels'
    const lvHead = document.createElement('tr')
    lvHead.append(
      th(c.helpLevelColLv),
      th(c.helpLevelColExp),
      th(c.helpLevelColCap),
      th(c.helpLevelColDecor),
    )
    lvTable.append(lvHead)
    const levelRows: HTMLTableRowElement[] = []
    for (const row of LEVELS) {
      const tr = document.createElement('tr')
      const decorCell = td('')
      for (const decor of DECORATIONS.filter(d => d.unlockLevel === row.level)) {
        const name = document.createElement('span')
        name.className = 'help-decor-name'
        name.textContent = decorName(decor.id, this.locale)
        decorCell.append(name)
      }
      if (!decorCell.childElementCount) decorCell.textContent = '—'
      tr.append(
        td(`Lv.${row.level}`),
        td(`${row.totalExp}`),
        td(`${row.capacity} / ${row.decorCapacity}`),
        decorCell,
      )
      lvTable.append(tr)
      levelRows.push(tr)
    }
    const levelPages = document.createElement('div')
    levelPages.className = 'help-level-pages'
    levelPages.setAttribute('role', 'group')
    levelPages.setAttribute('aria-label', c.helpTabs.levels)
    const levelButtons: HTMLButtonElement[] = []
    const selectLevelPage = (page: number): void => {
      levelRows.forEach((row, index) => { row.hidden = Math.floor(index / 3) !== page })
      levelButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === page)))
    }
    for (let page = 0; page < Math.ceil(LEVELS.length / 3); page++) {
      const first = LEVELS[page * 3]!.level
      const last = LEVELS[Math.min(page * 3 + 2, LEVELS.length - 1)]!.level
      const button = makeButton(first === last ? `Lv.${first}` : `Lv.${first}–${last}`, () => selectLevelPage(page))
      button.dataset.helpLevelPage = String(page)
      levelButtons.push(button)
      levelPages.append(button)
    }
    selectLevelPage(0)
    levelContent.append(levelPages)
    appendTable(levelContent, lvTable, c.helpLevelTitle)

    // Section 4: Rarity Tiers & Grade Multipliers
    tierContent.append(heading(c.helpTierTitle, 'h3'))
    const tierTable = document.createElement('table')
    tierTable.className = 'odds help-table help-tiers'
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
      const tierCell = td(`${t}★ ${tierName(t, this.locale)}`)
      tierCell.className = `tier-${t}`
      const mins = Math.round(GROWTH_MS_BY_TIER[t] / 60_000)
      const usesCell = td(t === 0 ? '∞' : '1–5')
      if (t !== 0) {
        const average = document.createElement('span')
        average.className = 'help-average'
        average.textContent = `${c.helpTierAverage} ${USES_BY_TIER[t]}`
        usesCell.append(average)
      }
      tr.append(tierCell, td(`${mins} min`), td(`${EXP_BY_TIER[t]} EXP`), usesCell)
      tierTable.append(tr)
    }
    appendTable(tierContent, tierTable, c.helpTierTitle)
    gradeContent.append(heading(c.helpGradeTitle, 'h3'), note(c.helpGradeNote))

    card.append(top, tabs, ...panels.values())
    backdrop.append(card)
    return backdrop
  }

  // ------------------------------------------------------------- showcase

  private closeChangelog(): void {
    sound.play('click')
    this.modal.querySelector<HTMLDialogElement>('.changelog-dialog')?.close()
    this.changelogOpen = false
    this.renderShowcase()
    this.footer.querySelector<HTMLButtonElement>('[data-changelog]')?.focus()
  }

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
        speed: 38,
        phase: 0,
        scale: 1.05,
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
    if (this.changelogOpen) {
      const current = this.modal.querySelector<HTMLDialogElement>('.changelog-dialog')
      if (current?.dataset.locale === this.locale) return
      const dialog = renderChangelogDialog(this.locale, APP_VERSION, () => this.closeChangelog())
      this.modal.replaceChildren(dialog)
      dialog.showModal()
      return
    }
    if (!this.showcase) {
      if (this.helpOpen) {
        if (this.modal.querySelector<HTMLElement>('[data-help-dialog]')?.dataset.helpDialog !== this.locale) {
          this.modal.replaceChildren(this.renderHelpModal())
        }
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
    card.dataset.phase = inCeremony ? 'ceremony' : 'result'
    card.setAttribute('role', 'dialog')
    card.setAttribute('aria-modal', 'true')
    card.setAttribute('aria-labelledby', 'showcase-title')

    const header = document.createElement('div')
    header.className = 'showcase-header modal-header'
    const title = document.createElement('span')
    title.className = 'showcase-title'
    title.id = 'showcase-title'
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
    const dpr = Math.min(2.5, (window.devicePixelRatio || 1) * 1.35)
    miniCanvas.width = Math.round(MINI_TANK_W * dpr)
    miniCanvas.height = Math.round(MINI_TANK_H * dpr)
    this.showcaseCanvas = miniCanvas
    tankWrap.append(miniCanvas)

    const body = document.createElement('div')
    body.className = 'showcase-body'
    const content = document.createElement('div')
    content.className = 'showcase-content'
    content.append(header, tankWrap)
    body.append(content)
    card.append(body)

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
      closeBtn.dataset.shortcut = 'collect'
      closeBtn.setAttribute('aria-keyshortcuts', 'r Enter Escape')

      const details = document.createElement('div')
      details.className = 'showcase-details'
      details.append(nameRow, metaLine, chips)
      content.append(details)
      const actions = document.createElement('div')
      actions.className = 'showcase-actions'
      actions.append(closeBtn)
      content.append(actions)
    } else {
      const progressOuter = document.createElement('div')
      progressOuter.className = 'ceremony-bar'
      const progressInner = document.createElement('span')
      progressInner.dataset.ceremonyBar = '1'
      progressOuter.append(progressInner)
      content.append(progressOuter)
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
    const dpr = Math.min(2.5, (window.devicePixelRatio || 1) * 1.35)
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
        const bob = Math.sin(p * Math.PI * 4) * 9
        tempAgents.push(
          {
            fish: pA,
            species: species(pA.speciesId),
            x: cx - dist,
            y: cy + bob,
            dir: 1,
            speed: 0,
            phase: 0,
            scale: 0.85 * (1 - p * 0.22),
          },
          {
            fish: pB,
            species: species(pB.speciesId),
            x: cx + dist,
            y: cy - bob,
            dir: -1,
            speed: 0,
            phase: Math.PI,
            scale: 0.85 * (1 - p * 0.22),
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
            scale: 0.68 * (1 - p * 0.42),
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

      drawCeremonyLight(ctx, this.renderer.manifest, night, ceremony.kind, p, MINI_TANK_W, MINI_TANK_H)
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

  private cachedCanvas(
    keySuffix: string,
    w: number,
    h: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ): HTMLCanvasElement {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const mode = document.documentElement.dataset.mode ?? 'dark'
    const key = `${this.renderer.manifest.id}:${mode}:${dpr}:${w}x${h}:${keySuffix}`

    let cached = this.portraitCache.get(key)
    if (!cached) {
      cached = document.createElement('canvas')
      cached.width = w * dpr
      cached.height = h * dpr
      const ctx = cached.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
        draw(ctx)
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

  private portrait(sp: Species, tier: Tier, grade: Grade, dim = false): HTMLCanvasElement {
    return this.cachedCanvas(`fish:${sp.id}:${tier}:${grade}:${dim ? 1 : 0}`, 96, 52, (ctx) => {
      this.renderer.portrait(ctx, 96, 52, { species: sp, tier, grade, dim })
    })
  }

  private cardPortrait(sp: Species, tier: Tier, grade: Grade, dim = false): HTMLCanvasElement {
    return this.cachedCanvas(`card:${sp.id}:${tier}:${grade}:${dim ? 1 : 0}`, 128, 72, ctx => {
      if (dim) {
        const len = Math.min(128 * 0.82, 72 * 0.76 / Math.max(0.35, sp.body.depth))
        ctx.translate((128 - len) / 2, 36)
        ctx.fillStyle = '#000'
        ctx.fill(fishPath(sp.body, len).path)
      } else this.renderer.portrait(ctx, 128, 72, { species: sp, tier, grade, dim: false })
    })
  }

  private decorPortrait(item: DecorItem, dim = false): HTMLCanvasElement {
    return this.cachedCanvas(`decor:${item.id}:${dim ? 1 : 0}`, 96, 56, (ctx) => {
      this.renderer.decorPortrait(ctx, 96, 56, { item, dim })
    })
  }

  private largePortrait(sp: Species, tier: Tier, grade: Grade): HTMLCanvasElement {
    return this.cachedCanvas(`large:${sp.id}:${tier}:${grade}`, 148, 84, (ctx) => {
      this.renderer.portrait(ctx, 148, 84, { species: sp, tier, grade, dim: false })
    })
  }

  private fishCell(
    fish: Fish,
    now: number,
    opts: {
      selected?: boolean
      pickOrder?: number
      showCooldown?: boolean
      locked?: boolean
      onClick?: () => void
      manage?: boolean
      density?: 'compact' | 'mini'
    },
  ): HTMLElement {
    const c = this.t, cc = collectionCopy(this.locale)
    const sp = species(fish.speciesId)
    const inTank = syncTank(this.state).includes(fish.uid)
    const cooling = Boolean(opts.showCooldown && !isAdult(fish, now) && fish.maturesAt !== null)
    let overlay: HTMLElement | undefined
    if (cooling && fish.maturesAt !== null) {
      overlay = document.createElement('div'); overlay.className = 'item-card-overlay cooldown'
      const clock = document.createElement('span'); clock.className = 'cd-clock'; clock.innerHTML = CLOCK_ICON
      const timer = label(formatClock(Math.max(0, fish.maturesAt - now)), 'timer')
      timer.dataset.maturesAt = String(fish.maturesAt)
      overlay.append(clock, timer)
    }
    const status: Node[] = []
    if (inTank) status.push(makeStatusIcon(TAB_ICONS.tank, c.badgeReadyTitle))
    const uses = fish.tier === 0 ? '∞' : `${fish.uses}/${fish.maxUses ?? USES_BY_TIER[fish.tier]}`
    const details = opts.manage ? makeActionButton(NOTE_INFO_ICON, cc.manage, () => this.openFishCare(fish)) : undefined
    if (details) details.dataset.fishCare = fish.uid
    const marks: Node[] = []
    if (fish.locked) marks.push(makeStatusIcon(ACTION_ICONS.lock, cc.locked))
    const card = itemCard({
      key: `fish:${fish.uid}`, selected: opts.selected, unavailable: opts.locked,
      density: opts.manage ? 'regular' : opts.density ?? 'compact',
      label: opts.manage
        ? `${fishDisplayName(fish, this.locale)}: ${inTank ? c.bookStoreAction : c.bookPlaceAction}`
        : this.describe(fish, now),
      name: opts.density === 'mini' ? undefined : fishDisplayName(fish, this.locale),
      portrait: opts.manage ? this.cardPortrait(sp, fish.tier, fish.grade) : this.portrait(sp, fish.tier, fish.grade, cooling),
      meta: this.tierMetaLine(fish.tier, fish.grade), title: this.describe(fish, now),
      count: { text: uses, title: c.showcaseUsesLabel(uses) },
      status, action: details, order: opts.pickOrder, overlay, marks,
      onActivate: () => opts.onClick?.(),
    })
    card.dataset.fishUid = fish.uid
    return card
  }

  private fishReleaseControl(fish: Fish): HTMLElement {
    const c = this.t, cc = collectionCopy(this.locale)
    const row = document.createElement('div'); row.className = 'fish-release'
    const confirming = this.confirmingReleaseUid === fish.uid
    const releaseButton = makeButton(confirming ? c.confirmReleaseBtn : c.releaseBtn, () => {
      if (!confirming) {
        this.confirmingReleaseUid = fish.uid
      } else {
        this.confirmingReleaseUid = null
        if (release(this.state, fish.uid)) {
          sound.play('release')
          this.breedPick = this.breedPick.filter(uid => uid !== fish.uid)
          this.mergePick = this.mergePick.filter(uid => uid !== fish.uid)
          this.hooks.onSave()
          this.say(c.releasedMsg(speciesName(fish.speciesId, this.locale)))
        }
      }
      this.render()
      const control = this.body.querySelector<HTMLElement>(confirming ? '.book-detail' : '[data-fish-release]')
      if (control && confirming) control.tabIndex = -1
      control?.focus({ preventScroll: true })
      if (control) scrollPanelTo(this.body, control.closest<HTMLElement>('.fish-release') ?? control)
    })
    releaseButton.dataset.fishRelease = fish.uid
    releaseButton.className = confirming ? 'danger-confirm' : 'fish-release-button'
    if (confirming) {
      const prompt = label(cc.releasePrompt(fishDisplayName(fish, this.locale)), 'collection-hint'); prompt.setAttribute('role', 'status')
      const cancel = makeButton(c.cancelBtn, () => {
        this.confirmingReleaseUid = null; this.render()
        this.body.querySelector<HTMLElement>('[data-fish-release]')?.focus({ preventScroll: true })
      })
      cancel.dataset.cancelRelease = '1'
      row.append(prompt, releaseButton, cancel)
    } else {
      const icon = document.createElement('span'); icon.className = 'ico'; icon.innerHTML = ACTION_ICONS.remove; icon.setAttribute('aria-hidden', 'true')
      releaseButton.prepend(icon)
      row.append(releaseButton)
    }
    return row
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

  private oddsTable(a: Tier, b: Tier): HTMLElement {
    const odds = tierOdds(a, b)
    const table = document.createElement('table')
    table.className = 'odds breeding-odds'
    const head = document.createElement('tr')
    head.append(
      th(this.t.pairingCol),
      ...odds.map((_, i) => {
        const t = (i + 1) as Tier
        const cell = document.createElement('th')
        cell.className = `tier-${t}`
        const sSpan = document.createElement('span')
        sSpan.className = 'odds-th-stars'
        sSpan.textContent = stars(t)
        const nSpan = document.createElement('span')
        nSpan.className = 'odds-th-name'
        nSpan.textContent = tierName(t, this.locale)
        const compact = document.createElement('span')
        compact.className = 'odds-compact'
        compact.textContent = `${t}★`
        cell.setAttribute('aria-label', `${t}★ ${tierName(t, this.locale)}`)
        cell.title = `${t}★ ${tierName(t, this.locale)}`
        cell.append(sSpan, nSpan, compact)
        return cell
      }),
    )
    const row = document.createElement('tr')
    const pairing = td('')
    const fullPair = document.createElement('span'); fullPair.className = 'odds-pair-full'; fullPair.textContent = `${stars(a)} + ${stars(b)}`
    const compactPair = document.createElement('span'); compactPair.className = 'odds-compact'; compactPair.textContent = `${a}★ + ${b}★`
    pairing.append(fullPair, compactPair)
    row.append(
      pairing,
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
