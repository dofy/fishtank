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

  const releases: { article: HTMLElement; jump: HTMLButtonElement }[] = []
  const setActive = (active: HTMLButtonElement): void => {
    if (active.getAttribute('aria-current') === 'location') return
    for (const { jump } of releases) {
      if (jump === active) jump.setAttribute('aria-current', 'location')
      else jump.removeAttribute('aria-current')
    }
    if (navigation.scrollWidth > navigation.clientWidth && (
      active.offsetLeft < navigation.scrollLeft ||
      active.offsetLeft + active.offsetWidth > navigation.scrollLeft + navigation.clientWidth
    )) {
      navigation.scrollTo({ left: active.offsetLeft - (navigation.clientWidth - active.offsetWidth) / 2 })
    }
  }

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
      article.dataset.current = String(version === currentVersion)
      const releaseHeader = document.createElement('div')
      releaseHeader.className = 'changelog-release-head'
      const heading = document.createElement('h3')
      heading.id = `changelog-version-${version.replaceAll('.', '-')}`
      heading.textContent = releaseLabel
      article.setAttribute('aria-labelledby', heading.id)
      releaseHeader.append(heading)
      if (release[2]) {
        const date = document.createElement('time')
        date.dateTime = release[2]
        date.textContent = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en', {
          year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
        }).format(new Date(`${release[2]}T00:00:00Z`))
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
      jump.onclick = () => {
        setActive(jump)
        body.scrollTo({
          top: target.offsetTop,
          behavior: document.documentElement.dataset.theme === 'lcd' || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        })
      }
      releases.push({ article, jump })
      navigation.append(jump)
      list = null
      hiddenSection = false
      continue
    }
    if (!article) continue
    if (line.startsWith('### ')) {
      // Keep the in-game page focused on player-visible changes and save compatibility.
      hiddenSection = line === '### 验证与发布' || line === '### 开发与兼容说明'
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
      if (line.startsWith('对应标签：')) {
        const details = document.createElement('details')
        details.className = 'changelog-sources'
        const summary = document.createElement('summary')
        summary.textContent = c.changelogSources
        details.append(summary, paragraph)
        article.append(details)
      } else {
        article.append(paragraph)
      }
    }
  }

  if (releases[0]) setActive(releases[0].jump)
  body.addEventListener('scroll', () => {
    const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 2
    let active = atBottom ? releases.at(-1) : releases[0]
    if (!atBottom) {
      for (const release of releases) {
        if (release.article.offsetTop > body.scrollTop + 24) break
        active = release
      }
    }
    if (active) setActive(active.jump)
  }, { passive: true })

  const layout = document.createElement('div')
  layout.className = 'changelog-layout'
  layout.append(navigation, body)
  dialog.append(header, intro, layout)
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
