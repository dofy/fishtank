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
  ambereel: '琥珀电鳗',
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
  lanternangler: '幽灯鮟鱇',
  glassangel: '琉璃海天使',
  starnautilus: '星轮鹦鹉螺',
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
  helpBtn: string
  changelogBtn: string
  changelogClose: string
  changelogVersions: string
  changelogCurrent: string
  changelogUnreleased: string
  changelogSources: string
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
  releaseBtn: string
  confirmReleaseBtn: string
  placedMsg: (name: string, placed: number, cap: number) => string
  removedFromTankMsg: (name: string, placed: number, cap: number) => string
  tankDisplayFullMsg: (cap: number) => string
  releasedMsg: (name: string) => string
  tankNoteTitle: string
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
  breedNoteTitle: string
  breedNote: string
  pairingCol: string
  breedBtn: string
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
  mergeBtn: string
  mergedMsg: (name: string, starsStr: string, tierStr: string) => string
  mergeNoteTitle: string
  mergeNote: string
  decorHeading: (placed: number, cap: number, unlocked: number, total: number) => string
  decorPlacedTag: string
  decorUnlockAt: (lv: number) => string
  decorUnlockedAt: (lv: number) => string
  decorFlipBtn: string
  decorPlacedMsg: (name: string, placed: number, cap: number) => string
  decorRemovedMsg: (name: string, placed: number, cap: number) => string
  decorFullMsg: (cap: number) => string
  decorFlippedMsg: (name: string) => string
  decorLockedMsg: (name: string, lv: number) => string
  decorNoteTitle: string
  decorNote: string
  bookHeading: string
  bookOwnedBadge: (count: number) => string
  bookCompletion: (pct: string) => string
  bookVariantsTitle: string
  bookSpecimensTitle: (count: number) => string
  bookNoSpecimens: string
  bookPlaceAction: string
  bookStoreAction: string
  bookVariantRate: (unlocked: number, total: number, pct: number) => string
  bookLockedMsg: (tierStr: string) => string
  bookNoteTitle: string
  bookNote: string
  settingsThemeHeading: string
  reminderHeading: string
  reminderEnable: string
  reminderDisable: string
  reminderNote: string
  reminderStatus: Record<'enabled' | 'disabled' | 'denied' | 'unsupported' | 'error', string>
  shortcutsTitle: string
  shortcutsTabsLabel: string
  shortcutsActionsLabel: string
  shortcutsImmersive: string
  shortcutsMode: string
  shortcutsBgm: string
  shortcutsSfx: string
  shortcutsLocale: string
  shortcutsAutoPick: string
  shortcutsClear: string
  shortcutsRun: string
  shortcutsEnter: string
  shortcutsEscape: string
  shortcutsNote: string
  shortcutsCloseHelp: string
  shortcutsHelpContents: string
  settingsThemeNote: string
  settingsColorModeHeading: string
  colorModeAuto: string
  colorModeLight: string
  colorModeDark: string
  settingsColorModeNote: string
  settingsRailLightsHeading: string
  railLightsAnimated: string
  railLightsFrequency: string
  railLightsRate: (frequency: number) => string
  railLightsNote: string
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
  openHelpBtn: string
  settingsSaveHeading: string
  resetBtn: string
  confirmResetBtn: string
  cancelBtn: string
  resetDoneMsg: string
  settingsSaveNote: string
  gradeLabel: (grade: number) => string
  badgeReadyTitle: string
  badgePartialTitle: string
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
  helpModalTitle: string
  helpTabs: Record<'guide' | 'matrix' | 'levels' | 'tiers' | 'grades' | 'shortcuts', string>
  helpParentTierPicker: string
  helpMatrixNote: string
  helpIntroTitle: string
  helpIntroLead: string
  helpIntroItems: { title: string; text: string }[]
  helpMatrixTitle: string
  helpLevelTitle: string
  helpLevelColLv: string
  helpLevelColExp: string
  helpLevelColCap: string
  helpLevelColDecor: string
  helpTierTitle: string
  helpTierColTier: string
  helpTierColGrowth: string
  helpTierColExp: string
  helpTierColUses: string
  helpTierAverage: string
  helpGradeTitle: string
  helpGradeNote: string
}

