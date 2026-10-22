import type { Locale } from '../core/types'
import type { ReforgeError } from '../core/reforge'

export function reforgeCopy(locale: Locale) {
  return locale === 'zh' ? {
    merge: '普通合成', title: '五星重铸', run: '开始重铸',
    heading: (n: number) => `五星重铸（已选 ${n}/3）`,
    rule: '消耗 3 条已成年、繁育次数耗尽且未锁定、未展示的五星鱼，重铸为 1 条五星幼鱼。继承最高品阶，重新获得繁育次数，不消耗爱心。',
    odds: '80% 普通神话 · 20% 隐藏生物。隐藏共 3 款，等概率出现。',
    pity: (n: number) => `连续 ${n}/9 次未发现新隐藏；再重铸 ${10 - n} 次内必得尚未发现的一款。重复隐藏不重置计数。`,
    complete: '三款隐藏生物均已发现；重铸仍有 20% 概率获得隐藏，不再触发新物种保底。',
    empty: '没有可重铸的鱼。先用完五星鱼的繁育次数；缸中或锁定的小鱼会受到保护。',
    error: (error: ReforgeError) => ({ 'wrong-count': '请选择 3 条不同的鱼。', 'not-mythic': '只能重铸五星鱼。', 'has-uses': '请先用完繁育次数。', 'locked-material': '锁定的鱼不能重铸。', 'in-tank': '请先手动收回展示中的鱼。', 'not-adult': '请等待小鱼成年。' })[error],
    storage: '未能保存，重铸已撤回，材料与保底计数保持不变。',
    done: (name: string, novel: boolean) => `${novel ? '发现新生物：' : '重铸获得：'}${name}`,
  } : {
    merge: 'Normal merge', title: 'Mythic reforge', run: 'Reforge',
    heading: (n: number) => `Mythic reforge (${n}/3 selected)`,
    rule: 'Consume 3 adult, exhausted, unlocked Mythic fish outside the tank to create 1 Mythic fry. Inherit the highest grade and roll fresh breeding uses. No hearts required.',
    odds: '80% regular Mythic · 20% secret creature. All 3 secrets have equal chances.',
    pity: (n: number) => `${n}/9 reforges without a new secret. A new secret is guaranteed within ${10 - n} more. Duplicate secrets do not reset this count.`,
    complete: 'All three secrets discovered. The secret chance remains 20%; the new-species guarantee is complete.',
    empty: 'No eligible fish. Exhaust Mythic breeding uses first. Locked fish and fish in the tank are protected.',
    error: (error: ReforgeError) => ({ 'wrong-count': 'Choose 3 different fish.', 'not-mythic': 'Only Mythic fish can be reforged.', 'has-uses': 'Exhaust all breeding uses first.', 'locked-material': 'Locked fish are protected.', 'in-tank': 'Return displayed fish to the backpack first.', 'not-adult': 'Wait for the fish to mature.' })[error],
    storage: 'Save failed. Reforging was rolled back; materials and guarantee progress are unchanged.',
    done: (name: string, novel: boolean) => `${novel ? 'New discovery: ' : 'Reforged: '}${name}`,
  }
}
