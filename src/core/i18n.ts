import { decorItem, species } from './species'
import type { DecorId, Locale, SpeciesId, Tier } from './types'

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
  moonjelly: '海月水母',
  goldbutterfly: '黄金蝶鱼',
  neonstreak: '霓虹灯鱼',
  blushingfire: '绯红雷达鱼',
  creampuff: '奶油河豚',
  coralseahorse: '珊瑚海马',
  bandedkrait: '环纹海蛇',
  royalgoldtail: '皇家金尾鲷',
  skywing: '天翼飞鱼',
  emberbarb: '余烬虎皮鱼',
  volteel: '蓝弧电鳗',
  crystaljelly: '樱花水晶水母',
  goldenmoorish: '黄金神像鱼',
  voidray: '虚空魔鬼鳐',
  auroraeel: '极光彩带鳗',
  goldenseahorse: '黄金海马',
  jadeturtle: '翡翠海龟',
  prismkoi: '棱镜锦鲤',
  leviathanfry: '利维坦海龙',
  astraljelly: '星冕帝王水母',
}

const DECOR_ZH: Record<DecorId, string> = {
  kelp: '翠绿海草',
  rocks: '礁石群',
  shell: '珍珠扇贝',
  fairylights: '七彩串灯（顶挂）',
  coral: '鹿角珊瑚',
  mushroom: '夜光海蕈',
  starfish: '海星礁石',
  starlamps: '星芒吊灯（顶挂）',
  driftwood: '沉木拱枝',
  anemone: '荧光海葵',
  lanterns: '祭典灯笼（顶挂）',
  arch: '海底石拱门',
  crystal: '紫晶簇洞',
  chest: '沉船宝箱',
  jellylamps: '霓虹水母灯（顶挂）',
  anchor: '古老船锚',
  castle: '海底城堡',
  statue: '深海神像',
}

const TIER_ZH: readonly [string, string, string, string, string, string] = [
  '初始',
  '普通',
  '高级',
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

export function decorName(id: DecorId, locale: Locale): string {
  const d = decorItem(id)
  if (locale === 'zh') return DECOR_ZH[id] ?? d.name
  return d.name
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
  hudBag: string
  hudHearts: string
  hudNextHeart: string
  hudFull: string
  hudSpecies: string
  immersiveBtn: string
  exitImmersiveBtn: string
  langToggle: string
  tabs: {
    tank: string
    breed: string
    merge: string
    decor: string
    book: string
    settings: string
  }
  tankHeading: (placed: number, cap: number, total: number) => string
  inTankTag: string
  inUseLabel: string
  releaseBtn: string
  confirmReleaseBtn: string
  placedMsg: (name: string, placed: number, cap: number) => string
  removedFromTankMsg: (name: string, placed: number, cap: number) => string
  tankDisplayFullMsg: (cap: number) => string
  releasedMsg: (name: string) => string
  tankNote: string
  breedHeading: (picked: number) => string
  sortLabel: string
  sortInTank: string
  sortTier: string
  sortGrade: string
  sortUses: string
  sortAcquired: string
  breedAutoPickBtn: string
  breedNotEnoughAdults: string
  oddsHeading: string
  pairingCol: string
  breedBtn: (picked: number) => string
  clearBtn: string
  hatchedMsg: (
    name: string,
    starsStr: string,
    tierStr: string,
    grade: number,
    expGained: number,
    novel: boolean,
  ) => string
  showcaseTitle: string
  showcaseMergeTitle: string
  breedingAnimTitle: string
  mergingAnimTitle: string
  showcaseNewBadge: string
  showcaseUsesLabel: (usesStr: string) => string
  showcaseDecorLabel: (decorName: string) => string
  showcaseCloseBtn: string
  mergeHeading: (count: number, picked: number) => string
  mergeCondTitle: string
  mergeFilterZeroUses: string
  mergeFilterExcludeTank: string
  mergeTierTitle: string
  mergeAutoPickBtn: string
  mergeEmptyByFilter: string
  mergeAutoPickedMsg: (picked: number, total: number) => string
  mergeAlreadyFullMsg: (total: number) => string
  mergeNothingToClearMsg: string
  mergeBtn: (picked: number, total: number) => string
  mergedMsg: (name: string, starsStr: string, tierStr: string) => string
  mergeNote: string
  decorHeading: (placed: number, unlocked: number, total: number) => string
  decorPlacedTag: string
  decorUnlockAt: (lv: number) => string
  decorUnlockedAt: (lv: number) => string
  decorFlipBtn: string
  decorPlacedMsg: (name: string) => string
  decorRemovedMsg: (name: string) => string
  decorFlippedMsg: (name: string) => string
  decorLockedMsg: (name: string, lv: number) => string
  decorNote: string
  bookHeading: string
  bookOwnedBadge: (count: number) => string
  bookCompletion: (pct: string) => string
  bookVariantsTitle: string
  bookSpecimensTitle: (count: number) => string
  bookNoSpecimens: string
  bookPlaceAction: string
  bookStoreAction: string
  bookGoBreedAction: string
  bookGoMergeAction: string
  bookVariantRate: (unlocked: number, total: number, pct: number) => string
  bookLockedMsg: (tierStr: string) => string
  settingsThemeHeading: string
  settingsThemeNote: string
  settingsColorModeHeading: string
  colorModeAuto: string
  colorModeLight: string
  colorModeDark: string
  settingsColorModeNote: string
  settingsAudioHeading: string
  audioSfxLabel: string
  audioBgmLabel: string
  audioTrackHeading: string
  bgmTrackLofi: string
  bgmTrackTide: string
  bgmTrackChiptune: string
  audioOn: string
  audioOff: string
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
    usesStr: string,
    stateStr: string,
  ) => string
  breedError: (code: string, extra?: string) => string
  synthError: (code: string, count: number, picked?: number) => string
}

