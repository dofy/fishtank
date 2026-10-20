import { label, makeButton } from './dom'

export interface ItemCardOptions {
  /** Stable across rerenders, including imported fish IDs. */
  key: string
  label: string
  portrait: Node
  meta: Node
  name?: string
  title?: string
  selected?: boolean
  unavailable?: boolean
  density?: 'regular' | 'compact' | 'mini'
  count?: { text: string; title?: string }
  status?: Node[]
  action?: HTMLButtonElement
  order?: number
  overlay?: Node
  marks?: Node[]
  onActivate: () => void
}

function retainFocus(button: HTMLButtonElement, key: string, slot: string): void {
  let focused = false
  button.addEventListener('click', () => {
    focused = document.activeElement === button
  }, { capture: true })
  // Registered after the action listener, so a synchronous rerender has finished.
  button.addEventListener('click', () => {
    if (focused && document.activeElement === document.body) {
      document.querySelector<HTMLButtonElement>(`[data-card-key="${CSS.escape(key)}"] .${slot}`)?.focus({ preventScroll: true })
    }
    focused = false
  })
}

/** One card shell and state contract for inventory, selection, decor and previews. */
export function itemCard(options: ItemCardOptions): HTMLElement {
  const card = document.createElement('article')
  card.className = 'item-card'
  card.dataset.cardKey = options.key
  card.dataset.density = options.density ?? 'regular'
  card.dataset.selected = String(Boolean(options.selected))
  card.dataset.unavailable = String(Boolean(options.unavailable))

  if (options.density !== 'mini' || options.count || options.status?.length || options.action || options.order !== undefined) {
    const header = document.createElement('div'); header.className = 'item-card-header'
    const status = document.createElement('div'); status.className = 'item-card-status'
    status.append(...(options.status ?? []))
    if (options.count) {
      const count = label(options.count.text, 'item-card-count')
      if (options.count.title) count.title = options.count.title
      status.append(count)
    }
    header.append(status)
    if (options.action) {
      options.action.classList.add('item-card-action')
      retainFocus(options.action, options.key, 'item-card-action')
      header.append(options.action)
    } else if (options.selected && options.order !== undefined) {
      header.append(label(`#${options.order}`, 'item-card-order'))
    }
    card.append(header)
  }

  const main = makeButton('', options.onActivate)
  main.className = 'item-card-main'
  main.setAttribute('aria-label', options.label)
  main.setAttribute('aria-pressed', String(Boolean(options.selected)))
  if (options.unavailable) main.setAttribute('aria-disabled', 'true')
  if (options.title) main.title = options.title
  retainFocus(main, options.key, 'item-card-main')
  const art = document.createElement('div'); art.className = 'item-card-art'
  art.append(options.portrait)
  if (options.overlay) art.append(options.overlay)
  main.append(art)
  if (options.name !== undefined) main.append(label(options.name, 'name'))
  main.append(options.meta)
  card.append(main)

  if (options.marks?.length) {
    const marks = document.createElement('span'); marks.className = 'item-card-marks'
    marks.append(...options.marks); card.append(marks)
  }
  return card
}