const ZH: Copy = {
  hudLevel: '等级',
  hudMax: ' (满级)',
  hudExp: '经验',
  hudTank: '鱼缸展示',
  hudBag: '背包持有',
  hudHearts: '繁育',
  hudNextHeart: '恢复',
  hudFull: '已满',
  hudSpecies: '图鉴',
  helpBtn: '帮助',
  changelogBtn: '更新日志',
  changelogClose: '关闭更新日志',
  changelogVersions: '翻翻各个版本',
  changelogCurrent: '当前版本',
  changelogUnreleased: '待发布',
  changelogSources: '查看版本记录',
  immersiveBtn: '沉浸',
  exitImmersiveBtn: '返回',
  langToggle: 'EN',
  tabs: {
    tank: '鱼缸',
    breed: '繁育',
    merge: '合成',
    decor: '装饰',
    book: '图鉴',
    settings: '设置',
  },
  tankHeading: (placed, cap, total) =>
    `我的鱼群（鱼缸展示 ${placed}/${cap} · 背包共 ${total} 条）`,
  releaseBtn: '放生',
  confirmReleaseBtn: '确认放生',
  placedMsg: (name, placed, cap) => `已将 ${name} 放入鱼缸展示（${placed}/${cap}）。`,
  removedFromTankMsg: (name, placed, cap) => `已将 ${name} 收回背包（鱼缸 ${placed}/${cap}）。`,
  tankDisplayFullMsg: (cap) =>
    `当前鱼缸展示槽位已满（上限 ${cap} 条）。可先将其他鱼“收回背包”，或通过繁育提升鱼缸等级扩大容量（不影响继续繁育）。`,
  releasedMsg: (name) => `已放生 ${name}。`,
  tankNoteTitle: '鱼缸与互动指南',
  tankNote:
    '【鱼群管理】点鱼图可展示或收回，右上角 ⓘ 可锁定保护或确认放生。开局赠送 **3 条 ∞ 无限繁育次数** 的初始鱼。【水域互动】点击上方空白水域可投放鱼食，点击游动的鱼会让它受惊冲刺，按住已摆放的造景可直接左右拖拽调整位置！',
  breedHeading: (picked) => `选择两条成年鱼进行繁育（已选 ${picked}/2）`,
  sortLabel: '排序：',
  sortInTank: '鱼缸优先',
  sortTier: '星级优先',
  sortGrade: '品阶优先',
  sortUses: '次数优先',
  sortAcquired: '取得顺序',
  breedAutoPickBtn: '推荐配对',
  breedNotEnoughAdults: '需要至少两条可繁育的成年鱼。冷却或成长中的鱼请等待倒计时结束。',
  breedNoteTitle: '繁育规则与遗传说明',
  breedNote:
    '【爱心消耗】每次繁育消耗 **1 颗爱心**（每 **7 分钟** 恢复 1 颗，上限 5 颗）。【星级与品阶】双亲星级组合决定子代 **1★–5★** 产出概率，双亲品阶越高越易孵化出高品阶后代（最高 **2.0x EXP**）。【鱼种抽取】确定星级后，从该星级的全部鱼种中**等概率抽取**，不偏向亲代鱼种，仍可能遇到老朋友。【次数与经验】初始鱼拥有 **∞ 无限次数**（冷却 3 分钟），子代鱼拥有 **1–5 次** 繁育次数；孵化与成年时各获得一半经验。',
  pairingCol: '亲代组合',
  breedBtn: '开始繁育',
  clearBtn: '清空选择',
  hatchedMsg: (name, starsStr, tierStr, grade, expGained, novel) =>
    `孵化出 ${name}（${starsStr} ${tierStr} · 品阶 ${grade}），获得 +${expGained} EXP！${novel ? ' 解锁新图鉴！' : ''}`,
  showcaseTitle: '繁育成功',
  showcaseMergeTitle: '合成成功',
  breedingAnimTitle: '亲代配对孵化中…',
  mergingAnimTitle: '10 合 1 聚变合成中…',
  showcaseNewBadge: 'NEW',
  showcaseUsesLabel: (usesStr) => `可繁育次数 ${usesStr}`,
  showcaseDecorLabel: (dName) => `造景：${dName}`,
  showcaseCloseBtn: '收下小鱼',
  mergeHeading: (count, picked) => `选择 ${count} 条鱼进行合成（已选 ${picked}/${count}）`,
  mergeCondTitle: '筛选与自动选择条件',
  mergeFilterZeroUses: '只显示/选择剩余繁育次数为 0 的鱼',
  mergeFilterExcludeTank: '排除已放置于鱼缸中的鱼',
  mergeTierTitle: '鱼种稀有度条件',
  mergeAutoPickBtn: '自动选材',
  mergeEmptyByFilter: '当前筛选条件下没有符合要求的鱼（可取消勾选“只显示剩余繁育次数为 0”或勾选更多稀有度）。',
  mergeAutoPickedMsg: (picked, total) =>
    picked >= total
      ? `已按筛选条件自动选中 ${picked}/${total} 条材料鱼。`
      : picked > 0
        ? `当前符合条件的材料鱼共 ${picked}/${total} 条，还差 ${total - picked} 条才能合成。`
        : '当前筛选条件下没有可自动选择的鱼。',
  mergeAlreadyFullMsg: (total) => `已选满 ${total} 条材料鱼，可直接点击“开始合成”或先取消已选鱼。`,
  mergeNothingToClearMsg: '当前没有已选中的合成材料鱼。',
  mergeBtn: '开始合成',
  mergedMsg: (name, starsStr, tierStr) => `合成成功：获得 ${name}（${starsStr} ${tierStr}）！`,
  mergeNoteTitle: '10 合 1 聚变合成技巧',
  mergeNote:
    '【升星规则】消耗 **10 条 1★–4★** 材料鱼可合成为 **1 条高一星级** 的新鱼（10 条同星级时 **100% 升入下一星级**，混搭星级按投入比例决定概率）。【品阶继承】新鱼 **100% 继承 10 条材料中的最高品阶**，采用 **「1 高品阶 + 9 低品阶」** 搭配并优先消耗繁育次数为 **0/n** 的鱼最为划算！',
  decorHeading: (placed, cap, unlocked, total) =>
    `鱼缸装饰品（已摆放 ${placed}/${cap} 件 · 已解锁 ${unlocked}/${total}）`,
  decorPlacedTag: '已摆放',
  decorUnlockAt: (lv) => `Lv.${lv} 解锁`,
  decorUnlockedAt: (lv) => `Lv.${lv} 奖励`,
  decorFlipBtn: '左右翻转',
  decorPlacedMsg: (name, placed, cap) =>
    `已摆放「${name}」（${placed}/${cap}），可在上方鱼缸内直接按住左右拖拽调整位置！`,
  decorRemovedMsg: (name, placed, cap) => `已从鱼缸收起「${name}」（已摆放 ${placed}/${cap}）。`,
  decorFullMsg: (cap) =>
    `当前鱼缸装饰槽位已满（上限 ${cap} 件）。请先收起一件已摆放的装饰，或提升鱼缸等级扩大装饰容量！`,
  decorFlippedMsg: (name) => `已翻转「${name}」的朝向。`,
  decorLockedMsg: (name, lv) => `「${name}」尚未解锁，需鱼缸等级达到 Lv.${lv}。`,
  decorNoteTitle: '造景摆放与夜晚灯光联动',
  decorNote:
    '【等级解锁】随鱼缸等级提升（**Lv.1–Lv.10**），可同时摆放槽位从 **3 件扩展至 12 件**，逐步解锁全部 **18 件海底造景与顶挂彩灯**。【自由布置】在上方鱼缸中直接按住造景即可左右拖动位置（最后拖动的装饰自动置于最前层），黑夜模式下顶灯与挂灯会自动点亮。',
  bookHeading: '收藏',
  bookOwnedBadge: (count) => `持有 x${count}`,
  bookCompletion: (pct) => `品阶收集 ${pct}%`,
  bookVariantsTitle: '品阶变种图鉴（点击切换预览）',
  bookSpecimensTitle: (count) => `当前持有个体：x${count}`,
  bookNoSpecimens: '当前背包中暂无该鱼种个体（可通过繁育或合成再次获得）。',
  bookPlaceAction: '放置',
  bookStoreAction: '收回',
  bookVariantRate: (u, t, pct) => `变种发现率：${pct}% (${u}/${t})`,
  bookLockedMsg: (tierStr) => `该鱼种（${tierStr}）尚未解锁，可通过繁育或合成发现新品种！`,
  bookNoteTitle: '生物图鉴与品阶变种收集',
  bookNote:
    '【全图鉴收集】共收录 **29 种海洋生物**（初始鱼 1 种品阶，1★–5★ 鱼种各含 **5 种品阶色相变种**）。【详情与快捷操作】点击任意已解锁的鱼种卡片可展开详情面板，自由切换预览已点亮的品阶外观、查看当前持有个体，或一键放入鱼缸、跳转繁育与合成。',
  settingsThemeHeading: '画面风格（支持素材替换）',
  reminderHeading: '繁育满心提醒',
  reminderEnable: '开启提醒',
  reminderDisable: '关闭提醒',
  reminderNote: '每次恢复到 5 颗爱心时通知一次。请保持应用打开，后台被系统冻结时可能延迟，完全退出后无法保证提醒。提醒设置仅保存在当前浏览器，不随存档导出。',
  reminderStatus: { enabled: '已开启系统通知', disabled: '尚未开启；点击开启后允许系统通知。', denied: '通知权限已被阻止，请在浏览器或系统的网站通知设置中允许。', unsupported: '当前浏览器或访问方式不支持系统通知，请使用 HTTPS 或已安装的应用。', error: '提醒未能启用或发送，请检查网站存储和通知权限后重试。' },
  shortcutsTitle: '⌨️ 键盘快捷键',
  shortcutsTabsLabel: '页面切换',
  shortcutsActionsLabel: '常用操作',
  shortcutsImmersive: '进入 / 退出沉浸模式',
  shortcutsMode: '切换自动 → 日间 → 黑夜',
  shortcutsBgm: '开关背景音乐',
  shortcutsSfx: '开关操作音效',
  shortcutsLocale: '切换中英文',
  shortcutsAutoPick: '繁育页推荐配对 / 合成页自动选材',
  shortcutsClear: '清空繁育 / 合成选择',
  shortcutsRun: '执行已就绪的繁育 / 合成，或收下已展示的小鱼',
  shortcutsEnter: '操作当前聚焦控件；无控件焦点时执行就绪动作或收下小鱼',
  shortcutsEscape: '关闭 / 取消 / 返回 / 退出沉浸',
  shortcutsNote: '直接按单键即可，切换 Tab 会退出沉浸。输入框、滑条、下拉菜单和输入法组字时暂停快捷键，弹窗内暂停后台操作；鼠标选鱼后按 R 可直接繁育；聚焦按钮时 Enter 保留原有操作。长按不会重复触发快捷键，Ctrl / Cmd / Alt 组合键保留浏览器功能。',
  shortcutsCloseHelp: '关闭帮助',
  shortcutsHelpContents: '帮助内容',
  settingsThemeNote:
    '每个主题位于 public/themes/<主题名>/ 目录下，包含配色清单与渲染器配置；将 <speciesId>.png 或 decor-<id>.png 放入对应 sprites/ 目录即可直接替换鱼类或装饰品外观，无需修改代码。',
  settingsColorModeHeading: '颜色模式（昼夜与鱼缸装饰灯）',
  colorModeAuto: '自动',
  colorModeLight: '日间',
  colorModeDark: '黑夜',
  settingsColorModeNote: '默认“自动”跟随系统深浅色模式。处于黑夜模式时，鱼缸顶部的装饰灯会自动点亮并投射氛围光束。',
  settingsRailLightsHeading: '横梁小彩灯',
  railLightsAnimated: '滚动闪烁',
  railLightsFrequency: '闪烁频率',
  railLightsRate: (frequency) => `${frequency.toFixed(1)} 次/秒`,
  railLightsNote: '只在夜间点亮，白天自动熄灭。关闭滚动闪烁后保持常亮；跟随系统“减少动态效果”设置时，也会静静亮着。LCD 主题显示单色灯珠。',
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
  openHelpBtn: '查看游戏指南与数值表',
  settingsSaveHeading: '存档管理',
  resetBtn: '重置存档进度',
  confirmResetBtn: '确认清空并重开？',
  cancelBtn: '取消',
  resetDoneMsg: '存档已重置，已发放 3 条初始种鱼与 3 件初始装饰品。',
  settingsSaveNote: '游戏进度自动保存在当前浏览器的 localStorage 中，支持离线成长与爱心恢复结算。',
  gradeLabel: (g) => `品阶 ${g}`,
  badgeReadyTitle: '已放入鱼缸展示',
  badgePartialTitle: '鱼缸中 / 冷却中',
  describeAdult: '已成年',
  describeFry: (clock) => `成长/冷却中（剩余 ${clock}）`,
  describeFish: (name, starsStr, tierStr, grade, usesStr, stateStr) =>
    `${name} — ${starsStr} ${tierStr}，品阶 ${grade}，繁育次数 ${usesStr}，${stateStr}。`,
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
        return '所选亲代中有繁育次数已耗尽的鱼。'
      default:
        return extra
          ? `请先选择两条不同的成年鱼进行配对（当前已选 ${extra}/2）。`
          : '请先点击上方卡片选择两条不同的成年鱼。'
    }
  },
  synthError: (code, count, picked) => {
    switch (code) {
      case 'max-tier':
        return '神话（5★）已是最高星级，无法继续向上合成。'
      case 'starter-material':
        return '初始鱼不能作为合成材料消耗。'
      default:
        return picked !== undefined
          ? `合成需要选满 ${count} 条材料鱼（当前已选 ${picked}/${count}）。`
          : `请先点击上方卡片选择满 ${count} 条材料鱼。`
    }
  },
  helpModalTitle: '游戏帮助与数据说明',
  helpTabs: { guide: '游戏说明', matrix: '繁育概率', levels: '等级解锁', tiers: '星级属性', grades: '品阶经验', shortcuts: '快捷键' },
  helpParentTierPicker: '选择双亲中较低的星级',
  helpMatrixNote: '先选双亲中较低的星级，再查看配对概率。0★ 表示初始鱼；双亲顺序不影响结果。',
  helpIntroTitle: '从第一缸小鱼开始',
  helpIntroLead: '不用赶进度。和三条初始鱼打个招呼，认识新伙伴，再把鱼缸慢慢布置成自己喜欢的样子。',
  helpIntroItems: [
    { title: '🐠 先和小鱼玩一会儿', text: '开局有 3 条可无限繁育（∞）的初始鱼。点空白水域投喂，点一下游动的小鱼，看看它会往哪儿跑。' },
    { title: '💕 用爱心认识新伙伴', text: '选两条已成年、冷却结束且还有繁育次数的鱼配对，每次消耗 1 颗爱心。爱心每 7 分钟恢复 1 颗，最多存 5 颗；挑高品阶亲代，更容易得到高品阶小鱼。' },
    { title: '📖 慢慢点亮你的图鉴', text: '繁育能得到 1★–5★ 小鱼，星级概率受双亲星级影响；抽中星级后，每个鱼种的机会相同。收集过的品阶外观会留在图鉴里，放生或合成也不会抹掉记录。' },
    { title: '✨ 重复的小鱼，也能往上走', text: '10 条同星级（1★–4★）的小鱼能稳稳升一星，并继承材料中的最高品阶。优先用繁育次数耗尽的鱼，搭配 1 条高品阶和 9 条低品阶更划算。' },
    { title: '🪸 布置一片喜欢的小海底', text: '升级会解锁 18 件造景和灯饰，装饰槽位从 3 个增加到 12 个。放入鱼缸后按住就能左右拖动；到了夜晚，顶灯和彩灯会自动亮起。' },
  ],
  helpMatrixTitle: '亲代星级与子代概率',
  helpLevelTitle: '鱼缸等级、经验与容量解锁',
  helpLevelColLv: '等级',
  helpLevelColExp: '累计经验 (EXP)',
  helpLevelColCap: '鱼 / 装饰上限',
  helpLevelColDecor: '解锁装饰',
  helpTierTitle: '稀有度星级基础属性',
  helpTierColTier: '稀有度星级',
  helpTierColGrowth: '成长/冷却时间',
  helpTierColExp: '基础总经验',
  helpTierColUses: '可繁育次数',
  helpTierAverage: '均值',
  helpGradeTitle: '品阶与经验结算',
  helpGradeNote:
    '品阶经验倍率：品阶 1 (1.0x) · 品阶 2 (1.25x) · 品阶 3 (1.5x) · 品阶 4 (1.75x) · 品阶 5 (2.0x)。每次繁育立即结算一半经验，鱼苗成年时结算另一半。',
}

