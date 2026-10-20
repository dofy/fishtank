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

// Match the existing 16px, theme-colored UI icon family; no bitmap or emoji assets.
const actionSvg = (paths: string): string => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
export const ACTION_ICONS = {
  apply: actionSvg('<path d="m5 3 7 5-7 5V3Z"/>'),
  current: actionSvg('<circle cx="8" cy="8" r="5.5"/><path d="m5.3 8 1.8 1.8 3.6-3.6"/>'),
  update: actionSvg('<path d="M3 2.5h8l2 2V13.5H3v-11Z"/><path d="M5 2.5v4h5v-4M5.5 13.5v-4h5v4"/>'),
  rename: actionSvg('<path d="m3 10 7.5-7.5 3 3L6 13l-4 1 1-4ZM9 4l3 3"/>'),
  remove: actionSvg('<path d="M2.5 4.5h11M6 4.5V2.5h4v2M4 4.5l.7 9h6.6l.7-9M6.5 7v4M9.5 7v4"/>'),
  restore: actionSvg('<path d="M5 3 2 6l3 3M2 6h7a4 4 0 0 1 0 8H7"/>'),
  target: actionSvg('<circle cx="8" cy="8" r="4.5"/><circle cx="8" cy="8" r="1.2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2"/>'),
  modified: actionSvg('<path d="M8 2.5 14 13H2L8 2.5Z"/><path d="M8 6v3M8 11h.01"/>'),
  custom: actionSvg('<path d="m8 2 6 3-6 3-6-3 6-3ZM2 8l6 3 6-3M2 11l6 3 6-3"/>'),
  lock: actionSvg('<rect x="3.5" y="7" width="9" height="7" rx="1"/><path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7M8 10v1.5"/>'),
  unlock: actionSvg('<rect x="3.5" y="7" width="9" height="7" rx="1"/><path d="M5.5 7V4.5a2.5 2.5 0 0 1 4.8-1M8 10v1.5"/>'),
  pin: actionSvg('<path d="m6 2 7 7M8 2l5 5-3 1-2 3-3-3 3-2V2ZM5 11l-3 3"/>'),
  unpin: actionSvg('<path d="m6 2 7 7M8 2l5 5-3 1M5 8l3 3M5 11l-3 3M2 2l12 12"/>'),
  manage: actionSvg('<path d="M3 4h10M3 8h10M3 12h10"/><path d="M6 2.5v3M10 6.5v3M6 10.5v3"/>'),
  flip: actionSvg('<path d="M8 2v12M2 12l3-8v8H2ZM14 12l-3-8v8h3Z"/>'),
}

export const CLOCK_ICON =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>'

function sceneryBubbles(points: [number, number, number, boolean][]): string {
  return points.map(([x, y, size, solid]) =>
    `<svg x="${x}%" y="${y}%" width="${size}" height="${size}" viewBox="0 0 16 16" class="bg-float-slow">
      <circle cx="8" cy="8" r="5" fill="${solid ? 'currentColor' : 'none'}" stroke="${solid ? 'none' : 'currentColor'}" stroke-width="1.3" opacity="0.18"/>
    </svg>`,
  ).join('')
}

// Percentage-based layers cover each gutter; individual creatures keep their aspect ratio.
export const BG_SCENERY_LEFT_SVG = `<svg fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Top caustic light rays -->
  <svg width="100%" height="66%" viewBox="0 0 220 360" preserveAspectRatio="none">
  <path class="bg-ray" d="M0 0L165 0L95 360L0 290Z" fill="currentColor" opacity="0.045"/>
  <path class="bg-ray" d="M35 0L210 0L150 280L20 210Z" fill="currentColor" opacity="0.03"/>
  </svg>
  <!-- Ambient water rings & bubbles -->
  <svg x="20%" y="20%" width="12%" height="6%" class="bg-water-ring" viewBox="0 0 60 60">
  <g class="bg-float-slow">
    <circle cx="30" cy="30" r="26" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 6" opacity="0.16"/>
    <circle cx="30" cy="30" r="6" fill="currentColor" opacity="0.12"/>
  </g>
  </svg>
  ${sceneryBubbles([[69, 38, 16, false], [46, 44, 11, true], [73, 52, 12, false], [25, 59, 20, false], [58, 66, 12, true], [18, 73, 14, false]])}
  <!-- Distant schooling fish silhouettes -->
  <svg x="54%" y="30%" width="26%" height="7%" class="bg-fish" viewBox="104 226 62 40">
  <g class="bg-float-mid" fill="currentColor" opacity="0.16">
    <path d="M112 240c12-9 28-9 38 0l11-7-3 14 3 14-11-7c-10 9-26 9-38 0-5-4-5-10 0-14Z"/>
    <circle cx="122" cy="246" r="1.8" fill="var(--bg)"/>
  </g>
  </svg>
  <svg x="32%" y="37%" width="20%" height="5%" class="bg-fish-small" viewBox="56 265 45 30">
  <g class="bg-float-mid" fill="currentColor" opacity="0.13">
    <path d="M62 276c9-6 20-6 27 0l8-5-2 10 2 10-8-5c-7 6-18 6-27 0-4-3-4-7 0-10Z" opacity="0.8"/>
  </g>
  </svg>
  <!-- Bottom reef ridge, swaying kelp & coral silhouettes -->
  <svg y="80%" width="100%" height="20%" viewBox="0 640 220 160" preserveAspectRatio="none">
    <path d="M0 800V685c38-14 78-6 116 14 34 18 66 48 94 101H0Z" fill="currentColor" opacity="0.09"/>
  </svg>
  <svg y="48%" width="58%" height="52%" viewBox="0 480 85 320" preserveAspectRatio="xMidYMax meet">
  <g class="bg-sway" fill="currentColor">
    <path d="M26 800c-12-62 16-118 4-178-10-48-24-88-6-138 6 44 26 82 22 134-4 54-24 108 4 182H26Z" opacity="0.18"/>
    <path d="M64 800c-14-48 12-94 2-142-8-38-18-68-2-108 8 34 22 64 18 106-4 42-18 86 4 144H64Z" opacity="0.14"/>
  </g>
  </svg>
  <svg x="50%" y="70%" width="42%" height="30%" viewBox="85 650 80 150" preserveAspectRatio="xMidYMax meet">
  <g class="bg-sway" fill="currentColor">
    <path d="M114 800v-42c0-18-16-28-24-44-6-12-2-26 6-24 8 2 12 16 20 26v-36c0-14 10-26 16-24 6 2 4 18 2 32 10-12 20-20 26-16 6 4-4 18-14 30-8 10-14 20-14 36v62h-18Z" opacity="0.15"/>
  </g>
  </svg>
</svg>`