const ZH: Copy = {
  hudLevel: '等级',
  hudMax: ' (满级)',
  hudExp: '经验',
  hudTank: '鱼缸展示',
  hudBag: '背包持有',
  hudHearts: '爱心',
  hudNextHeart: '恢复',
  hudFull: '已满',
  hudSpecies: '图鉴',
  immersiveBtn: '沉浸',
  exitImmersiveBtn: '返回',
  langToggle: 'EN',
  tabs: {
    tank: '鱼缸',
    breed: '繁殖',
    merge: '合成',
    decor: '装饰',
    book: '图鉴',
    settings: '设置',
  },
  tankHeading: (placed, cap, total) =>
    `我的鱼群（鱼缸展示 ${placed}/${cap} · 背包共 ${total} 条）`,
  inTankTag: '鱼缸中',
  inUseLabel: '使用中',
  releaseBtn: '放生',
  confirmReleaseBtn: '确认放生',
  placedMsg: (name, placed, cap) => `已将 ${name} 放入鱼缸展示（${placed}/${cap}）。`,
  removedFromTankMsg: (name, placed, cap) => `已将 ${name} 收回背包（鱼缸 ${placed}/${cap}）。`,
  tankDisplayFullMsg: (cap) =>
    `当前鱼缸展示槽位已满（上限 ${cap} 条）。可先将其他鱼“收回背包”，或通过繁殖提升鱼缸等级扩大容量（不影响继续繁殖）。`,
  releasedMsg: (name) => `已放生 ${name}。`,
  tankNote:
    '初始赠送 3 条无限繁殖次数的初始鱼。繁殖与鱼苗长大均可获得经验（EXP）提升鱼缸等级。鱼缸底部已摆放的装饰品可直接用鼠标左右拖拽移动位置！',
  breedHeading: (picked) => `选择两条成年鱼进行繁殖（已选 ${picked}/2）`,
  sortLabel: '排序：',
  sortInTank: '鱼缸优先',
  sortTier: '星级优先',
  sortGrade: '品阶优先',
  sortUses: '次数优先',
  sortAcquired: '取得顺序',
  breedAutoPickBtn: '推荐配对',
  breedNotEnoughAdults: '需要至少两条可繁殖的成年鱼。冷却或成长中的鱼请等待倒计时结束。',
  oddsHeading: '子代星级概率',
  pairingCol: '亲代组合',
  breedBtn: (picked) => `开始繁殖 · 消耗 1 爱心 (${picked}/2)`,
  clearBtn: '清空选择',
  hatchedMsg: (name, starsStr, tierStr, grade, expGained, novel) =>
    `孵化出 ${name}（${starsStr} ${tierStr} · 品阶 ${grade}），获得 +${expGained} EXP！${novel ? ' 解锁新图鉴！' : ''}`,
  showcaseTitle: '繁殖成功',
  showcaseMergeTitle: '合成成功',
  breedingAnimTitle: '亲代配对孵化中…',
  mergingAnimTitle: '10 合 1 聚变合成中…',
  showcaseNewBadge: 'NEW',
  showcaseUsesLabel: (usesStr) => `可繁殖次数 ${usesStr}`,
  showcaseDecorLabel: (dName) => `造景：${dName}`,
  showcaseCloseBtn: '收下小鱼',
  mergeHeading: (count, picked) => `选择 ${count} 条鱼进行合成（已选 ${picked}/${count}）`,
  mergeCondTitle: '筛选与自动选择条件',
  mergeFilterZeroUses: '只显示/选择剩余繁殖次数为 0 的鱼',
  mergeFilterExcludeTank: '排除已放置于鱼缸中的鱼',
  mergeTierTitle: '鱼种稀有度条件',
  mergeAutoPickBtn: '按条件自动选择 10 条',
  mergeEmptyByFilter: '当前筛选条件下没有符合要求的鱼（可取消勾选“只显示剩余繁殖次数为 0”或勾选更多稀有度）。',
  mergeAutoPickedMsg: (picked, total) =>
    picked >= total
      ? `已按筛选条件自动选中 ${picked}/${total} 条材料鱼。`
      : picked > 0
        ? `当前符合条件的材料鱼共 ${picked}/${total} 条，还差 ${total - picked} 条才能合成。`
        : '当前筛选条件下没有可自动选择的鱼。',
  mergeAlreadyFullMsg: (total) => `已选满 ${total} 条材料鱼，可直接点击“开始合成”或先取消已选鱼。`,
  mergeNothingToClearMsg: '当前没有已选中的合成材料鱼。',
  mergeBtn: (picked, total) => `开始合成 (${picked}/${total})`,
  mergedMsg: (name, starsStr, tierStr) => `合成成功：获得 ${name}（${starsStr} ${tierStr}）！`,
  mergeNote:
    '消耗 10 条材料鱼（1★–4★）可合成 1 条高一星级的鱼，并继承材料中的最高品阶（10 条同星级时 100% 升入下一星级；混搭不同星级时按投入比例决定产出星级）。建议优先消耗繁殖次数用尽（0/n）的重复鱼。',
  decorHeading: (placed, unlocked, total) =>
    `鱼缸装饰品（已摆放 ${placed} 件 · 已解锁 ${unlocked}/${total}）`,
  decorPlacedTag: '已摆放',
  decorUnlockAt: (lv) => `Lv.${lv} 解锁`,
  decorUnlockedAt: (lv) => `Lv.${lv} 奖励`,
  decorFlipBtn: '左右翻转',
  decorPlacedMsg: (name) => `已摆放「${name}」，可在上方鱼缸内直接按住左右拖拽调整位置！`,
  decorRemovedMsg: (name) => `已从鱼缸收起「${name}」。`,
  decorFlippedMsg: (name) => `已翻转「${name}」的朝向。`,
  decorLockedMsg: (name, lv) => `「${name}」尚未解锁，需鱼缸等级达到 Lv.${lv}。`,
  decorNote:
    '随着鱼缸等级提升（Lv.1–Lv.10）会解锁海底造景与顶挂彩灯。珍珠扇贝会间歇开合吐露珍珠，顶挂彩灯在黑夜模式下会自动点亮发光；放入后可在鱼缸顶部或底部直接按住左右拖动摆放！',
  bookHeading: '生物图鉴',
  bookOwnedBadge: (count) => `持有 x${count}`,
  bookCompletion: (pct) => `图鉴完成度：${pct}%`,
  bookVariantsTitle: '品阶变种图鉴（点击切换预览）',
  bookSpecimensTitle: (count) => `当前持有个体：x${count}`,
  bookNoSpecimens: '当前背包中暂无该鱼种个体（可通过繁殖或合成再次获得）。',
  bookPlaceAction: '放置',
  bookStoreAction: '收回',
  bookGoBreedAction: '去繁殖',
  bookGoMergeAction: '去合成',
  bookVariantRate: (u, t, pct) => `变种发现率：${pct}% (${u}/${t})`,
  bookLockedMsg: (tierStr) => `该鱼种（${tierStr}）尚未解锁，可通过繁殖或合成发现新品种！`,
  settingsThemeHeading: '画面风格（支持素材替换）',
  settingsThemeNote:
    '每个主题位于 public/themes/<主题名>/ 目录下，包含配色清单与渲染器配置；将 <speciesId>.png 或 decor-<id>.png 放入对应 sprites/ 目录即可直接替换鱼类或装饰品外观，无需修改代码。',
  settingsColorModeHeading: '颜色模式（昼夜与鱼缸装饰灯）',
  colorModeAuto: '自动',
  colorModeLight: '日间',
  colorModeDark: '黑夜',
  settingsColorModeNote: '默认“自动”跟随系统深浅色模式。处于黑夜模式时，鱼缸顶部的装饰灯会自动点亮并投射氛围光束。',
  settingsAudioHeading: '音效与背景音乐（Lo-Fi BGM）',
  audioSfxLabel: '操作音效',
  audioBgmLabel: '背景音乐',
  audioTrackHeading: '选择背景音乐曲目',
  bgmTrackLofi: '珊瑚礁 Lo-Fi',
  bgmTrackTide: '深海潮汐',
  bgmTrackChiptune: '液晶八音盒',
  audioOn: '开启',
  audioOff: '静音',
  settingsLangHeading: '界面语言 / Language',
  settingsTradeHeading: '交易中心',
  settingsTradeUnlocked: '已解锁（当前单机版不包含联网交易与经济市场）。',
  settingsTradeLocked: (lv) => `将在鱼缸等级达到 Lv.${lv} 时解锁（与原版一致）。`,
  settingsSaveHeading: '存档管理',
  resetBtn: '重置存档进度',
  confirmResetBtn: '确认清空并重开？',
  cancelBtn: '取消',
  resetDoneMsg: '存档已重置，已发放 3 条初始种鱼与 3 件初始装饰品。',
  settingsSaveNote: '游戏进度自动保存在当前浏览器的 localStorage 中，支持离线成长与爱心恢复结算。',
  gradeLabel: (g) => `品阶 ${g}`,
  badgeReadyTitle: '已放入鱼缸展示',
  badgePartialTitle: '鱼缸中 / 冷却中',
  badgeNoneTitle: '未放入鱼缸',
  describeAdult: '已成年',
  describeFry: (clock) => `成长/冷却中（剩余 ${clock}）`,
  describeFish: (name, starsStr, tierStr, grade, usesStr, stateStr) =>
    `${name} — ${starsStr} ${tierStr}，品阶 ${grade}，繁殖次数 ${usesStr}，${stateStr}。`,
  breedError: (code, extra) => {
    switch (code) {
      case 'no-hearts':
        return extra
          ? `爱心不足（0/5）！距离下一颗爱心恢复还需 ${extra}。`
          : '爱心不足，每 7 分钟自动恢复 1 颗爱心。'
      case 'not-adult':
        return extra
          ? `${extra}正在成长或冷却中，请等待倒计时结束。`
          : '所选亲代正在成长或冷却中，请等待倒计时结束。'
      case 'no-uses':
        return '所选亲代中有繁殖次数已耗尽的鱼。'
      default:
        return extra
          ? `请先选择两条不同的成年鱼进行配对（当前已选 ${extra}/2）。`
          : '请先点击上方卡片选择两条不同的成年鱼。'
    }
  },
  synthError: (code, count, picked) => {
    switch (code) {
      case 'mixed-tier':
        return '所有 10 条材料鱼必须具有相同的星级（请先取消已选的其他星级鱼）。'
      case 'max-tier':
        return '神话（5★）已是最高星级，无法继续向上合成。'
      case 'starter-material':
        return '初始鱼不能作为合成材料消耗。'
      default:
        return picked !== undefined
          ? `合成需要选满 ${count} 条同星级的鱼（当前已选 ${picked}/${count}）。`
          : `请先点击上方卡片选择满 ${count} 条同星级的鱼。`
    }
  },
}

