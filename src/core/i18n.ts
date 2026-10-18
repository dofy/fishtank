import { species } from './species'
import type { Locale, SpeciesId, Tier } from './types'

export function detectLocale(): Locale {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }
  return 'zh'
}

const SPECIES_ZH: Record<SpeciesId, string> = {
  goldfin: '金鳍初始鱼',
  greyminnow: '灰鲦鱼',
  copperband: '铜带蝶鱼',
  moonhorn: '月角刺尾鱼',
  neoncleaner: '霓虹清洁隆头鱼',
  mossback: '苔背小精灵',
  sapphiredamsel: '蓝宝石雀鲷',
  banggai: '邦盖天竺鲷',
  goldbutterfly: '黄金蝶鱼',
  neonstreak: '霓虹灯鱼',
  blushingfire: '绯红雷达鱼',
  creampuff: '奶油河豚',
  royalgoldtail: '皇家金尾鲷',
  skywing: '天翼飞鱼',
  emberbarb: '余烬虎皮鱼',
  goldenmoorish: '黄金神像鱼',
  voidray: '虚空鳐',
  auroraeel: '极光鳗',
  prismkoi: '棱镜锦鲤',
  leviathanfry: '利维坦幼体',
  frostblue: '霜蓝翻车鱼',
  limeback: '青背海龟',
  matsuri: '祭典章鱼',
}

const TIER_ZH: readonly [string, string, string, string, string, string] = [
  '初始',
  '普通',
  '优秀',
  '稀有',
  '传说',
  '神话',
]

const TIER_EN: readonly [string, string, string, string, string, string] = [
  'Starter',
  'Common',
  'Uncommon',
  'Rare',
  'Legendary',
  'Mythic',
]

const THEME_ZH: Record<string, string> = {
  realistic: '写实珊瑚礁',
  lcd: '单色液晶屏',
}

const THEME_EN: Record<string, string> = {
  realistic: 'Realistic Reef',
  lcd: 'Monochrome LCD',
}

export function speciesName(id: SpeciesId, locale: Locale): string {
  const sp = species(id)
  if (locale === 'zh') return SPECIES_ZH[id] ?? sp.name
  return sp.name
}

export function tierName(tier: Tier, locale: Locale): string {
  return (locale === 'zh' ? TIER_ZH : TIER_EN)[tier]
}

export function themeName(id: string, fallback: string, locale: Locale): string {
  return (locale === 'zh' ? THEME_ZH[id] : THEME_EN[id]) ?? fallback
}

export interface Copy {
  hudLevel: string
  hudMax: string
  hudExp: string
  hudTank: string
  hudHearts: string
  hudNextHeart: string
  hudFull: string
  hudSpecies: string
  langToggle: string
  tabs: {
    tank: string
    breed: string
    merge: string
    season: string
    book: string
    settings: string
  }
  tankHeading: string
  releaseBtn: string
  lastFishStays: string
  releasedMsg: (name: string) => string
  tankNote: string
  breedHeading: (picked: number) => string
  breedNotEnoughAdults: string
  oddsHeading: string
  pairingCol: string
  breedBtn: (picked: number) => string
  clearBtn: string
  hatchedMsg: (name: string, starsStr: string, tierStr: string, grade: number, novel: boolean) => string
  mergeHeading: (count: number, picked: number) => string
  mergeBtn: (picked: number, total: number) => string
  mergedMsg: (name: string, starsStr: string, tierStr: string) => string
  mergeNote: string
  seasonHeading: string
  craftedSuffix: string
  minTierLabel: (starsStr: string) => string
  craftBtn: string
  craftedMsg: (name: string) => string
  seasonNote: string
  bookHeading: string
  seasonalSuffix: string
  settingsThemeHeading: string
  settingsThemeNote: string
  settingsLangHeading: string
  settingsTradeHeading: string
  settingsTradeUnlocked: string
  settingsTradeLocked: (lv: number) => string
  settingsSaveHeading: string
  resetBtn: string
  confirmResetBtn: string
  cancelBtn: string
  resetDoneMsg: string
  settingsSaveNote: string
  gradeLabel: (grade: number) => string
  badgeReadyTitle: string
  badgePartialTitle: string
  badgeNoneTitle: string
  describeAdult: string
  describeFry: (clock: string) => string
  describeFish: (
    name: string,
    starsStr: string,
    tierStr: string,
    grade: number,
    uses: number,
    stateStr: string,
  ) => string
  breedError: (code: string) => string
  synthError: (code: string, count: number) => string
  craftError: (code: string) => string
}

