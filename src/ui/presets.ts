import { deleteTankPreset, MAX_PRESET_NAME, MAX_TANK_PRESETS, renameTankPreset, resolveTankPreset, saveTankPreset, tankPresetStatus } from '../core/presets'
import type { PresetApplyResult } from '../core/presets'
import type { ColorMode, GameState, Locale } from '../core/types'
import { heading, label, makeActionButton, makeButton, makeStatusIcon, setIconLabel } from './dom'
import { ACTION_ICONS, CLOSE_ICON, MODE_ICONS } from './icons'

export function presetCopy(locale: Locale) {
  return locale === 'zh' ? {
    title: '我的布景', hint: '保存展示鱼、造景位置与昼夜灯光，最多 6 套。',
    name: '布景名称', placeholder: '比如：水母夜景', save: '保存当前布景',
    empty: '先布置喜欢的鱼缸，再把这一刻存下来。', apply: '应用', update: '更新', rename: '改名', remove: '删除',
    current: '当前', modified: '已修改', savedState: '已保存', custom: '自定义布景', restore: '恢复',
    confirmUpdate: '确认覆盖', confirmRemove: '确认删除', cancel: '取消', confirmName: '保存名称',
    updateHint: '用当前鱼缸覆盖这套布景？', removeHint: '只删除这套预设，小鱼和造景会保留。',
    saved: '这套布景已保存。', updated: '已用当前鱼缸更新布景。', renamed: '布景名称已更新。', removed: '已删除这套预设。',
    invalidName: '先给布景起个名字吧。', limit: '已存满 6 套，可以更新或删除已有布景。',
    missing: '这套布景已不存在。', storage: '浏览器没能保存，原来的布景已保留，请稍后再试。',
    nameHint: '最多 24 个字', available: (fish: number, decor: number) => `${fish} 条鱼 · ${decor} 件造景`,
    skipped: (fish: number, decor: number) => `可用 ${fish} 条鱼、${decor} 件造景`,
    applied: (fish: number, decor: number) => `已换好布景。${fish || decor ? `跳过 ${fish} 条已不在背包或超出容量的鱼、${decor} 件暂不可用的造景。` : ''}`,
    mode: { auto: '自动', light: '日间', dark: '黑夜' } as Record<ColorMode, string>,
    help: '在「装饰」保存最多 6 套布景，切换展示鱼、造景位置和昼夜灯光。当前布景会显示标记，修改后可更新保存或恢复。更新前会确认覆盖；不再持有的小鱼会自动跳过，不会重新生成，也不影响鱼群成长。',
  } : {
    title: 'My layouts', hint: 'Save displayed fish, decoration positions and lighting. Up to 6 layouts.',
    name: 'Layout name', placeholder: 'For example: Jellyfish at night', save: 'Save current layout',
    empty: 'Arrange your aquarium, then save a layout you like.', apply: 'Apply', update: 'Update', rename: 'Rename', remove: 'Delete',
    current: 'Current', modified: 'Modified', savedState: 'Saved', custom: 'Custom layout', restore: 'Restore',
    confirmUpdate: 'Confirm overwrite', confirmRemove: 'Confirm delete', cancel: 'Cancel', confirmName: 'Save name',
    updateHint: 'Replace this layout with your current aquarium?', removeHint: 'Delete this preset? Your fish and decorations stay.',
    saved: 'Layout saved.', updated: 'Layout updated with your current aquarium.', renamed: 'Layout renamed.', removed: 'Preset deleted.',
    invalidName: 'Give your layout a name first.', limit: 'All 6 slots are in use. Update or delete an existing layout.',
    missing: 'This layout no longer exists.', storage: 'The browser could not save. Your previous layouts are unchanged. Try again later.',
    nameHint: 'Up to 24 characters', available: (fish: number, decor: number) => `${fish} fish · ${decor} decorations`,
    skipped: (fish: number, decor: number) => `${fish} fish and ${decor} decorations available`,
    applied: (fish: number, decor: number) => `Layout applied.${fish || decor ? ` Skipped ${fish} missing or over-capacity fish and ${decor} unavailable decorations.` : ''}`,
    mode: { auto: 'Auto', light: 'Day', dark: 'Night' } as Record<ColorMode, string>,
    help: 'Save up to 6 layouts in Decor, including displayed fish, decoration positions and lighting. The current layout is marked; update or restore it after editing. Updates ask before overwriting. Fish you no longer own are skipped, never recreated; growth continues normally.',
  }
}

interface PresetHooks {
  save(): boolean
  apply(id: string): PresetApplyResult
  notice(text: string, kind?: 'good' | 'bad'): void
}

