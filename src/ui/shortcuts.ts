import { TAB_IDS } from './icons'
import type { Tab } from './icons'

export const ACTION_KEYS = {
  immersive: ['f'], mode: ['d'], bgm: ['m'], sfx: ['s'], locale: ['l'],
  help: ['h', '?'], changelog: ['u'], autoPick: ['a'], clear: ['c'],
  run: ['r', 'Enter'], escape: ['Escape'],
} as const

export type ShortcutAction = `tab-${Tab}` | keyof typeof ACTION_KEYS

export const SHORTCUTS: readonly { action: ShortcutAction; keys: readonly string[] }[] = [
  ...TAB_IDS.map((tab, index) => ({ action: `tab-${tab}` as const, keys: [String(index + 1)] })),
  ...Object.entries(ACTION_KEYS).map(([action, keys]) => ({ action: action as keyof typeof ACTION_KEYS, keys })),
]

type KeyInput = Pick<KeyboardEvent,
  'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'repeat' | 'isComposing' | 'defaultPrevented'> & { keyCode?: number }

export function shortcutForKey(event: KeyInput): ShortcutAction | undefined {
  if (event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229 ||
    event.ctrlKey || event.metaKey || event.altKey || (event.shiftKey && event.key !== '?')) return
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
  return SHORTCUTS.find(shortcut => shortcut.keys.includes(key))?.action
}

export function shortcutLabels(action: ShortcutAction): string[] {
  return SHORTCUTS.find(shortcut => shortcut.action === action)!.keys.map(key =>
    key === 'Escape' ? 'Esc' : key.length === 1 ? key.toUpperCase() : key,
  )
}

export function bindShortcut(button: HTMLButtonElement, action: ShortcutAction): void {
  const keys = SHORTCUTS.find(shortcut => shortcut.action === action)!.keys
  button.dataset.shortcut = action
  button.setAttribute('aria-keyshortcuts', keys.join(' '))
  button.title = `${button.title || button.textContent?.trim() || ''} (${shortcutLabels(action).join(' / ')})`
}
