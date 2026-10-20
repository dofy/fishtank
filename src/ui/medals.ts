import type { MilestoneId } from '../core/types'

// One family of struck medals, with a different relief and LCD glyph for every award.
const relief: Record<MilestoneId, string> = {
  'first-friend': '<path d="M17 33q12-15 25 0-13 15-25 0Zm25 0 7-7v14Z"/><circle cx="35" cy="31" r="1"/>',
  'tier-one': '<path d="M32 48V23m0 12-10-8m10 14 11-12m-11 0 7-8M22 27v-7m21 9 4 1m-15-7-5-5"/>',
  'jelly-family': '<path d="M17 32q15-24 30 0Z M21 33q-5 10 1 16m7-16q6 6 0 17m8-17q-5 8 1 16m6-16 4 11"/>',
  'grade-five': '<path d="m32 17 5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2Z"/>',
  'variant-collector': '<path d="M16 38q16-31 32 0l-16 11Z M22 34l10 15m0-24v24m10-15L32 49"/>',
  'reef-explorer': '<circle cx="32" cy="34" r="15"/><path d="m37 23-2 14-9 8 3-14Zm-5-8v4m0 30v4M13 34h4m30 0h4"/>',
  'reef-rookie': '<path d="M18 41q14-18 28 0-14 13-28 0Zm0 0-5-5v10Z"/><circle cx="22" cy="23" r="3"/><circle cx="37" cy="20" r="2"/><circle cx="43" cy="29" r="2"/>',
  'reef-naturalist': '<path d="M18 27q9-10 18 0-9 10-18 0Zm18 0 5-4v8ZM25 42q10-11 20 0-10 11-20 0Zm0 0-5-4v8Z"/>',
  'rare-encounter': '<path d="M17 40q15 17 30 0M17 40l5-15 10 6 10-6 5 15Z"/><circle cx="32" cy="36" r="5"/>',
  'legend-encounter': '<path d="m16 27 8 8 8-16 8 16 8-8-4 21H20Z M21 42h22"/>',
  'mythic-encounter': '<path d="M32 16v36m-12-31v10q12 14 24 0V21m-27 5 3-7 3 7m18 0 3-7 3 7M27 22l5-6 5 6"/>',
  'eel-family': '<path d="M16 40q8-22 17-9t16-7M16 40q8-8 15 1t18-3m-21-13 6-8-1 8 6-1-8 12 2-10Z"/>',
  'color-palette': '<path d="m18 43 2-16 7 3 5-13 5 13 7-3 2 16-14 7Z M25 32l7 18m7-18-7 18m0-26v26"/>',
  'variant-master': '<path d="M44 43q-25 17-28-8t23-16 7 22-17 1-2-13 12 3-7 6M20 43l-2 7m10-4v6m10-8 3 6"/>',
}
const pixels: Record<MilestoneId, string[]> = {
  'first-friend': ['00111000','01111101','11111111','01111101','00111000','00000000'],
  'tier-one': ['00010000','01010010','01110110','00011100','00110000','01010000','00010000'],
  'jelly-family': ['00111000','01111100','11111110','00000000','10101010','10101010','01010100'],
  'grade-five': ['00010000','00111000','11111110','01111100','00111000','01101100','01000100'],
  'variant-collector': ['00010000','00111000','01111100','11111110','10101010','01010100','00111000'],
  'reef-explorer': ['00111000','01000100','10010110','10111010','11101010','01000100','00111000'],
  'reef-rookie': ['01000100','00000000','00111000','01111101','11111111','01111101','00111000'],
  'reef-naturalist': ['01110100','11111100','01110100','00000000','01011100','01111110','01011100'],
  'rare-encounter': ['01000100','01111100','11010110','10111010','11010110','01111100','00111000'],
  'legend-encounter': ['00010000','10010010','11010110','11111110','01111100','01000100','01111100'],
  'mythic-encounter': ['10010010','11010110','01010100','01111100','00010000','00111000','00010000'],
  'eel-family': ['00011000','00110010','01100010','00111100','01011000','10001100','01111000'],
  'color-palette': ['00010000','01010100','01111100','11111110','10101010','01111100','00111000'],
  'variant-master': ['00111100','01100110','11011010','10101010','10110010','11000110','01111100'],
}
const hues: Record<MilestoneId, string> = {
  'first-friend':'#24a8a0', 'tier-one':'#e58a65', 'jelly-family':'#8281d7', 'grade-five':'#ce8d32',
  'variant-collector':'#b665aa','reef-explorer':'#387bb4','reef-rookie':'#5b9f80','reef-naturalist':'#388e9a',
  'rare-encounter':'#5f8cbd','legend-encounter':'#9d70c6','mythic-encounter':'#d27b36','eel-family':'#b69d35',
  'color-palette':'#c56d92','variant-master':'#6d86b8',
}

export function medalArt(id: MilestoneId): HTMLElement {
  const art=document.createElement('span');art.className='medal-art';art.setAttribute('aria-hidden','true')
  art.style.setProperty('--medal-ribbon',hues[id])
  const dots=pixels[id].flatMap((row,y)=>[...row].flatMap((p,x)=>p==='1'?[`<rect x="${4+x}" y="${6+y}" width="1" height="1"/>`]:[])).join('')
  art.innerHTML=`<svg class="medal-vector" viewBox="0 0 64 78" fill="none"><path d="m19 42-5 31 14-9 5 9 1-29m0 0 2 29 9-9 12 9-9-31" fill="var(--medal-ribbon)"/><circle cx="32" cy="34" r="26" fill="var(--medal-metal)" stroke="var(--medal-edge)" stroke-width="2"/><circle cx="32" cy="34" r="21" stroke="var(--medal-edge)" stroke-width="1"/><g stroke="var(--medal-ink)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${relief[id]}</g><path d="M15 20q8-11 18-10" stroke="var(--medal-shine)" stroke-width="2"/></svg><svg class="medal-pixel" viewBox="0 0 16 20" shape-rendering="crispEdges" fill="currentColor"><path d="M4 1h8v1h2v2h1v10h-2v1H3v-1H1V4h1V2h2ZM4 3H3v10h10V3Z" fill-rule="evenodd"/>${dots}<path d="M4 15h3v4H6v-1H4Zm5 0h3v3h-2v1H9Z"/></svg>`
  return art
}