/** Patch status in place so dragging and timer updates never interrupt editing or confirmation. */
export function refreshPresetStatus(box: HTMLElement, state: GameState, locale: Locale): void {
  const c = presetCopy(locale), status = tankPresetStatus(state)
  const summary = box.querySelector<HTMLElement>('.preset-state')
  const text = status ? status.modified ? c.modified : c.savedState : c.custom
  if (summary) setIconLabel(summary, status ? status.modified ? ACTION_ICONS.modified : ACTION_ICONS.update : ACTION_ICONS.custom, text)
  if (summary) summary.dataset.modified = String(!!status?.modified)
  for (const entry of box.querySelectorAll<HTMLElement>('[data-preset-id]')) {
    const current = status?.preset.id === entry.dataset.presetId
    entry.classList.toggle('is-current', current)
    if (current) entry.setAttribute('aria-current', 'true')
    else entry.removeAttribute('aria-current')
    const badge = entry.querySelector<HTMLElement>('.preset-current')
    if (badge) badge.hidden = !current
    const apply = entry.querySelector<HTMLButtonElement>('[data-preset-apply]')
    if (apply) {
      const action = current ? status?.modified ? c.restore : c.current : c.apply
      setIconLabel(apply, current ? status?.modified ? ACTION_ICONS.restore : ACTION_ICONS.current : ACTION_ICONS.apply, `${action}: ${entry.dataset.presetName}`)
      apply.disabled = !!current && !status?.modified
    }
    const update = entry.querySelector<HTMLButtonElement>('[data-preset-update]')
    if (update) {
      update.disabled = !!current && !status?.modified
      update.classList.toggle('btn-secondary', !!current && !!status?.modified)
    }
  }
}