const ZH: Copy = {
  hudLevel: '等级',
  hudMax: ' (满级)',
  hudExp: '经验',
  hudTank: '容量',
  hudHearts: '爱心',
  hudNextHeart: '恢复',
  hudFull: '已满',
  hudSpecies: '图鉴',
  langToggle: 'EN',
  tabs: {
    tank: '鱼缸',
    breed: '繁殖',
    merge: '合成',
    season: '赛季',
    book: '图鉴',
    settings: '设置',
  },
  tankHeading: '我的鱼群',
  releaseBtn: '放生',
  lastFishStays: '至少需要保留最后一条鱼。',
  releasedMsg: (name) => `已放生 ${name}。`,
  tankNote: '鱼苗随时间成长，成年瞬间自动结算经验（EXP）。经验可提升鱼缸等级并扩大容量上限。',
  breedHeading: (picked) => `选择两条成年鱼进行繁殖（已选 ${picked}/2）`,
  breedNotEnoughAdults: '需要至少两条有剩余繁殖次数的成年鱼。鱼苗需等待长大，次数耗尽的鱼可用于合成。',
  oddsHeading: '子代星级概率',
  pairingCol: '亲代组合',
  breedBtn: (picked) => `开始繁殖 · 消耗 1 爱心 (${picked}/2)`,
  clearBtn: '清空选择',
  hatchedMsg: (name, starsStr, tierStr, grade, novel) =>
    `孵化出 ${name}（${starsStr} ${tierStr} · 品阶 ${grade}）！${novel ? ' 解锁新图鉴！' : ''}`,
  mergeHeading: (count, picked) => `选择 ${count} 条同星级的鱼进行合成（已选 ${picked}/${count}）`,
  mergeBtn: (picked, total) => `开始合成 (${picked}/${total})`,
  mergedMsg: (name, starsStr, tierStr) => `合成成功：获得 ${name}（${starsStr} ${tierStr}）！`,
  mergeNote: '消耗 10 条同星级鱼可合成 1 条高一星级的鱼，并继承材料中的最高品阶。建议优先消耗繁殖次数用尽的重复鱼。',
  seasonHeading: '赛季限定合成',
  craftedSuffix: ' — 已合成',
  minTierLabel: (starsStr) => `最低 ${starsStr}`,
  craftBtn: '合成限定生物',
  craftedMsg: (name) => `成功合成赛季限定：${name}！`,
  seasonNote: '材料鱼必须已成年且达到指定星级。绿色角标表示该槽位材料已集齐，合成时优先消耗最早获得的匹配鱼。',
  bookHeading: '生物图鉴',
  seasonalSuffix: ' · 赛季限定',
  settingsThemeHeading: '画面风格（支持素材替换）',
  settingsThemeNote:
    '每个主题位于 public/themes/<主题名>/ 目录下，包含配色清单与渲染器配置；将 <speciesId>.png 放入对应 sprites/ 目录即可直接替换鱼类外观，无需修改代码。',
  settingsLangHeading: '界面语言 / Language',
  settingsTradeHeading: '交易中心',
  settingsTradeUnlocked: '已解锁（当前单机版不包含联网交易与经济市场）。',
  settingsTradeLocked: (lv) => `将在鱼缸等级达到 Lv.${lv} 时解锁（与原版一致）。`,
  settingsSaveHeading: '存档管理',
  resetBtn: '重置存档进度',
  confirmResetBtn: '确认清空并重开？',
  cancelBtn: '取消',
  resetDoneMsg: '存档已重置，重新开始养鱼之旅。',
  settingsSaveNote: '游戏进度自动保存在当前浏览器的 localStorage 中，支持离线成长与爱心恢复结算。',
  gradeLabel: (g) => `品阶 ${g}`,
  badgeReadyTitle: '当前可用',
  badgePartialTitle: '成长中或未齐备',
  badgeNoneTitle: '次数已耗尽或不可用',
  describeAdult: '已成年',
  describeFry: (clock) => `鱼苗（距成年还需 ${clock}）`,
  describeFish: (name, starsStr, tierStr, grade, uses, stateStr) =>
    `${name} — ${starsStr} ${tierStr}，品阶 ${grade}，剩余繁殖次数 ${uses}，${stateStr}。`,
  breedError: (code) => {
    switch (code) {
      case 'no-hearts':
        return '爱心不足，每 7 分钟自动恢复 1 颗爱心。'
      case 'tank-full':
        return '鱼缸已满！请先提升鱼缸等级或在“鱼缸”页放生多余的鱼。'
      case 'not-adult':
        return '亲代必须都是已成年的鱼。'
      case 'no-uses':
        return '所选亲代中有繁殖次数已耗尽的鱼。'
      case 'seasonal-parent':
        return '赛季限定生物无法用于繁殖。'
      default:
        return '请先点击上方卡片选择两条不同的成年鱼。'
    }
  },
  synthError: (code, count) => {
    switch (code) {
      case 'mixed-tier':
        return '所有 10 条材料鱼必须具有相同的星级。'
      case 'max-tier':
        return '神话（5★）已是最高星级，无法继续向上合成。'
      case 'seasonal-material':
        return '赛季限定生物不能作为合成材料消耗。'
      case 'tank-full':
        return '鱼缸已满。'
      default:
        return `请先点击上方卡片选择满 ${count} 条同星级的鱼。`
    }
  },
  craftError: (code) => {
    switch (code) {
      case 'missing-materials':
        return '合成所需材料鱼尚未集齐（需成年且满足最低星级）。'
      case 'tank-full':
        return '鱼缸已满。'
      default:
        return '未知合成配方。'
    }
  },
}

