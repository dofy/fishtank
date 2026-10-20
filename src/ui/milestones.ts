import { milestoneProgress, setDisplayedMilestones } from '../core/milestones'
import type { GameState, Locale, MilestoneId } from '../core/types'
import { heading, label } from './dom'
import { medalArt } from './medals'

export function milestoneCopy(locale: Locale) {
  const zh = locale === 'zh'
  const entries: Record<MilestoneId, { title: string; note: string }> = zh ? {
    'first-friend': { title: '初次相遇', note: '发现第一种非初始鱼' },
    'tier-one': { title: '珊瑚礁邻居', note: '收齐全部 1★ 鱼种' },
    'jelly-family': { title: '水母漫游', note: '发现全部三种水母' },
    'grade-five': { title: '一抹幻彩', note: '首次发现品阶 5 的小鱼' },
    'variant-collector': { title: '幻彩收藏家', note: '发现 25 种非初始品阶外观' },
    'reef-explorer': { title: '海洋朋友', note: '发现全部 29 种海洋生物' },
    'reef-rookie': { title: '礁石初探', note: '发现 5 种非初始鱼' },
    'reef-naturalist': { title: '海洋博物家', note: '发现 15 种非初始鱼' },
    'rare-encounter': { title: '深蓝来客', note: '发现第一种 3★ 稀有鱼' },
    'legend-encounter': { title: '传说之光', note: '发现第一种 4★ 传说鱼' },
    'mythic-encounter': { title: '神话回响', note: '发现第一种 5★ 神话鱼' },
    'eel-family': { title: '鳗舞海流', note: '发现全部三种鳗鱼' },
    'color-palette': { title: '五彩同游', note: '集齐任一非初始鱼的五种品阶' },
    'variant-master': { title: '幻彩宝库', note: '发现 60 种非初始品阶外观' },
  } : {
    'first-friend': { title: 'First encounter', note: 'Discover your first non-starter species' },
    'tier-one': { title: 'Reef neighbors', note: 'Discover every 1★ species' },
    'jelly-family': { title: 'Jellyfish wanderer', note: 'Discover all three jellyfish species' },
    'grade-five': { title: 'A touch of color', note: 'Discover your first grade-5 fish' },
    'variant-collector': { title: 'Color collector', note: 'Discover 25 non-starter grade variants' },
    'reef-explorer': { title: 'Ocean friends', note: 'Discover all 29 marine species' },
    'reef-rookie': { title: 'Reef explorer', note: 'Discover 5 non-starter species' },
    'reef-naturalist': { title: 'Ocean naturalist', note: 'Discover 15 non-starter species' },
    'rare-encounter': { title: 'Deep blue visitor', note: 'Discover your first 3★ species' },
    'legend-encounter': { title: 'Legendary light', note: 'Discover your first 4★ species' },
    'mythic-encounter': { title: 'Mythic echo', note: 'Discover your first 5★ species' },
    'eel-family': { title: 'Eel currents', note: 'Discover all three eel species' },
    'color-palette': { title: 'Five colors', note: 'Find every grade of one non-starter species' },
    'variant-master': { title: 'Color treasury', note: 'Discover 60 non-starter grade variants' },
  }
  return {
    title: zh ? '成就勋章' : 'Medal collection',
    summary: (earned: number, mounted: number) => zh ? `已获得 ${earned} 枚 · 已挂上 ${mounted} 枚` : `${earned} earned · ${mounted} on display`,
    hint: zh ? '每次相遇都值得纪念。已获得的勋章可以一起挂在鱼缸上。' : 'Keep a little memento. Every earned medal can hang on your tank.',
    equip: zh ? '挂上勋章' : 'Hang medal', remove: zh ? '取下勋章' : 'Remove medal',
    unlocked: zh ? '已获得' : 'Earned', locked: zh ? '未解锁' : 'Locked',
    mountAll: zh ? '挂上全部' : 'Hang all', removeAll: zh ? '全部取下' : 'Remove all',
    mounted: zh ? '已挂上' : 'On display',
    saved: zh ? '勋章已更新。' : 'Medals updated.', storage: zh ? '浏览器没能保存，原来的勋章已保留。' : 'The browser could not save. Your medals are unchanged.',
    plaqueLabel: zh ? '鱼缸勋章' : 'Aquarium medals', entries,
    help: zh ? '同种小鱼会随机结群，浮游生物偶尔随水流出现，小鱼发现后会去吃；海马会停歇、小鱼可穿拱，点河豚会鼓起。图鉴的勋章页有 14 项永久成就，每枚图案不同，已获得的可以全部挂上，也可单独取下。' : 'Same-species fish sometimes form a school. Tiny plankton drift in occasionally and nearby fish swim over for a bite. Seahorses rest, fish pass through arches, and puffers inflate when clicked. The Book has 14 permanent achievements, each with a unique medal. Hang all earned medals or remove them individually.',
  }
}