export const BG_SCENERY_RIGHT_SVG = `<svg fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Top caustic light rays -->
  <svg width="100%" height="66%" viewBox="0 0 220 360" preserveAspectRatio="none">
  <path class="bg-ray" d="M220 0L55 0L125 360L220 290Z" fill="currentColor" opacity="0.045"/>
  <path class="bg-ray" d="M185 0L10 0L70 280L200 210Z" fill="currentColor" opacity="0.03"/>
  </svg>
  <!-- Drifting moon jellyfish & bubbles -->
  <svg x="55%" y="22%" width="28%" height="10%" class="bg-jellyfish" viewBox="110 160 80 100">
  <g class="bg-float-mid" stroke="currentColor" fill="currentColor">
    <path d="M116 196c0-18 15-30 33-30s33 12 33 30c-11-4-22-4-33 0-11-4-22-4-33 0Z" fill="currentColor" stroke="none" opacity="0.15"/>
    <path d="M132 198c-3 18 4 34-2 50M148 199c0 20-5 36 2 54M164 198c4 18-3 34 3 48" fill="none" stroke-width="1.8" stroke-linecap="round" opacity="0.15"/>
  </g>
  </svg>
  <svg x="28%" y="49%" width="12%" height="6%" class="bg-water-ring" viewBox="0 0 60 60">
  <g class="bg-float-slow">
    <circle cx="30" cy="30" r="22" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 6" opacity="0.15"/>
  </g>
  </svg>
  ${sceneryBubbles([[36, 36, 14, false], [65, 42, 10, true], [71, 57, 18, false], [25, 64, 12, true], [55, 72, 14, false]])}
  <!-- Distant fish silhouette -->
  <svg x="24%" y="42%" width="20%" height="5%" class="bg-fish-small" viewBox="82 340 52 36">
  <g class="bg-float-slow" fill="currentColor" opacity="0.15">
    <path d="M126 352c-10-7-23-7-31 0l-9-6 2 11-2 11 9-6c8 7 21 7 31 0 4-3 4-7 0-10Z"/>
    <circle cx="118" cy="357" r="1.6" fill="var(--bg)"/>
  </g>
  </svg>
  <!-- Bottom reef ridge, crystal spires & sea fan silhouettes -->
  <svg y="80%" width="100%" height="20%" viewBox="0 640 220 160" preserveAspectRatio="none">
    <path d="M220 800V690c-40-14-82-4-122 18-34 18-64 46-90 92h212Z" fill="currentColor" opacity="0.09"/>
  </svg>
  <svg x="45%" y="66%" width="55%" height="34%" viewBox="115 630 120 170" preserveAspectRatio="xMidYMax meet">
  <g class="bg-sway" fill="currentColor">
    <path d="M174 800l-18-118 22-38 16 42-6 114h-14Zm-28 0l-22-82 12-28 18 24 8 86h-16Zm52 0l8-74 14-20 8 26-14 68h-16Z" opacity="0.15"/>
  </g>
  </svg>
  <svg x="6%" y="55%" width="45%" height="45%" viewBox="68 560 35 240" preserveAspectRatio="xMidYMax meet">
  <g class="bg-sway" fill="currentColor">
    <path d="M88 800c10-46-10-88 0-132 6-34 16-62 2-98-8 30-20 58-16 96 4 38 16 78-4 134h18Z" opacity="0.14"/>
  </g>
  </svg>
</svg>`

