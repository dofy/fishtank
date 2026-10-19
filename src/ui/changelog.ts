import source from '../../CHANGELOG.md?raw'
import { copy } from '../core/i18n'
import type { Locale } from '../core/types'
import { CHANGELOG_ICON, CLOSE_ICON } from './icons'

const SOURCE_BASE = 'https://github.com/dofy/fishtank/blob/main/'

/** Render the small Markdown subset used by CHANGELOG.md without injecting HTML. */
function appendInline(parent: HTMLElement, text: string): void {
  const tokens = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g
  let offset = 0
  for (const match of text.matchAll(tokens)) {
    parent.append(document.createTextNode(text.slice(offset, match.index)))
    if (match[1] !== undefined || match[2] !== undefined) {
      const el = document.createElement(match[1] !== undefined ? 'strong' : 'code')
      el.textContent = match[1] ?? match[2]!
      parent.append(el)
    } else {
      const url = new URL(match[4]!, SOURCE_BASE)
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        const link = document.createElement('a')
        link.href = url.href
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.textContent = match[3]!
        parent.append(link)
      } else {
        parent.append(document.createTextNode(match[3]!))
      }
    }
    offset = match.index! + match[0].length
  }
  parent.append(document.createTextNode(text.slice(offset)))
}

export function renderChangelogDialog(
  locale: Locale,
  currentVersion: string,
  onClose: () => void,
): HTMLDialogElement {
  const c = copy(locale)
  const dialog = document.createElement('dialog')
  dialog.className = 'help-modal changelog-dialog'
  dialog.dataset.locale = locale
  dialog.setAttribute('aria-labelledby', 'changelog-title')
  dialog.setAttribute('aria-describedby', 'changelog-intro')

  const header = document.createElement('div')
  header.className = 'book-detail-head'
  const title = document.createElement('h2')
  title.id = 'changelog-title'
  title.className = 'changelog-title'
  title.innerHTML = `<span class="ico">${CHANGELOG_ICON}</span>`
  title.append(document.createTextNode(c.changelogBtn))
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'book-close-btn'
  close.setAttribute('aria-label', c.changelogClose)
  close.innerHTML = CLOSE_ICON
  close.onclick = onClose
  header.append(title, close)

  const intro = document.createElement('p')
  intro.id = 'changelog-intro'
  intro.className = 'changelog-intro'
  intro.textContent = c.changelogIntro

  const navigation = document.createElement('nav')
  navigation.className = 'changelog-nav'
  navigation.setAttribute('aria-label', c.changelogVersions)
  const body = document.createElement('div')
  body.className = 'help-body changelog-body'
  body.tabIndex = 0
  body.setAttribute('aria-label', c.changelogBtn)

  let article: HTMLElement | null = null
  let list: HTMLUListElement | null = null
  let hiddenSection = false
  for (const line of source.split(/\r?\n/)) {
    const release = /^## \[([^\]]+)\](?: - (\d{4}-\d{2}-\d{2}))?$/.exec(line)
    if (release) {
      const version = release[1]!
      const unreleased = version === 'Unreleased'
      const releaseLabel = unreleased ? c.changelogUnreleased : `v${version}`
      article = document.createElement('article')
      article.className = 'changelog-release'
      const releaseHeader = document.createElement('div')
      releaseHeader.className = 'changelog-release-head'
      const heading = document.createElement('h3')
      heading.textContent = releaseLabel
      releaseHeader.append(heading)
      if (release[2]) {
        const date = document.createElement('time')
        date.dateTime = release[2]
        date.textContent = release[2]
        releaseHeader.append(date)
      }
      if (version === currentVersion) {
        const badge = document.createElement('span')
        badge.className = 'changelog-current'
        badge.textContent = c.changelogCurrent
        releaseHeader.append(badge)
      }
      article.append(releaseHeader)
      body.append(article)
      const target = article
      const jump = document.createElement('button')
      jump.type = 'button'
      jump.textContent = releaseLabel
      jump.onclick = () => body.scrollTo({
        top: target.offsetTop,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
      navigation.append(jump)
      list = null
      hiddenSection = false
      continue
    }
    if (!article) continue
    if (line.startsWith('### ')) {
      // Keep the in-game page focused on player-visible changes and save compatibility.
      hiddenSection = line === '### 验证与发布'
      list = null
      if (!hiddenSection) {
        const heading = document.createElement('h4')
        heading.textContent = line.slice(4)
        article.append(heading)
      }
      continue
    }
    if (hiddenSection || !line.trim()) {
      list = null
      continue
    }
    if (line.startsWith('- ')) {
      if (!list) {
        list = document.createElement('ul')
        article.append(list)
      }
      const item = document.createElement('li')
      appendInline(item, line.slice(2))
      list.append(item)
    } else {
      list = null
      const paragraph = document.createElement('p')
      appendInline(paragraph, line)
      article.append(paragraph)
    }
  }

  dialog.append(header, intro, navigation, body)
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    onClose()
  })
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect()
    if (
      event.target === dialog &&
      (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom)
    ) onClose()
  })
  return dialog
}