export function presetTools(state: GameState, locale: Locale, hooks: PresetHooks): HTMLElement {
  const c = presetCopy(locale)
  const box = document.createElement('section'); box.className = 'tank-presets'; box.setAttribute('aria-label', c.title)
  const header = document.createElement('div'); header.className = 'preset-header'
  const intro = document.createElement('div'); intro.className = 'preset-intro'
  const titleRow = document.createElement('div'); titleRow.className = 'preset-title-row'
  const title = heading('', 'h3')
  const status = makeStatusIcon(ACTION_ICONS.custom, c.custom); status.classList.add('preset-state'); status.setAttribute('role', 'status')
  titleRow.append(title, status)
  const form = document.createElement('form'); form.className = 'preset-save-form'
  const name = document.createElement('input'); name.id = 'tank-preset-name'; name.type = 'text'; name.maxLength = MAX_PRESET_NAME * 2
  name.placeholder = c.placeholder; name.setAttribute('aria-describedby', 'tank-preset-hint')
  const nameLabel = document.createElement('label'); nameLabel.htmlFor = name.id; nameLabel.textContent = c.name
  const save = makeButton(c.save, () => undefined); save.type = 'submit'; save.className = 'btn-secondary'; save.dataset.presetSave = '1'
  const hint = label(c.hint, 'collection-hint'); hint.id = 'tank-preset-hint'
  const list = document.createElement('ul'); list.className = 'preset-list'
  form.append(nameLabel, name, save)
  intro.append(titleRow, hint); header.append(intro, form); box.append(header, list)

  const persist = (mutate: () => boolean, message: string): boolean => {
    const previous = state.tankPresets
    const previousActive = state.activeTankPresetId
    if (!mutate()) return false
    if (!hooks.save()) {
      if (previous === undefined) delete state.tankPresets
      else state.tankPresets = previous
      if (previousActive === undefined) delete state.activeTankPresetId
      else state.activeTankPresetId = previousActive
      hooks.notice(c.storage, 'bad')
      return false
    }
    hooks.notice(message, 'good')
    return true
  }
  const render = (): void => {
    const presets = state.tankPresets ?? []
    title.textContent = `${c.title} ${presets.length}/${MAX_TANK_PRESETS}`
    save.disabled = presets.length >= MAX_TANK_PRESETS
    list.replaceChildren()
    if (!presets.length) { const empty = document.createElement('li'); empty.className = 'collection-hint'; empty.textContent = c.empty; list.append(empty) }
    for (const preset of presets) {
      const entry = document.createElement('li'); entry.className = 'preset-entry'; entry.dataset.presetId = preset.id
      entry.dataset.presetName = preset.name
      const info = document.createElement('div'); info.className = 'preset-info'
      const nameText = document.createElement('strong'); nameText.textContent = preset.name; nameText.title = preset.name
      const counts = label(c.available(preset.tankUids.length, preset.placedDecor.length), 'collection-hint preset-counts')
      counts.append(makeStatusIcon(MODE_ICONS[preset.colorMode], c.mode[preset.colorMode]))
      const nameRow = document.createElement('div'); nameRow.className = 'preset-name-row'
      const current = makeStatusIcon(ACTION_ICONS.current, `${c.current}: ${preset.name}`); current.classList.add('preset-current'); current.hidden = true
      nameRow.append(nameText, current); info.append(nameRow, counts)
      const preview = resolveTankPreset(state, preset)
      if (preview.missingFish || preview.skippedDecor) info.append(label(c.skipped(preview.layout.tankUids.length, preview.layout.placedDecor.length), 'collection-hint'))
      const actions = document.createElement('div'); actions.className = 'preset-actions'
      const apply = makeActionButton(ACTION_ICONS.apply, `${c.apply}: ${preset.name}`, () => {
        const result = hooks.apply(preset.id)
        if ('error' in result) hooks.notice(result.error === 'storage' ? c.storage : c.missing, 'bad')
        else {
          hooks.notice(c.applied(result.missingFish, result.skippedDecor), 'good')
          document.querySelector<HTMLButtonElement>(`[data-preset-apply="${CSS.escape(preset.id)}"]:not(:disabled), [data-preset-rename="${CSS.escape(preset.id)}"]`)?.focus({ preventScroll: true })
        }
      }); apply.classList.add('btn-secondary'); apply.dataset.presetApply = preset.id
      const confirm = (kind: 'update' | 'remove'): void => {
        render()
        const target = [...list.children].find(el => (el as HTMLElement).dataset.presetId === preset.id)!
        const row = target.querySelector<HTMLElement>('.preset-actions')!
        const text = label(kind === 'update' ? c.updateHint : c.removeHint, 'collection-hint'); text.classList.add('preset-confirm-text')
        const yes = makeButton(kind === 'update' ? c.confirmUpdate : c.confirmRemove, () => {
          const ok = persist(() => kind === 'remove' ? deleteTankPreset(state, preset.id)
            : !('error' in saveTankPreset(state, preset.name, preset.id)), kind === 'remove' ? c.removed : c.updated)
          if (ok) {
            render()
            if (kind === 'remove') name.focus()
            else list.querySelector<HTMLButtonElement>(`[data-preset-update="${CSS.escape(preset.id)}"]:not(:disabled), [data-preset-rename="${CSS.escape(preset.id)}"]`)?.focus()
          }
        }); yes.dataset.presetConfirm = kind
        const cancel = makeActionButton(CLOSE_ICON, c.cancel, () => { render(); list.querySelector<HTMLButtonElement>(kind === 'update' ? `[data-preset-update="${CSS.escape(preset.id)}"]` : `[data-preset-remove="${CSS.escape(preset.id)}"]`)?.focus() })
        cancel.dataset.presetCancel = '1'
        // Keep the original actions' footprint: narrower confirmation copy must not
        // widen the info column, change its line wrapping, or move the buttons.
        const footprint = document.createElement('span'); footprint.className = 'preset-action-footprint'
        footprint.inert = true; footprint.setAttribute('aria-hidden', 'true')
        footprint.append(...row.childNodes)
        const confirmation = document.createElement('div'); confirmation.className = 'preset-confirm-actions'
        confirmation.append(yes, cancel)
        row.replaceChildren(footprint, confirmation); target.append(text); yes.focus()
      }
      const update = makeActionButton(ACTION_ICONS.update, `${c.update}: ${preset.name}`, () => confirm('update')); update.dataset.presetUpdate = preset.id
      const remove = makeActionButton(ACTION_ICONS.remove, `${c.remove}: ${preset.name}`, () => confirm('remove')); remove.dataset.presetRemove = preset.id
      const rename = makeActionButton(ACTION_ICONS.rename, `${c.rename}: ${preset.name}`, () => {
        render()
        const target = [...list.children].find(el => (el as HTMLElement).dataset.presetId === preset.id)!
        const edit = document.createElement('form'); edit.className = 'preset-rename-form'
        const input = document.createElement('input'); input.type = 'text'; input.value = preset.name; input.maxLength = MAX_PRESET_NAME * 2
        input.setAttribute('aria-label', c.name); input.title = c.nameHint
        const yes = makeButton(c.confirmName, () => undefined); yes.type = 'submit'
        const cancel = makeButton(c.cancel, () => { render(); list.querySelector<HTMLButtonElement>(`[data-preset-rename="${CSS.escape(preset.id)}"]`)?.focus() })
        cancel.dataset.presetCancel = '1'
        edit.append(input, yes, cancel)
        edit.addEventListener('submit', event => {
          event.preventDefault()
          if (!input.value.trim()) { hooks.notice(c.invalidName, 'bad'); input.focus(); return }
          if (persist(() => {
            const changed = renameTankPreset(state, preset.id, input.value)
            if (!changed) hooks.notice(c.invalidName, 'bad')
            return changed
          }, c.renamed)) { render(); list.querySelector<HTMLButtonElement>(`[data-preset-rename="${CSS.escape(preset.id)}"]`)?.focus() }
        })
        target.replaceChildren(edit); input.focus(); input.select()
      }); rename.dataset.presetRename = preset.id
      actions.append(apply, update, rename, remove)
      entry.append(info, actions); list.append(entry)
    }
    refreshPresetStatus(box, state, locale)
  }
  form.addEventListener('submit', event => {
    event.preventDefault()
    const ok = persist(() => {
      const result = saveTankPreset(state, name.value)
      if ('error' in result) { hooks.notice(result.error === 'name' ? c.invalidName : result.error === 'limit' ? c.limit : c.missing, 'bad'); return false }
      return true
    }, c.saved)
    if (ok) { name.value = ''; render() }
    name.focus()
  })
  box.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return
    const cancel = box.querySelector<HTMLButtonElement>('[data-preset-cancel]')
    if (cancel) { event.preventDefault(); event.stopPropagation(); cancel.click() }
  })
  render()
  return box
}
