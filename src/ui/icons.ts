import type { ColorMode } from '../core/types'

export type Tab = 'tank' | 'breed' | 'merge' | 'decor' | 'book' | 'settings'

export const TAB_IDS: readonly Tab[] = ['tank', 'breed', 'merge', 'decor', 'book', 'settings']

export const TAB_ICONS: Record<Tab, string> = {
  tank: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8s2.5-4.5 7-4.5c2.2 0 4 1.5 5 2.5l1.5-1.5v7L13.5 10c-1 1-2.8 2.5-5 2.5-4.5 0-7-4.5-7-4.5Z"/><circle cx="5.5" cy="7.5" r="0.8" fill="currentColor"/></svg>',
  breed: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13.8S2 9.8 2 5.6A3.1 3.1 0 0 1 8 4.3a3.1 3.1 0 0 1 6 1.3c0 4.2-6 8.2-6 8.2Z"/></svg>',
  merge: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4m0 4v4M2 8h4m4 0h4M4.2 4.2l2.3 2.3m3 3 2.3 2.3m0-7.6-2.3 2.3m-3 3-2.3 2.3"/></svg>',
  decor: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14V5c0-2 1.8-3 1.8-3M5 14v-4c0-1.5-2-2.5-2-4.5M11 14V9c0-1.5 2-2 2-4M3 14h10"/></svg>',
  book: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3h4.2c1 0 1.3.5 1.3 1.3v9.2c0-.7-.5-1-1.3-1H2.5V3Zm11 0H9.3C8.3 3 8 3.5 8 4.3v9.2c0-.7.5-1 1.3-1h4.2V3Z"/></svg>',
  settings: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v1.6m0 9.2v1.6M1.8 8h1.6m9.2 0h1.6M3.6 3.6l1.1 1.1m6.6 6.6 1.1 1.1m0-8.8-1.1 1.1M4.7 11.3l-1.1 1.1"/></svg>',
}

export const STAT_ICONS = {
  level: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.8 3.7 4.1.6-3 2.9.7 4.1L8 11.4l-3.6 1.9.7-4.1-3-2.9 4.1-.6L8 2Z"/></svg>',
  tank: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 6.5c2 1 4-1 6 0s4-1 6 0"/></svg>',
  bag: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5.5h10l-.8 8H3.8L3 5.5Z"/><path d="M5.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5"/></svg>',
  breed: TAB_ICONS.tank,
  book: TAB_ICONS.book,
}

export const HEART_SVG = {
  solid: '<svg viewBox="0 0 16 16" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M8 13.6S2 9.7 2 5.6A3.1 3.1 0 0 1 8 4.3a3.1 3.1 0 0 1 6 1.3c0 4.1-6 8-6 8Z"/></svg>',
  outline: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M8 13.6S2 9.7 2 5.6A3.1 3.1 0 0 1 8 4.3a3.1 3.1 0 0 1 6 1.3c0 4.1-6 8-6 8Z"/></svg>',
}

export const MODE_ICONS: Record<ColorMode, string> = {
  auto: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5v11A5.5 5.5 0 0 0 8 2.5Z" fill="currentColor"/></svg>',
  light: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v1.8m0 9.4v1.8M1.5 8h1.8m9.4 0h1.8M3.4 3.4l1.3 1.3m6.6 6.6 1.3 1.3m0-9.2-1.3 1.3M4.7 11.3 3.4 12.6"/></svg>',
  dark: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.2 9.8A5.5 5.5 0 0 1 6.2 2.8a5.5 5.5 0 1 0 7 7Z"/></svg>',
}

export const AUDIO_ICONS = {
  on: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h2.5L9 3v10L5.5 10H3V6Z"/><path d="M11.5 5.5a3.5 3.5 0 0 1 0 5M13.2 3.8a6 6 0 0 1 0 8.4"/></svg>',
  off: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h2.5L9 3v10L5.5 10H3V6Z"/><path d="m11 6 4 4m0-4-4 4"/></svg>',
}

export const IMMERSIVE_ICONS = {
  enter: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>',
  exit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5.5 8l4.5 4.5M6 8h7.5"/></svg>',
}

export const HELP_ICON =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M6.3 6.2a1.8 1.8 0 1 1 2.5 1.7c-.6.3-.8.6-.8 1.3"/><circle cx="8" cy="11.5" r="0.6" fill="currentColor"/></svg>'

export const GITHUB_ICON =
  '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8.01 8.01 0 0 0 8 .2Z"/></svg>'

export const NOTE_INFO_ICON =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.2"/><path d="M8 7.2v4M8 4.8h.01"/></svg>'

export const CLOSE_ICON =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>'

export const CLOCK_ICON =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>'
