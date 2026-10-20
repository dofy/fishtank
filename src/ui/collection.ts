import { forecastBreed, renameFish, setFishFavorite, setFishLocked, targetReached } from '../core/collection'
import { exportSave, getSaveBackup, parseSaveImport } from '../core/save'
import { speciesName } from '../core/i18n'
import { SPECIES } from '../core/species'
import type { BreedGoal, Fish, GameState, Grade, Locale } from '../core/types'
import { heading, label, makeActionButton, makeButton, makeStatusIcon, note, scrollPanelTo } from './dom'
import { ACTION_ICONS, CLOSE_ICON, HEART_SVG, TAB_ICONS } from './icons'
import { collectionCopy } from './collection-copy'

type Change = () => void
export function fishDisplayName(fish: Fish, locale: Locale): string {
  return fish.nickname || speciesName(fish.speciesId, locale)
}

function selectField(text: string, id: string): [HTMLLabelElement, HTMLSelectElement] {
  const wrap = document.createElement('label')
  wrap.className = 'collection-field'
  wrap.htmlFor = id
  const select = document.createElement('select')
  select.id = id
  const control = document.createElement('span'); control.className = 'select-control'
  control.append(select)
  wrap.append(label(text, ''), control)
  return [wrap, select]
}
function option(select: HTMLSelectElement, value: string, text: string): void {
  const o = document.createElement('option'); o.value = value; o.textContent = text; select.append(o)
}

export function targetPanel(state: GameState, locale: Locale, change: Change, breed: Change): HTMLElement {
  const c = collectionCopy(locale), box = document.createElement('div')
  box.className = 'collection-target'
  const intro = document.createElement('div'); intro.className = 'collection-target-intro'
  intro.append(heading(c.targetTitle, 'h3'))
  box.append(intro)
  const fields = document.createElement('div'); fields.className = 'collection-fields'
  const [speciesField, selectSpecies] = selectField(c.targetSpecies, 'collection-target-species')
  option(selectSpecies, '', c.chooseSpecies)
  for (const sp of SPECIES) option(selectSpecies, sp.id, `${sp.tier}★ ${speciesName(sp.id, locale)}`)
  selectSpecies.value = state.collectionTarget?.speciesId ?? ''
  selectSpecies.addEventListener('change', () => {
    if (selectSpecies.value) state.collectionTarget = { speciesId: selectSpecies.value }
    else delete state.collectionTarget
    change()
  })
  fields.append(speciesField)
  const target = state.collectionTarget
  if (target) {
    const sp = SPECIES.find(s => s.id === target.speciesId)!
    if (sp.tier > 0) {
      const [gradeField, selectGrade] = selectField(c.targetGrade, 'collection-target-grade')
      gradeField.classList.add('collection-target-grade')
      option(selectGrade, '', c.anyGrade)
      for (let grade = 1; grade <= 5; grade++) option(selectGrade, String(grade), c.grade(grade))
      selectGrade.value = target.grade ? String(target.grade) : ''
      selectGrade.addEventListener('change', () => {
        state.collectionTarget = { speciesId: target.speciesId, ...(selectGrade.value ? { grade: Number(selectGrade.value) as Grade } : {}) }
        change()
      })
      fields.append(gradeField)
    }
    const status = makeStatusIcon(targetReached(state) ? ACTION_ICONS.current : ACTION_ICONS.target, targetReached(state) ? c.completed : c.tracking); status.classList.add('collection-status')
    intro.append(status)
    const clear = makeActionButton(CLOSE_ICON, c.clearTarget, () => { delete state.collectionTarget; change() })
    const go = makeActionButton(TAB_ICONS.breed, c.planTarget, breed); go.classList.add('btn-secondary'); go.disabled = targetReached(state)
    const actions = document.createElement('div'); actions.className = 'collection-target-actions'
    actions.append(go, clear); fields.append(actions)
  } else intro.append(label(c.targetEmpty, 'collection-hint'))
  box.append(fields)
  return box
}

