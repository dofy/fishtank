import type { ColorMode } from '../core/types'

export type Tab = 'tank' | 'breed' | 'merge' | 'decor' | 'book' | 'settings'

export const TAB_IDS: readonly Tab[] = ['tank', 'breed', 'merge', 'decor', 'book', 'settings']

export const CHANGELOG_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4.5V1.8m0 2.7h2.7M2.2 4a5.5 5.5 0 1 1-.1 7"/><path d="M8 4.5V8l2.3 1.5"/></svg>'

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

export const BG_SCENERY_LEFT_SVG = `<svg viewBox="0 0 220 800" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMax slice">
  <!-- Top caustic light rays -->
  <path class="bg-ray" d="M0 0L165 0L95 360L0 290Z" fill="currentColor" opacity="0.045"/>
  <path class="bg-ray" d="M35 0L210 0L150 280L20 210Z" fill="currentColor" opacity="0.03"/>
  <!-- Ambient water rings & bubbles -->
  <g class="bg-float-slow">
    <circle cx="82" cy="180" r="26" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 6" opacity="0.16"/>
    <circle cx="82" cy="180" r="6" fill="currentColor" opacity="0.12"/>
    <circle cx="136" cy="295" r="5" stroke="currentColor" stroke-width="1.5" opacity="0.22"/>
    <circle cx="118" cy="335" r="3" fill="currentColor" opacity="0.18"/>
    <circle cx="144" cy="368" r="3.5" stroke="currentColor" stroke-width="1.2" opacity="0.2"/>
    <circle cx="64" cy="450" r="6.5" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
    <circle cx="78" cy="492" r="3.5" fill="currentColor" opacity="0.16"/>
    <circle cx="55" cy="535" r="4.5" stroke="currentColor" stroke-width="1.3" opacity="0.18"/>
  </g>
  <!-- Distant schooling fish silhouettes -->
  <g class="bg-float-mid" fill="currentColor" opacity="0.16">
    <path d="M112 240c12-9 28-9 38 0l11-7-3 14 3 14-11-7c-10 9-26 9-38 0-5-4-5-10 0-14Z"/>
    <circle cx="122" cy="246" r="1.8" fill="var(--bg)"/>
    <path d="M62 276c9-6 20-6 27 0l8-5-2 10 2 10-8-5c-7 6-18 6-27 0-4-3-4-7 0-10Z" opacity="0.8"/>
  </g>
  <!-- Bottom reef ridge, swaying kelp & coral silhouettes -->
  <g class="bg-sway" fill="currentColor">
    <path d="M0 800V685c38-14 78-6 116 14 34 18 66 48 94 101H0Z" opacity="0.09"/>
    <path d="M26 800c-12-62 16-118 4-178-10-48-24-88-6-138 6 44 26 82 22 134-4 54-24 108 4 182H26Z" opacity="0.18"/>
    <path d="M64 800c-14-48 12-94 2-142-8-38-18-68-2-108 8 34 22 64 18 106-4 42-18 86 4 144H64Z" opacity="0.14"/>
    <path d="M114 800v-42c0-18-16-28-24-44-6-12-2-26 6-24 8 2 12 16 20 26v-36c0-14 10-26 16-24 6 2 4 18 2 32 10-12 20-20 26-16 6 4-4 18-14 30-8 10-14 20-14 36v62h-18Z" opacity="0.15"/>
  </g>
</svg>`

export const BG_SCENERY_RIGHT_SVG = `<svg viewBox="0 0 220 800" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMax slice">
  <!-- Top caustic light rays -->
  <path class="bg-ray" d="M220 0L55 0L125 360L220 290Z" fill="currentColor" opacity="0.045"/>
  <path class="bg-ray" d="M185 0L10 0L70 280L200 210Z" fill="currentColor" opacity="0.03"/>
  <!-- Drifting moon jellyfish & bubbles -->
  <g class="bg-float-mid" stroke="currentColor" fill="currentColor">
    <path d="M116 196c0-18 15-30 33-30s33 12 33 30c-11-4-22-4-33 0-11-4-22-4-33 0Z" fill="currentColor" stroke="none" opacity="0.15"/>
    <path d="M132 198c-3 18 4 34-2 50M148 199c0 20-5 36 2 54M164 198c4 18-3 34 3 48" fill="none" stroke-width="1.8" stroke-linecap="round" opacity="0.15"/>
  </g>
  <g class="bg-float-slow">
    <circle cx="92" cy="285" r="4.5" stroke="currentColor" stroke-width="1.4" opacity="0.2"/>
    <circle cx="108" cy="322" r="2.8" fill="currentColor" opacity="0.16"/>
    <circle cx="152" cy="400" r="22" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 6" opacity="0.15"/>
    <circle cx="84" cy="465" r="5.5" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
    <circle cx="102" cy="505" r="3.2" fill="currentColor" opacity="0.17"/>
    <circle cx="136" cy="548" r="4.5" stroke="currentColor" stroke-width="1.3" opacity="0.18"/>
  </g>
  <!-- Distant fish silhouette -->
  <g class="bg-float-slow" fill="currentColor" opacity="0.15">
    <path d="M126 352c-10-7-23-7-31 0l-9-6 2 11-2 11 9-6c8 7 21 7 31 0 4-3 4-7 0-10Z"/>
    <circle cx="118" cy="357" r="1.6" fill="var(--bg)"/>
  </g>
  <!-- Bottom reef ridge, crystal spires & sea fan silhouettes -->
  <g class="bg-sway" fill="currentColor">
    <path d="M220 800V690c-40-14-82-4-122 18-34 18-64 46-90 92h212Z" opacity="0.09"/>
    <path d="M174 800l-18-118 22-38 16 42-6 114h-14Zm-28 0l-22-82 12-28 18 24 8 86h-16Zm52 0l8-74 14-20 8 26-14 68h-16Z" opacity="0.15"/>
    <path d="M88 800c10-46-10-88 0-132 6-34 16-62 2-98-8 30-20 58-16 96 4 38 16 78-4 134h18Z" opacity="0.14"/>
  </g>
</svg>`