const EN: Copy = {
  hudLevel: 'Level',
  hudMax: ' (max)',
  hudExp: 'EXP',
  hudTank: 'Tank',
  hudBag: 'Owned',
  hudHearts: 'Hearts',
  hudNextHeart: 'Next heart',
  hudFull: 'full',
  hudSpecies: 'Species',
  immersiveBtn: 'Immersive',
  exitImmersiveBtn: 'Back',
  langToggle: '中文',
  tabs: {
    tank: 'Tank',
    breed: 'Breed',
    merge: 'Merge',
    decor: 'Decor',
    book: 'Book',
    settings: 'Settings',
  },
  tankHeading: (placed, cap, total) =>
    `Your fish (${placed}/${cap} in tank · ${total} owned)`,
  inTankTag: 'In Tank',
  inUseLabel: 'In Tank',
  releaseBtn: 'Release',
  confirmReleaseBtn: 'Confirm',
  placedMsg: (name, placed, cap) => `Placed ${name} in the tank (${placed}/${cap}).`,
  removedFromTankMsg: (name, placed, cap) => `Removed ${name} from the tank (${placed}/${cap}).`,
  tankDisplayFullMsg: (cap) =>
    `Tank display is full (${cap}/${cap} slots). Store a fish first or level up your aquarium to unlock more display slots.`,
  releasedMsg: (name) => `Released ${name}.`,
  tankNote:
    'You start with 3 starter fish with infinite breeding uses (∞). Breeding and maturing fry grant EXP to level up your aquarium. You can drag decorations along the bottom of the tank at any time!',
  breedHeading: (picked) => `Pick two adults (${picked}/2 selected)`,
  sortLabel: 'Sort:',
  sortInTank: 'In Tank',
  sortTier: 'Rarity ★',
  sortGrade: 'Grade',
  sortUses: 'Uses Left',
  sortAcquired: 'Acquired',
  breedAutoPickBtn: 'Best Pair',
  breedNotEnoughAdults:
    'Needs two ready adults with breeding uses left. Wait for fry growth or parent cooldown timers to finish.',
  oddsHeading: 'Offspring odds',
  pairingCol: 'Pairing',
  breedBtn: (picked) => `Breed · 1 heart (${picked}/2)`,
  clearBtn: 'Clear',
  hatchedMsg: (name, starsStr, tierStr, grade, expGained, novel) =>
    `${name} hatched at ${starsStr} ${tierStr}, grade ${grade} (+${expGained} EXP).${novel ? ' New species for the book!' : ''}`,
  showcaseTitle: 'Hatching Complete!',
  showcaseMergeTitle: 'Synthesis Complete!',
  breedingAnimTitle: 'Pairing & Hatching…',
  mergingAnimTitle: 'Synthesizing 10 into 1…',
  showcaseNewBadge: 'NEW',
  showcaseUsesLabel: (usesStr) => `Breeding uses ${usesStr}`,
  showcaseDecorLabel: (dName) => `Decor: ${dName}`,
  showcaseCloseBtn: 'Keep Fish',
  mergeHeading: (count, picked) => `Merge ${count} fish (${picked}/${count} selected)`,
  mergeCondTitle: 'Filter & Auto-Select Conditions',
  mergeFilterZeroUses: 'Only fish with 0 remaining breeding uses',
  mergeFilterExcludeTank: 'Exclude fish currently placed in the tank',
  mergeTierTitle: 'Rarity Tier Filter',
  mergeAutoPickBtn: 'Auto-select 10',
  mergeEmptyByFilter:
    'No fish match the current filters (try unchecking "0 remaining uses" or enabling more rarity tiers).',
  mergeAutoPickedMsg: (picked, total) =>
    picked >= total
      ? `Auto-selected ${picked}/${total} fish matching filters.`
      : picked > 0
        ? `Only ${picked}/${total} matching fish available (${total - picked} more needed to merge).`
        : 'No matching fish available to auto-select.',
  mergeAlreadyFullMsg: (total) => `Already selected ${total}/${total} fish. Click Merge or deselect one first.`,
  mergeNothingToClearMsg: 'No selected merge materials to clear.',
  mergeBtn: (picked, total) => `Merge (${picked}/${total})`,
  mergedMsg: (name, starsStr, tierStr) => `Merged into ${name}, ${starsStr} ${tierStr}.`,
  mergeNote:
    'Ten go in, one comes out a tier higher, carrying the best grade among them. Spend exhausted duplicates (0/n) here, never a fish that still has breeding attempts.',
  decorHeading: (placed, unlocked, total) =>
    `Aquarium Decorations (${placed} placed · ${unlocked}/${total} unlocked)`,
  decorPlacedTag: 'Placed',
  decorUnlockAt: (lv) => `Unlocks Lv.${lv}`,
  decorUnlockedAt: (lv) => `Lv.${lv} Reward`,
  decorFlipBtn: 'Flip',
  decorPlacedMsg: (name) => `Placed "${name}". Drag it left or right directly inside the tank!`,
  decorRemovedMsg: (name) => `Stored "${name}".`,
  decorFlippedMsg: (name) => `Flipped "${name}".`,
  decorLockedMsg: (name, lv) => `"${name}" is locked until your aquarium reaches Level ${lv}.`,
  decorNote:
    'Floor ornaments and top-hanging string lights unlock as your aquarium levels up (Lv.1–Lv.10). Giant clams open and close periodically, and hanging lights glow in Night mode. Drag any placed item directly inside the tank!',
  bookHeading: 'Collection',
  bookOwnedBadge: (count) => `Owned x${count}`,
  bookCompletion: (pct) => `Catalog Completion: ${pct}%`,
  bookVariantsTitle: 'Grade Variants (Click to preview)',
  bookSpecimensTitle: (count) => `Owned Specimens: x${count}`,
  bookNoSpecimens: 'No specimens currently in inventory.',
  bookPlaceAction: 'Place',
  bookStoreAction: 'Store',
  bookGoBreedAction: 'Breed',
  bookGoMergeAction: 'Merge',
  bookVariantRate: (u, t, pct) => `Variant Discovery: ${pct}% (${u}/${t})`,
  bookLockedMsg: (tierStr) => `Undiscovered ${tierStr} species. Breed or merge fish to unlock it!`,
  settingsThemeHeading: 'Art theme',
  settingsThemeNote:
    'A theme is a folder under public/themes/. Its manifest supplies the palette, the renderer and an optional sprites/ directory; dropping <speciesId>.png or decor-<id>.png in there replaces that art everywhere with no code change.',
  settingsColorModeHeading: 'Color Mode & Aquarium Lamps',
  colorModeAuto: 'Auto',
  colorModeLight: 'Day',
  colorModeDark: 'Night',
  settingsColorModeNote: 'Defaults to Auto (follows system appearance). In Night mode, the aquarium decorative lamps automatically light up.',
  settingsAudioHeading: 'Sound Effects & Lo-Fi BGM',
  audioSfxLabel: 'Sound Effects',
  audioBgmLabel: 'Background Music',
  audioTrackHeading: 'BGM Track Selection',
  bgmTrackLofi: 'Coral Lo-Fi',
  bgmTrackTide: 'Deep Sea Tide',
  bgmTrackChiptune: 'Pixel Chiptune',
  audioOn: 'ON',
  audioOff: 'MUTE',
  settingsLangHeading: 'Language / 界面语言',
  settingsTradeHeading: 'Trade hub',
  settingsTradeUnlocked:
    'Unlocked. This build keeps trading out of scope: there is no economy, no server and no market.',
  settingsTradeLocked: (lv) => `Locked until aquarium level ${lv}, mirroring the original's gate.`,
  settingsSaveHeading: 'Save',
  resetBtn: 'Reset progress',
  confirmResetBtn: 'Confirm reset?',
  cancelBtn: 'Cancel',
  resetDoneMsg: 'Progress has been reset with 3 starter fish and 3 starter decorations.',
  settingsSaveNote: 'Progress lives in localStorage on this device only.',
  gradeLabel: (g) => `grade ${g}`,
  badgeReadyTitle: 'Placed in aquarium tank',
  badgePartialTitle: 'In tank / cooling down',
  badgeNoneTitle: 'Not in tank',
  describeAdult: 'adult',
  describeFry: (clock) => `cooldown/fry (${clock} left)`,
  describeFish: (name, starsStr, tierStr, grade, usesStr, stateStr) =>
    `${name} — ${starsStr} ${tierStr}, grade ${grade}, uses ${usesStr}, ${stateStr}.`,
  breedError: (code, extra) => {
    switch (code) {
      case 'no-hearts':
        return extra
          ? `Out of hearts (0/5)! Next heart regenerates in ${extra}.`
          : 'Out of hearts. One regenerates every seven minutes.'
      case 'not-adult':
        return extra
          ? `${extra} is still growing or cooling down.`
          : 'Both parents must finish growing or cooling down first.'
      case 'no-uses':
        return 'One parent has no breeding attempts left.'
      default:
        return extra
          ? `Select 2 different adult fish first (${extra}/2 selected).`
          : 'Pick two different adults from the grid above first.'
    }
  },
  synthError: (code, count, picked) => {
    switch (code) {
      case 'mixed-tier':
        return 'All 10 materials must share the same rarity tier.'
      case 'max-tier':
        return 'Mythic is the ceiling; it cannot be merged upward.'
      case 'starter-material':
        return 'Starter fish cannot be consumed as merge materials.'
      default:
        return picked !== undefined
          ? `Select ${count} fish of the same tier to merge (${picked}/${count} selected).`
          : `Select ${count} fish of the same tier from the grid above first.`
    }
  },
}

export function copy(locale: Locale): Copy {
  return locale === 'zh' ? ZH : EN
}