export function breedingPlan(state: GameState, locale: Locale, selected: Fish[], change: Change, openBook: Change): HTMLElement {
  const c = collectionCopy(locale), box = document.createElement('div'); box.className = 'breeding-plan'
  const controls = document.createElement('div'); controls.className = 'breeding-controls'
  const summary = document.createElement('div'); summary.className = 'breeding-summary'
  const [field, select] = selectField(c.goalLabel, 'breeding-goal')
  for (const goal of ['species', 'variant', 'tier', 'target'] as BreedGoal[]) option(select, goal, c.goals[goal])
  select.value = state.breedGoal ?? 'species'
  select.addEventListener('change', () => { state.breedGoal = select.value as BreedGoal; change() })
  controls.append(field)
  if (state.collectionTarget) {
    const target = state.collectionTarget
    const text = `${speciesName(target.speciesId, locale)}${target.grade ? ` · ${c.grade(target.grade)}` : ''}`
    const link = makeButton(`${targetReached(state) ? '✓' : '◎'} ${text}`, openBook); link.className = 'target-link'
    controls.append(link)
  }
  if (selected.length === 2) {
    const forecast = forecastBreed(state, selected[0]!, selected[1]!)
    const row = document.createElement('div'); row.className = 'discovery-chances'; row.setAttribute('aria-label', c.forecastTitle)
    const metric = (text: string, chance: number): void => {
      const item = document.createElement('span'), value = document.createElement('b')
      value.textContent = `${(chance * 100).toFixed(1)}%`; item.append(label(text, ''), value); row.append(item)
    }
    metric(c.newSpecies, forecast.newSpeciesChance); metric(c.newVariant, forecast.newVariantChance)
    if (state.collectionTarget) metric(c.targetChance, forecast.targetChance)
    summary.append(row, label(c.forecastNote, 'collection-hint'))
    if (state.breedGoal === 'target' && state.collectionTarget) summary.append(label(targetReached(state) ? c.targetDone : forecast.targetChance === 0 ? c.unreachable : '', 'collection-hint'))
  } else summary.append(label(c.choosePair, 'collection-hint'))
  if (state.breedGoal === 'target' && !state.collectionTarget) controls.append(makeButton(c.noTarget, openBook))
  box.append(controls, summary)
  return box
}

export function fishCare(state: GameState, fish: Fish, locale: Locale, change: Change): HTMLElement {
  const c = collectionCopy(locale), box = document.createElement('div'); box.className = 'fish-care'
  const form = document.createElement('form'); form.className = 'fish-name-form'
  const input = document.createElement('input'); input.type = 'text'; input.id = 'fish-nickname'; input.value = fish.nickname ?? ''; input.maxLength = 48; input.placeholder = speciesName(fish.speciesId, locale)
  const nameLabel = document.createElement('label'); nameLabel.htmlFor = input.id; nameLabel.textContent = c.nickname
  input.setAttribute('aria-describedby', 'fish-nickname-hint')
  const hint = label(c.nicknameHint, 'collection-hint'); hint.id = 'fish-nickname-hint'
  const save = makeButton(c.saveName, () => undefined); save.type = 'submit'
  form.append(nameLabel, input, save, hint)
  form.addEventListener('submit', e => { e.preventDefault(); renameFish(state, fish.uid, input.value); change() })
  const row = document.createElement('div'); row.className = 'fish-care-actions'
  const favorite = makeActionButton(fish.favorite ? HEART_SVG.solid : HEART_SVG.outline, fish.favorite ? c.unfavorite : c.favorite, () => { setFishFavorite(state, fish.uid, !fish.favorite); change() })
  favorite.setAttribute('aria-pressed', String(!!fish.favorite)); favorite.dataset.fishFavorite = fish.uid
  const lock = makeActionButton(fish.locked ? ACTION_ICONS.lock : ACTION_ICONS.unlock, fish.locked ? c.unlock : c.lock, () => { setFishLocked(state, fish.uid, !fish.locked); change() })
  lock.setAttribute('aria-pressed', String(!!fish.locked)); lock.dataset.fishLock = fish.uid
  row.append(favorite, lock); box.append(form, row, label(c.lockNote, 'collection-hint'))
  return box
}

