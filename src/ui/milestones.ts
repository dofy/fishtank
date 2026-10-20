import { milestoneProgress, setDisplayedMilestone } from '../core/milestones'
import type { GameState, Locale, MilestoneId } from '../core/types'
import { heading, label, makeActionButton, makeStatusIcon } from './dom'
import { ACTION_ICONS } from './icons'

export function milestoneCopy(locale: Locale) {
  const zh = locale === 'zh'
  const entries: Record<MilestoneId, { title: string; note: string; plaque: string }> = zh ? {
    'first-friend': { title: '初次相遇', note: '发现第一种非初始鱼', plaque: '初次相遇' },
    'tier-one': { title: '珊瑚礁邻居', note: '收齐全部 1★ 鱼种', plaque: '珊瑚礁邻居' },
    'jelly-family': { title: '水母漫游', note: '发现全部三种水母', plaque: '水母漫游' },
    'grade-five': { title: '一抹幻彩', note: '首次发现品阶 5 的小鱼', plaque: '一抹幻彩' },
    'variant-collector': { title: '幻彩收藏家', note: '发现 25 种非初始品阶外观', plaque: '幻彩收藏家' },
    'reef-explorer': { title: '海洋朋友', note: '发现全部 29 种海洋生物', plaque: '海洋朋友' },
  } : {
    'first-friend': { title: 'First encounter', note: 'Discover your first non-starter species', plaque: 'First encounter' },
    'tier-one': { title: 'Reef neighbors', note: 'Discover every 1★ species', plaque: 'Reef neighbors' },
    'jelly-family': { title: 'Jellyfish wanderer', note: 'Discover all three jellyfish species', plaque: 'Jellyfish wanderer' },
    'grade-five': { title: 'A touch of color', note: 'Discover your first grade-5 fish', plaque: 'A touch of color' },
    'variant-collector': { title: 'Color collector', note: 'Discover 25 non-starter grade variants', plaque: 'Color collector' },
    'reef-explorer': { title: 'Ocean friends', note: 'Discover all 29 marine species', plaque: 'Ocean friends' },
  }
  return {
    title: zh ? '收集纪念' : 'Collection milestones',
    hint: zh ? '完成后可摆上纪念牌，记录永久保留。' : 'Earn a plaque; unlocked milestones stay with you.',
    equip: zh ? '摆上纪念牌' : 'Display plaque', remove: zh ? '取下纪念牌' : 'Remove plaque',
    unlocked: zh ? '已完成' : 'Completed', locked: zh ? '继续收集' : 'Keep collecting',
    saved: zh ? '纪念牌已换好。' : 'Plaque updated.', storage: zh ? '浏览器没能保存，原来的纪念牌已保留。' : 'The browser could not save. Your previous plaque is unchanged.',
    plaqueLabel: zh ? '收集纪念牌' : 'Collection plaque', entries,
    help: zh ? '鱼景互动：海马会在海草旁停歇，小鱼偶尔穿拱或同种结伴，河豚被点到后会鼓起；投喂、受惊和放电优先。图鉴的 6 项收集纪念没有时限，完成后可选一块纪念牌展示，放生也不会失去记录。' : 'Seahorses rest by seaweed; small fish may pass through an arch or swim with their own species. Clicking a puffer makes it inflate. Feeding, startling and electricity take priority. Six untimed collection milestones in the Book unlock optional plaques; releasing fish never removes an earned milestone.',
  }
}

export function milestonePanel(state: GameState, locale: Locale, change: (id: MilestoneId) => void): HTMLElement {
  const c = milestoneCopy(locale), box = document.createElement('section'); box.className = 'milestone-panel'
  const progress = milestoneProgress(state), unlocked = progress.filter(p => p.unlocked).length
  box.setAttribute('aria-label', c.title)
  const header = document.createElement('div'); header.className = 'milestone-header'
  header.append(heading(`${c.title} ${unlocked}/${progress.length}`, 'h3'), label(c.hint, 'collection-hint'))
  box.append(header)
  const list = document.createElement('ul'); list.className = 'milestone-list'
  for (const item of progress) {
    const entry = document.createElement('li'); entry.className = 'milestone-entry'; entry.dataset.milestone = item.id
    const text = c.entries[item.id], title = document.createElement('strong'); title.textContent = text.title
    const info = document.createElement('div'); info.className = 'milestone-info'
    const status = item.unlocked ? makeStatusIcon(ACTION_ICONS.current, c.unlocked) : label(`${item.current}/${item.total}`, '')
    status.classList.add('milestone-progress')
    status.setAttribute('aria-label', `${text.title}: ${item.unlocked ? c.unlocked : `${item.current}/${item.total}`}`)
    const titleRow = document.createElement('div'); titleRow.className = 'milestone-title-row'
    titleRow.append(title, status)
    const meter = document.createElement('progress'); meter.className = 'milestone-meter'
    meter.max = item.total; meter.value = item.unlocked ? item.total : item.current
    meter.setAttribute('aria-label', text.title)
    info.append(titleRow, label(text.note, 'collection-hint'), meter)
    const displayed = state.milestones?.displayed === item.id
    const button = makeActionButton(!item.unlocked ? ACTION_ICONS.lock : displayed ? ACTION_ICONS.unpin : ACTION_ICONS.pin, `${!item.unlocked ? c.locked : displayed ? c.remove : c.equip}: ${text.title}`, () => change(item.id))
    button.disabled = !item.unlocked; button.dataset.milestoneEquip = item.id
    button.setAttribute('aria-pressed', String(displayed))
    entry.classList.toggle('is-displayed', displayed)
    entry.append(info, button); list.append(entry)
  }
  box.append(list)
  return box
}

export function choosePlaque(state: GameState, id: MilestoneId, save: () => boolean): boolean {
  const previous = state.milestones
  const changed = setDisplayedMilestone(state, previous?.displayed === id ? undefined : id)
  if (changed && save()) return true
  if (previous === undefined) delete state.milestones
  else state.milestones = previous
  return false
}
