import type { FishSort, Tier } from '../core/types'
import { NOTE_INFO_ICON } from './icons'

export function makeButton(
  text: string,
  onClick: (event: MouseEvent) => void,
): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = text
  b.addEventListener('click', onClick)
  return b
}

const iconLabels = new WeakMap<HTMLElement, { svg: string; text: string }>()

/** Both tooltip and accessible name stay descriptive when the visible label is an icon. */
export function setIconLabel(el: HTMLElement, svgHtml: string, text: string): void {
  const previous = iconLabels.get(el)
  if (previous?.text === text && previous.svg === svgHtml) return
  const icon = document.createElement('span'); icon.className = 'ico'; icon.setAttribute('aria-hidden', 'true')
  icon.innerHTML = svgHtml
  el.replaceChildren(icon); el.title = text; el.setAttribute('aria-label', text)
  iconLabels.set(el, { svg: svgHtml, text })
}

export function makeActionButton(svgHtml: string, text: string, action: (event: MouseEvent) => void): HTMLButtonElement {
  const button = makeButton('', action); button.className = 'icon-action'
  setIconLabel(button, svgHtml, text)
  return button
}

export function makeStatusIcon(svgHtml: string, text: string): HTMLSpanElement {
  const status = document.createElement('span'); status.className = 'icon-status'; status.setAttribute('role', 'img')
  setIconLabel(status, svgHtml, text)
  return status
}

/** Short screens scroll the app; taller screens retain the panel's own scroller. */
export function scrollPanelTo(panel: HTMLElement, target: HTMLElement = panel, behavior: ScrollBehavior = 'auto'): void {
  const app = panel.closest<HTMLElement>('#app')
  const outer = app && getComputedStyle(panel).overflowY === 'visible'
  const scroller = outer ? app : panel
  const nav = outer ? app.querySelector('nav') : null
  const inset = outer ? (nav ? nav.getBoundingClientRect().height + (parseFloat(getComputedStyle(nav).top) || 0) : 0) + 8 : 12
  const top = !outer && target === panel ? 0 : scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - inset
  scroller.scrollTo({ top: Math.max(0, top), behavior })
}

export function makeIconButton(
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

export function checkRow(
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

export function renderSortBar(
  labelText: string,
  currentSort: FishSort,
  options: readonly { id: FishSort; label: string }[],
  onSelect: (id: FishSort) => void,
): HTMLElement {
  const sortBar = document.createElement('div')
  sortBar.className = 'sort-bar'
  const sortLbl = document.createElement('span')
  sortLbl.className = 'sort-label'
  sortLbl.textContent = labelText
  sortBar.append(sortLbl)

  for (const s of options) {
    const b = makeButton(s.label, () => onSelect(s.id))
    b.className = 'sort-btn'
    b.setAttribute('aria-pressed', String(currentSort === s.id))
    sortBar.append(b)
  }
  return sortBar
}

export function stat(svgHtml: string, labelText: string, value: string): HTMLElement {
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

export function bar(fraction: number): HTMLElement {
  const outer = document.createElement('div')
  outer.className = 'bar'
  const inner = document.createElement('span')
  inner.style.width = `${Math.round(fraction * 100)}%`
  outer.append(inner)
  return outer
}

export function heading(text: string, tag: 'h2' | 'h3' = 'h2'): HTMLElement {
  const el = document.createElement(tag)
  el.textContent = text
  return el
}

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

export function note(text: string, title?: string, iconSvg?: string): HTMLElement {
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

export function label(text: string, className: string): HTMLElement {
  const el = document.createElement('div')
  el.className = className
  el.textContent = text
  return el
}

export function th(text: string): HTMLElement {
  const el = document.createElement('th')
  el.textContent = text
  return el
}

export function td(text: string): HTMLElement {
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
