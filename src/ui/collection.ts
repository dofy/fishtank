import { exportSave, getSaveBackup, parseSaveImport } from '../core/save'
import { speciesName } from '../core/i18n'
import type { Fish, GameState, Locale } from '../core/types'
import { heading, label, makeButton, note, scrollPanelTo } from './dom'
import { collectionCopy } from './collection-copy'
import { ACTION_ICONS } from './icons'

export function fishDisplayName(fish: Fish, locale: Locale): string {
  return speciesName(fish.speciesId, locale)
}

export function fishCare(fish: Fish, locale: Locale, actions: HTMLElement, change: (locked: boolean) => void): HTMLElement {
  const c = collectionCopy(locale), box = document.createElement('div'); box.className = 'fish-care'
  const lock = makeButton(fish.locked ? c.unlock : c.lock, () => change(!fish.locked), fish.locked ? ACTION_ICONS.unlock : ACTION_ICONS.lock)
  lock.setAttribute('aria-pressed', String(!!fish.locked)); lock.dataset.fishLock = fish.uid
  lock.className = 'fish-lock-toggle'
  actions.append(lock)
  box.append(actions, label(c.lockNote, 'collection-hint'))
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