export function saveTools(state: GameState, locale: Locale, restore: (next: GameState) => Promise<boolean>): HTMLElement {
  const c = collectionCopy(locale), box = document.createElement('div'); box.className = 'settings-card save-tools'
  box.append(heading(c.saveTitle, 'h3'), note(c.saveNote))
  const row = document.createElement('div'); row.className = 'row'
  const status = document.createElement('p'); status.className = 'save-status'; status.setAttribute('role', 'status')
  const preview = document.createElement('div'); preview.className = 'save-preview'; preview.hidden = true
  let busy = false, selection = 0
  const show = (incoming: ReturnType<typeof parseSaveImport>): void => {
    preview.replaceChildren(); preview.hidden = false
    preview.append(heading(c.previewTitle, 'h3'))
    const compare = document.createElement('dl'); compare.className = 'save-comparison'
    for (const [title, value] of [[c.current, state], [c.incoming, incoming.state]] as const) {
      const dt = document.createElement('dt'); dt.textContent = title
      const dd = document.createElement('dd'); dd.textContent = `Lv.${value.level} · ${value.fish.length} ${c.fish} · ${value.discovered.length} ${c.species}`
      compare.append(dt, dd)
    }
    preview.append(compare, label(incoming.exportedAt ? `${c.exportedAt}: ${new Date(incoming.exportedAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}` : c.legacy, 'collection-hint'), note(c.replaceNote))
    const actions = document.createElement('div'); actions.className = 'row'
    const confirm = makeButton(c.confirmImport, async () => {
      if (busy) return
      busy = true; confirm.disabled = true; cancel.disabled = true; file.disabled = true; backup.disabled = true; beforeImport.disabled = true; confirm.textContent = c.importing
      try {
        const ok = await restore(incoming.state)
        if (!ok) status.textContent = c.storageError
      } catch { status.textContent = c.importInvalid }
      finally { busy = false; confirm.disabled = false; cancel.disabled = false; file.disabled = false; backup.disabled = false; beforeImport.disabled = false; confirm.textContent = c.confirmImport }
    }); confirm.className = 'danger-confirm'; confirm.dataset.confirmImport = '1'
    const cancel = makeButton(c.cancel, () => { selection++; preview.hidden = true; preview.replaceChildren(); status.textContent = '' })
    actions.append(confirm, cancel); preview.append(actions)
    // File selection is asynchronous; bring its preview into the panel's reading area.
    preview.tabIndex = -1
    preview.setAttribute('role', 'region')
    preview.setAttribute('aria-label', c.previewTitle)
    const panel = box.closest<HTMLElement>('section.panel')
    if (panel) scrollPanelTo(panel, preview)
    preview.focus({ preventScroll: true })
  }
  const download = makeButton(c.export, () => {
    try {
      const url = URL.createObjectURL(new Blob([exportSave(state)], { type: 'application/json' })), a = document.createElement('a')
      a.href = url; a.download = `fishtank-${new Date().toISOString().slice(0, 10)}.json`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); status.textContent = c.exportDone
    } catch { status.textContent = c.storageError }
  })
  const file = document.createElement('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true; file.id = 'save-import-file'
  const upload = makeButton(c.import, () => { if (!busy) file.click() }); upload.dataset.importSave = '1'
  file.addEventListener('change', async () => {
    const chosen = file.files?.[0]; file.value = ''; if (!chosen || busy) return
    const token = ++selection; status.textContent = ''; preview.hidden = true
    try {
      if (chosen.size > 5 * 1024 * 1024) throw new Error('large')
      const incoming = parseSaveImport(await chosen.text())
      if (token === selection && box.isConnected) show(incoming)
    } catch { if (token === selection) status.textContent = c.importInvalid }
  })
  const backup = makeButton(c.restoreBackup, () => {
    if (busy) return
    selection++; const recent = getSaveBackup(); status.textContent = ''
    if (recent) show(recent); else { preview.hidden = true; status.textContent = c.noBackup }
  }); backup.dataset.restoreBackup = '1'
  const beforeImport = makeButton(c.restoreBeforeImport, () => {
    if (busy) return
    selection++; const prior = getSaveBackup(Date.now(), 'pre-restore'); status.textContent = ''
    if (prior) show(prior); else { preview.hidden = true; status.textContent = c.noBackup }
  }); beforeImport.dataset.restoreBeforeImport = '1'
  row.append(download, upload, backup, beforeImport, file); box.append(row, label(c.backupNote, 'collection-hint'), preview, status)
  return box
}
