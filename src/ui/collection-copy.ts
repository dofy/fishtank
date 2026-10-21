import type { Locale } from '../core/types'

const zh = {
  releasePrompt: (name: string) => `放生「${name}」？小鱼会离开背包，图鉴记录保留。`,
  manage: '管理这条鱼', unlock: '解除锁定',
  locked: '已锁定', lock: '锁定保护', unlocked: '未锁定', lockNote: '锁定后不会被合成、放生或自动推荐配对，仍可展示和手动繁育。',
  lockedCount: (locked: number, total: number) => `已锁定 ${locked}/${total}`,
  autoPairUnavailable: '需要至少两条未锁定、已成年且仍可繁育的鱼才能推荐配对。锁定鱼可手动选择繁育。',
  lockOwned: '全部锁定', allOwnedLocked: '已全部锁定',
  lockOwnedNote: '仅锁定当前持有的个体，新获得的鱼不自动锁定。',
  currentSpecimen: (index: number) => `当前个体 #${index}`,
  appearanceBook: '品阶外观图鉴', appearancePreview: '仅预览外观',
  export: '导出存档', import: '导入存档', restoreBackup: '恢复最近备份', restoreBeforeImport: '恢复导入前进度', saveTitle: '带上你的小鱼',
  saveNote: '导出后可在另一台设备或另一个域名导入。存档只保存在当前浏览器，各域名独立。',
  backupNote: '每隔一段时间保留一份本地备份；导入前会先备份当前进度，可单独恢复；重置会清除本地备份。',
  previewTitle: '先看看这份存档', current: '当前', incoming: '导入后', fish: '条小鱼', species: '种图鉴',
  exportedAt: '记录时间', legacy: '旧版存档', replaceNote: '确认后将替换当前进度，不会合并两份鱼群。当前进度会先备份。',
  confirmImport: '确认替换', cancel: '取消', importing: '正在恢复…',
  importInvalid: '这份文件无法识别，或数据不完整。当前进度没有改变。',
  storageError: '浏览器没能保存进度，请检查存储空间或隐私设置后重试。',
  noBackup: '还没有可恢复的备份，先导出一份吧。', importDone: '小鱼们搬家完成，进度已恢复。',
  exportDone: '存档已导出，请保管好下载的文件。', protectedMaterial: '选中的鱼已锁定，请先解除保护。',
  help: '锁定小鱼可防止合成或放生。换设备前，可以在设置中导出存档，导入时先预览再确认。',
}

type Copy = { [K in keyof typeof zh]: typeof zh[K] }
const en: Copy = {
  releasePrompt: (name: string) => `Release ${name}? This fish will leave your collection. Your Book discoveries will remain.`,
  manage: 'Manage this fish', unlock: 'Unlock fish',
  locked: 'Locked', lock: 'Protect fish', unlocked: 'Unlocked', lockNote: 'Locked fish are excluded from merging, release and Best Pair. They can still be displayed and bred manually.',
  lockedCount: (locked: number, total: number) => `Locked ${locked}/${total}`,
  autoPairUnavailable: 'Best Pair needs two unlocked, ready adults with breeding uses left. Locked fish can be selected manually.',
  lockOwned: 'Lock all held', allOwnedLocked: 'All held locked',
  lockOwnedNote: 'Protects fish currently held. New arrivals are not locked automatically.',
  currentSpecimen: (index: number) => `Selected fish #${index}`,
  appearanceBook: 'Grade appearances', appearancePreview: 'Appearance preview only',
  export: 'Export save', import: 'Import save', restoreBackup: 'Restore backup', restoreBeforeImport: 'Before last import', saveTitle: 'Take your fish with you',
  saveNote: 'Export to move to another device or domain. Progress is stored in this browser, separately for each domain.',
  backupNote: 'A recent local backup is kept periodically. You can restore the progress before your last import separately. Resetting clears local backups.',
  previewTitle: 'Preview this save', current: 'Current', incoming: 'After import', fish: 'fish', species: 'species found',
  exportedAt: 'Recorded', legacy: 'Legacy save', replaceNote: 'Confirming replaces your progress; the two collections will not be merged. Your current progress is backed up first.',
  confirmImport: 'Replace progress', cancel: 'Cancel', importing: 'Restoring…',
  importInvalid: 'This file is unrecognized or incomplete. Your current progress has not changed.',
  storageError: 'The browser could not save your progress. Check storage space or privacy settings and try again.',
  noBackup: 'No backup is available yet. Export a save to keep a copy.', importDone: 'Your fish have moved in. Progress restored.',
  exportDone: 'Save exported. Keep the downloaded file somewhere safe.', protectedMaterial: 'A selected fish is locked. Remove its protection first.',
  help: 'Lock fish to protect them from merging or release. Export a save in Settings before changing devices; imports show a preview before you confirm.',
}

export function collectionCopy(locale: Locale): Copy { return locale === 'zh' ? zh : en }