const EN: Copy = {
  hudLevel: 'Level',
  hudMax: ' (max)',
  hudExp: 'EXP',
  hudTank: 'Tank',
  hudHearts: 'Hearts',
  hudNextHeart: 'Next heart',
  hudFull: 'full',
  hudSpecies: 'Species',
  langToggle: '中文',
  tabs: {
    tank: 'Tank',
    breed: 'Breed',
    merge: 'Merge',
    season: 'Season',
    book: 'Book',
    settings: 'Settings',
  },
  tankHeading: 'Your fish',
  releaseBtn: 'Release',
  lastFishStays: 'The last fish stays.',
  releasedMsg: (name) => `Released ${name}.`,
  tankNote:
    'Fry mature on a timer and bank EXP the moment they become adults. EXP raises the aquarium level, which expands tank capacity.',
  breedHeading: (picked) => `Pick two adults (${picked}/2 selected)`,
  breedNotEnoughAdults:
    'Needs two adults with breeding attempts left. Fry have to grow up first, and an exhausted fish can still be merged.',
  oddsHeading: 'Offspring odds',
  pairingCol: 'Pairing',
  breedBtn: (picked) => `Breed · 1 heart (${picked}/2)`,
  clearBtn: 'Clear',
  hatchedMsg: (name, starsStr, tierStr, grade, novel) =>
    `${name} hatched at ${starsStr} ${tierStr}, grade ${grade}.${novel ? ' New species for the book!' : ''}`,
  mergeHeading: (count, picked) => `Merge ${count} fish of one tier (${picked}/${count} selected)`,
  mergeBtn: (picked, total) => `Merge (${picked}/${total})`,
  mergedMsg: (name, starsStr, tierStr) => `Merged into ${name}, ${starsStr} ${tierStr}.`,
  mergeNote:
    'Ten go in, one comes out a tier higher, carrying the best grade among them. Spend exhausted duplicates here, never a fish that still has breeding attempts.',
  seasonHeading: 'Season crafting',
  craftedSuffix: ' — crafted',
  minTierLabel: (starsStr) => `min ${starsStr}`,
  craftBtn: 'Craft',
  craftedMsg: (name) => `Crafted ${name}.`,
  seasonNote:
    'Materials must be adults at or above the listed tier. A green badge means that slot is satisfied; crafting consumes the oldest matching fish first.',
  bookHeading: 'Collection',
  seasonalSuffix: ' · seasonal',
  settingsThemeHeading: 'Art theme',
  settingsThemeNote:
    'A theme is a folder under public/themes/. Its manifest supplies the palette, the renderer and an optional sprites/ directory; dropping <speciesId>.png in there replaces that fish everywhere with no code change.',
  settingsLangHeading: 'Language / 界面语言',
  settingsTradeHeading: 'Trade hub',
  settingsTradeUnlocked:
    'Unlocked. This build keeps trading out of scope: there is no economy, no server and no market.',
  settingsTradeLocked: (lv) => `Locked until aquarium level ${lv}, mirroring the original's gate.`,
  settingsSaveHeading: 'Save',
  resetBtn: 'Reset progress',
  confirmResetBtn: 'Confirm reset?',
  cancelBtn: 'Cancel',
  resetDoneMsg: 'Progress has been reset.',
  settingsSaveNote: 'Progress lives in localStorage on this device only.',
  gradeLabel: (g) => `grade ${g}`,
  badgeReadyTitle: 'Available to use now',
  badgePartialTitle: 'Present but not usable yet',
  badgeNoneTitle: 'Nothing to use',
  describeAdult: 'adult',
  describeFry: (clock) => `fry, ${clock} to adulthood`,
  describeFish: (name, starsStr, tierStr, grade, uses, stateStr) =>
    `${name} — ${starsStr} ${tierStr}, grade ${grade}, ${uses} breeding attempts left, ${stateStr}.`,
  breedError: (code) => {
    switch (code) {
      case 'no-hearts':
        return 'Out of hearts. One regenerates every seven minutes.'
      case 'tank-full':
        return 'Tank is full. Raise the aquarium level or release a fish.'
      case 'not-adult':
        return 'Both parents must be adults.'
      case 'no-uses':
        return 'One parent has no breeding attempts left.'
      case 'seasonal-parent':
        return 'Seasonal creatures cannot breed.'
      default:
        return 'Pick two different adults from the grid above first.'
    }
  },
  synthError: (code, count) => {
    switch (code) {
      case 'mixed-tier':
        return 'All ten materials must share one tier.'
      case 'max-tier':
        return 'Mythic is the ceiling; it cannot be merged upward.'
      case 'seasonal-material':
        return 'Seasonal creatures are never consumed as materials.'
      case 'tank-full':
        return 'Tank is full.'
      default:
        return `Select ${count} fish of the same tier from the grid above first.`
    }
  },
  craftError: (code) => {
    switch (code) {
      case 'missing-materials':
        return 'Materials are short (must be adults at or above the required tier).'
      case 'tank-full':
        return 'Tank is full.'
      default:
        return 'Unknown recipe.'
    }
  },
}

export function copy(locale: Locale): Copy {
  return locale === 'zh' ? ZH : EN
}