const EN: Copy = {
  hudLevel: 'Level',
  hudMax: ' (max)',
  hudExp: 'EXP',
  hudTank: 'Tank',
  hudBag: 'Owned',
  hudHearts: 'Breed',
  hudNextHeart: 'Next heart',
  hudFull: 'full',
  hudSpecies: 'Species',
  helpBtn: 'Help',
  changelogBtn: 'Changelog',
  changelogClose: 'Close changelog',
  changelogVersions: 'Browse versions',
  changelogCurrent: 'Current version',
  changelogUnreleased: 'Unreleased',
  changelogSources: 'Release links',
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
  releaseBtn: 'Release',
  confirmReleaseBtn: 'Release fish',
  placedMsg: (name, placed, cap) => `Placed ${name} in the tank (${placed}/${cap}).`,
  removedFromTankMsg: (name, placed, cap) => `Removed ${name} from the tank (${placed}/${cap}).`,
  tankDisplayFullMsg: (cap) =>
    `Tank display is full (${cap}/${cap} slots). Store a fish first or level up your aquarium to unlock more display slots.`,
  releasedMsg: (name) => `Released ${name}.`,
  tankNoteTitle: 'Tank & Interaction Guide',
  tankNote:
    '【Manage Fish】Click a fish to place or store it. Open ⓘ to lock or confirm releasing it. You start with **3 ∞ infinite-use** starter fish. 【Tank Interactions】Click empty water to drop food pellets, click a swimming fish to startle it, or drag placed ornaments directly inside the tank!',
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
  breedNoteTitle: 'Breeding & Genetics Guide',
  breedNote:
    '【Heart Cost】Each breeding attempt costs **1 Heart** (regenerates 1 every **7 min**, cap 5). 【Rarity & Grade】Parent star tiers determine **1★–5★** offspring odds, while higher parent grades boost high-grade offspring odds (up to **2.0x EXP**). 【Species】Once the tier is rolled, **every species in that tier has an equal chance**, with no parent-species preference. Familiar fish can still appear. 【Uses & EXP】Starter fish have **∞ infinite uses** (3m cooldown) and bred fish have **1–5 uses**; half EXP is awarded on hatching and half on maturation.',
  pairingCol: 'Pairing',
  breedBtn: 'Breed',
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
  mergeAutoPickBtn: 'Auto-select',
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
  mergeBtn: 'Merge',
  mergedMsg: (name, starsStr, tierStr) => `Merged into ${name}, ${starsStr} ${tierStr}.`,
  mergeNoteTitle: '10-to-1 Synthesis Tips',
  mergeNote:
    '【Tier Upgrade】Combine **10 material fish (1★–4★)** into **1 higher-tier fish** (10 same-tier fish guarantee **100% +1 tier**; mixed tiers roll proportionally). 【Grade Inheritance】The synthesized fish **100% inherits the highest grade** among all 10 inputs — using **"1 high-grade + 9 low-grade"** and spending **0/n exhausted fish** is optimal!',
  decorHeading: (placed, cap, unlocked, total) =>
    `Aquarium Decorations (${placed}/${cap} placed · ${unlocked}/${total} unlocked)`,
  decorPlacedTag: 'Placed',
  decorUnlockAt: (lv) => `Unlocks Lv.${lv}`,
  decorUnlockedAt: (lv) => `Lv.${lv} Reward`,
  decorFlipBtn: 'Flip',
  decorPlacedMsg: (name, placed, cap) =>
    `Placed "${name}" (${placed}/${cap}). Drag it left or right directly inside the tank!`,
  decorRemovedMsg: (name, placed, cap) => `Stored "${name}" (${placed}/${cap} placed).`,
  decorFullMsg: (cap) =>
    `Decoration slots are full (${cap}/${cap} max for your current level). Store a placed decoration first or level up your aquarium!`,
  decorFlippedMsg: (name) => `Flipped "${name}".`,
  decorLockedMsg: (name, lv) => `"${name}" is locked until your aquarium reaches Level ${lv}.`,
  decorNoteTitle: 'Aquascaping & Night Lighting',
  decorNote:
    '【Level Unlocks】Leveling your aquarium (**Lv.1–Lv.10**) expands placement slots from **3 up to 12** and unlocks all **18 asymmetric floor ornaments & hanging lights**. 【Free Dragging】Drag any placed decoration directly inside the tank (last dragged item rises to the front layer); lights glow automatically in Night mode!',
  bookHeading: 'Collection',
  bookOwnedBadge: (count) => `Owned x${count}`,
  bookCompletion: (pct) => `Grade variants ${pct}%`,
  bookVariantsTitle: 'Grade Variants (Click to preview)',
  bookSpecimensTitle: (count) => `Owned Specimens: x${count}`,
  bookNoSpecimens: 'No specimens of this species currently in your inventory (breed or merge to obtain another).',
  bookPlaceAction: 'Place',
  bookStoreAction: 'Store',
  bookVariantRate: (u, t, pct) => `Variant Discovery: ${pct}% (${u}/${t})`,
  bookLockedMsg: (tierStr) => `Undiscovered ${tierStr} species. Breed or merge fish to unlock it!`,
  bookNoteTitle: 'Encyclopedia & Grade Variants',
  bookNote:
    '【Full Collection】Features **29 marine species** (1 grade for starter fish and **5 color-grade variants** for each 1★–5★ species). 【Inspector & Actions】Click any discovered species card to open the detail inspector, preview unlocked grade variants, inspect owned specimens, or jump straight to Breed & Merge.',
  settingsThemeHeading: 'Art theme',
  reminderHeading: 'Full hearts reminder',
  reminderEnable: 'Enable reminder',
  reminderDisable: 'Disable reminder',
  reminderNote: 'Notify once each time all 5 hearts are restored. Keep the app open; background suspension may delay reminders, and delivery after closing is not guaranteed. This browser-only preference is not included in save exports.',
  reminderStatus: { enabled: 'System notifications enabled', disabled: 'Not enabled. Enable the reminder and allow notifications.', denied: 'Notifications are blocked. Allow them in your browser or system website notification settings.', unsupported: 'Notifications are unavailable here. Use HTTPS or the installed app in a supported browser.', error: 'The reminder could not be enabled or delivered. Check site storage and notification permissions, then retry.' },
  shortcutsTitle: '⌨️ Keyboard shortcuts',
  shortcutsTabsLabel: 'Page navigation',
  shortcutsActionsLabel: 'Common actions',
  shortcutsImmersive: 'Enter / leave immersive mode',
  shortcutsMode: 'Cycle Auto → Day → Night',
  shortcutsBgm: 'Toggle background music',
  shortcutsSfx: 'Toggle sound effects',
  shortcutsLocale: 'Switch Chinese / English',
  shortcutsAutoPick: 'Best Pair on Breed / auto-select materials on Merge',
  shortcutsClear: 'Clear breeding / merge selection',
  shortcutsRun: 'Run ready breeding / merge, or collect a revealed fish',
  shortcutsEnter: 'Activate the focused control; otherwise run a ready action or collect a result',
  shortcutsEscape: 'Close / cancel / back / exit immersive',
  shortcutsNote: 'Use single keys. Switching tabs leaves immersive mode. Shortcuts pause in inputs, sliders, selects and during IME composition; overlays block background actions. Press R after selecting fish with the mouse to breed. Enter on a focused button keeps its normal action. Held keys do not repeat shortcuts. Ctrl / Cmd / Alt combinations keep their browser behavior.',
  shortcutsCloseHelp: 'Close help',
  shortcutsHelpContents: 'Help contents',
  settingsThemeNote:
    'A theme is a folder under public/themes/. Its manifest supplies the palette, the renderer and an optional sprites/ directory; dropping <speciesId>.png or decor-<id>.png in there replaces that art everywhere with no code change.',
  settingsColorModeHeading: 'Color Mode & Aquarium Lamps',
  colorModeAuto: 'Auto',
  colorModeLight: 'Day',
  colorModeDark: 'Night',
  settingsColorModeNote: 'Defaults to Auto (follows system appearance). In Night mode, the aquarium decorative lamps automatically light up.',
  settingsRailLightsHeading: 'Little rail lights',
  railLightsAnimated: 'Chasing lights',
  railLightsFrequency: 'Blink frequency',
  railLightsRate: (frequency) => `${frequency.toFixed(1)} cycles/s`,
  railLightsNote: 'Light up only at night and switch off during the day. Turn chasing off for a steady glow. Reduced motion also keeps them steady. The LCD theme uses monochrome beads.',
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
  openHelpBtn: 'Open Help & Balance Tables',
  settingsSaveHeading: 'Save',
  resetBtn: 'Reset progress',
  confirmResetBtn: 'Confirm reset?',
  cancelBtn: 'Cancel',
  resetDoneMsg: 'Progress has been reset with 3 starter fish and 3 starter decorations.',
  settingsSaveNote: 'Progress is saved automatically in your browser localStorage, including offline growth and heart recovery.',
  gradeLabel: (g) => `grade ${g}`,
  badgeReadyTitle: 'Placed in aquarium tank',
  badgePartialTitle: 'In tank / cooling down',
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
      case 'max-tier':
        return 'Mythic is the ceiling; it cannot be merged upward.'
      case 'starter-material':
        return 'Starter fish cannot be consumed as merge materials.'
      default:
        return picked !== undefined
          ? `Select ${count} material fish to merge (${picked}/${count} selected).`
          : `Select ${count} material fish from the grid above first.`
    }
  },
  helpModalTitle: 'Game help & data',
  helpTabs: { guide: 'Game guide', matrix: 'Breeding', levels: 'Levels', tiers: 'Tier stats', grades: 'Grade EXP', shortcuts: 'Shortcuts' },
  helpParentTierPicker: 'Choose the lower parent tier',
  helpMatrixNote: 'Choose the lower parent tier to see its pairings. 0★ means a starter fish; parent order does not affect the odds.',
  helpIntroTitle: 'Start with your first fish',
  helpIntroLead: 'Take your time. Meet your three starter fish, discover new companions, and make this little aquarium your own.',
  helpIntroItems: [
    { title: '🐠 Spend a moment with your fish', text: 'Your 3 starter fish have unlimited breeding uses (∞). Click empty water to feed them, or tap a swimming fish and watch it dart away.' },
    { title: '💕 Meet new companions', text: 'Pair two adults with breeding uses left and no active cooldown. Each attempt costs 1 Heart; one returns every 7 minutes, up to 5. Higher-grade parents improve the odds of higher-grade offspring.' },
    { title: '📖 Fill your collection, little by little', text: 'Breeding can produce 1★–5★ fish. Parent tiers set the tier odds; every species within the rolled tier has the same chance. Discovered grade appearances stay in your Book, even after a fish is released or merged.' },
    { title: '✨ Give duplicates a new purpose', text: 'Merge 10 fish of the same tier (1★–4★) to guarantee a fish one tier higher, keeping the best material grade. Start with fish that have no uses left; one high-grade fish plus nine low-grade fish makes the most of your collection.' },
    { title: '🪸 Make a little reef of your own', text: 'Level up to unlock 18 decorations and lights, with placement slots growing from 3 to 12. Hold a placed ornament to drag it sideways. Overhead and decorative lights turn on at night.' },
  ],
  helpMatrixTitle: 'Parent tiers & offspring odds',
  helpLevelTitle: 'Aquarium Levels, EXP & Tank Capacity',
  helpLevelColLv: 'Level',
  helpLevelColExp: 'Total EXP',
  helpLevelColCap: 'Fish / decor',
  helpLevelColDecor: 'Unlocked Decorations',
  helpTierTitle: 'Rarity Tier Stats (Growth, EXP & Uses)',
  helpTierColTier: 'Rarity Tier',
  helpTierColGrowth: 'Growth / Cooldown',
  helpTierColExp: 'Base EXP',
  helpTierColUses: 'Breed uses',
  helpTierAverage: 'avg',
  helpGradeTitle: 'Grades & EXP awards',
  helpGradeNote:
    'Grade EXP Multiplier: Grade 1 (1.0x) · Grade 2 (1.25x) · Grade 3 (1.5x) · Grade 4 (1.75x) · Grade 5 (2.0x). Half EXP is awarded immediately on breeding, and the other half upon maturation.',
}

export function copy(locale: Locale): Copy {
  return locale === 'zh' ? ZH : EN
}