export function milestonePanel(state: GameState, locale: Locale, change: (id: MilestoneId | 'all' | 'none') => void): HTMLElement {
  const c=milestoneCopy(locale),box=document.createElement('section');box.className='milestone-panel'
  const progress=milestoneProgress(state),earned=progress.filter(p=>p.unlocked),displayed=state.milestones?.displayed??[]
  box.setAttribute('aria-label',c.title)
  const header=document.createElement('div');header.className='milestone-header'
  const intro=document.createElement('div');intro.append(heading(c.summary(earned.length,displayed.length),'h3'),label(c.hint,'collection-hint'))
  const actions=document.createElement('div');actions.className='medal-bulk-actions'
  for(const [id,text,disabled] of [['all',c.mountAll,!earned.length||earned.every(p=>displayed.includes(p.id))],['none',c.removeAll,!displayed.length]] as const){
    const button=document.createElement('button');button.type='button';button.textContent=text;button.dataset.medals=id;button.disabled=disabled;button.addEventListener('click',()=>change(id));actions.append(button)
  }
  header.append(intro,actions);box.append(header)
  const list=document.createElement('ul');list.className='milestone-list'
  for(const item of progress){
    const entry=document.createElement('li');entry.className='milestone-entry';entry.dataset.milestone=item.id
    const text=c.entries[item.id],mounted=displayed.includes(item.id)
    const button=document.createElement('button');button.type='button';button.className='medal-select';button.disabled=!item.unlocked
    button.dataset.milestoneEquip=item.id;button.setAttribute('aria-pressed',String(mounted));button.title=`${item.unlocked?mounted?c.remove:c.equip:c.locked}: ${text.title}`;button.setAttribute('aria-label',button.title)
    const name=document.createElement('strong');name.textContent=text.title
    const status=label(!item.unlocked?`${item.current}/${item.total}`:mounted?c.mounted:c.unlocked,'medal-state')
    button.append(medalArt(item.id),name,status);button.addEventListener('click',()=>change(item.id))
    const meter=document.createElement('progress');meter.className='milestone-meter';meter.max=item.total;meter.value=item.unlocked?item.total:item.current;meter.setAttribute('aria-label',text.title)
    entry.dataset.earned=String(item.unlocked);entry.classList.toggle('is-displayed',mounted)
    entry.append(button,label(text.note,'collection-hint'),meter);list.append(entry)
  }
  box.append(list);return box
}

export function choosePlaque(state: GameState, id: MilestoneId | 'all' | 'none', save: () => boolean): boolean {
  const previous=state.milestones,displayed=previous?.displayed??[]
  const ids=id==='all'?milestoneProgress(state).filter(p=>p.unlocked).map(p=>p.id):id==='none'?[]:displayed.includes(id)?displayed.filter(x=>x!==id):[...displayed,id]
  const changed=setDisplayedMilestones(state,ids)
  if(changed&&save())return true
  if(previous===undefined)delete state.milestones;else state.milestones=previous
  return false
}
