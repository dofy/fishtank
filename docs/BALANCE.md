# Balance & Game Data Guide / 游戏帮助与数值说明 (`v1.7.0`)

Keyboard shortcuts were added in `v1.5.0`; see [Keyboard Shortcuts](../README.md#keyboard-shortcuts) or the in-game Help (`H` / `?`). v1.7.0 changes aquarium rendering only; tier and grade rules remain unchanged.

`v1.5.0` 新增键盘快捷键，完整按键见 [README 快捷键说明](../README.md#keyboard-shortcuts)，也可按 `H` / `?` 打开游戏内帮助。v1.7.0 仅调整鱼缸渲染，保留原有星级、品阶与存档规则。

In-game Help opens on the game guide. Dedicated tabs show breeding, levels, tier stats, grade EXP and shortcuts. Breeding rows are grouped by the lower parent tier (`0★` = starter); level rows use level-range pages. All table columns fit without horizontal scrolling, and small screens use a full-screen dialog.

游戏内帮助默认显示游戏说明，其余规则按 Tab 分页。繁育表按双亲中较低的星级分组（`0★` 为初始鱼），等级表按等级段翻页；表格完整显示当前页的所有列，小屏幕使用满屏弹窗。

This document details the gameplay mechanics, progression curves, and breeding probabilities for **Fishtank**, modeled on [PC FISH: Taskbar Aquarium](https://store.steampowered.com/app/4842670/PC_FISH_Taskbar_Aquarium/).

本文档详细说明 **Fishtank** 的核心玩法机制、升级容量曲线与繁育概率矩阵（数值参考 Steam《[PC FISH: Taskbar Aquarium](https://store.steampowered.com/app/4842670/PC_FISH_Taskbar_Aquarium/?l=tchinese)》）。

### v1.7.0：鱼缸渲染 / Aquarium rendering

- The aquarium defaults to PixiJS in both themes. WebGL failures fall back to Canvas; append `?renderer=canvas` to either production domain to use Canvas directly.
- 两种主题默认使用 PixiJS，投喂、受惊、电鳗放电与装饰拖动沿用原操作；WebGL 不可用时自动回退 Canvas。两个域名均保留 `?renderer=canvas` 入口，繁育、合成、成长、经验和收集规则不变。

### v1.6.0：高级电鳗 / Earlier electric eel

- **29 species / 137 grade appearances**: 2 starter species with 1 grade each, plus 27 species with 5 grades. Tier pools contain 7 / 7 / 5 / 5 / 3 species at tiers 1–5.
- **琥珀电鳗 / Amber Electric Eel** (`ambereel`) joins tier 2 alongside its six existing species, each with a conditional probability of `1/7` after rolling tier 2. Existing `volteel` stays tier 3; tier odds, grade weights and save format are unchanged.
- 两种电鳗共享原有彩蛋：30 秒内点击同一条电鳗 6 次立即放电；游动中仍按原有随机概率触发。放电持续 0.85 秒，其他小鱼眩晕 3 秒；随机放电冷却 22–40 秒。夜间改变一盏顶灯颜色，日间不改灯色。极光彩带鳗不参与放电。
- Both electric eels share the existing six-click and spontaneous-discharge behavior. Six clicks within 30 seconds trigger discharge; spontaneous discharges retain the 22–40 second cooldown. Discharge lasts 0.85 seconds and stuns other fish for 3 seconds. One lamp changes color at night; daytime lamp colors stay unchanged. Ribbon eels are not electric.

---

## 1. Core Mechanics / 核心机制参数

| Parameter / 参数 | Value / 数值 | Description / 说明 |
| :--- | :--- | :--- |
| `HEART_COST_PER_BREED` | `1` | 每次繁育消耗 1 颗爱心 / 1 heart consumed per breeding attempt |
| `HEART_MAX` | `5` | 爱心存储上限 5 颗 / Maximum heart capacity |
| `HEART_REGEN_MS` | `7 min` (`420,000 ms`) | 每 7 分钟恢复 1 颗爱心 / ~1 heart every 7 minutes (~8.57/hr) |
| `PARENT_COOLDOWN_MS` | `3 min` (`180,000 ms`) | 初始鱼繁育后的冷却时间 / Starter parent cooldown after breeding |
| `SYNTHESIS_INPUT_COUNT` | `10` | 10 条鱼（1★–4★）合成为 1 条高一星级鱼 / 10 fish merge into 1 higher-tier fish |
| `EAT_COOLDOWN` | `9 sec` | 鱼缸内同一条鱼吃食后的饱腹间隔 / Satiety cooldown per fish after eating a pellet |

---

## 2. Aquarium Level, EXP & Unlocks / 鱼缸等级、经验与解锁表

Breeding awards half of the offspring's EXP immediately and the remaining half when the fry matures into an adult.

每次成功繁育立即获得子代总经验的一半，鱼苗成年时自动结算另一半经验。

The total is rounded after applying the grade multiplier. Birth awards the rounded total divided by two, rounded down; maturation awards the remainder. Synthesized fish receive no birth EXP and award the full total on maturation. Legacy fish without a recorded birth award retain their existing full maturation award because their breeding/synthesis origin is unknown; already earned EXP is unchanged.

先按品阶倍率计算并四舍五入总经验；出生时领取总经验的一半（向下取整），成年时领取剩余部分。合成鱼出生时不领取经验，成年时领取全额。旧存档中未记录出生经验的鱼无法区分繁育或合成来源，保留原有全额成年结算；已经获得的经验不回退。

| Level / 等级 | Cumulative EXP / 累计经验 | EXP Delta / 升级所需 | Fish Cap / 鱼展示上限 | Decor Cap / 装饰摆放上限 | Unlocked Decorations / 解锁装饰品 |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **Lv.1** | `0` | — | `3` | `3` | 翠绿海草 (`kelp`) · 礁石群 (`rocks`) · 珍珠扇贝 (`shell`) · 七彩串灯 (`fairylights`, 顶挂) |
| **Lv.2** | `10` | `+10` | `4` | `4` | 鹿角珊瑚 (`coral`) · 夜光海蕈 (`mushroom`) |
| **Lv.3** | `60` | `+50` | `5` | `5` | 海星礁石 (`starfish`) · 星芒吊灯 (`starlamps`, 顶挂) |
| **Lv.4** | `260` | `+200` | `6` | `6` | 沉木拱枝 (`driftwood`) |
| **Lv.5** | `760` | `+500` | `7` | `7` | 荧光海葵 (`anemone`) · 祭典灯笼 (`lanterns`, 顶挂) |
| **Lv.6** | `1,760` | `+1,000` | `8` | `8` | 海底石拱门 (`arch`) · 紫晶簇洞 (`crystal`) |
| **Lv.7** | `4,760` | `+3,000` | `9` | `9` | 沉船宝箱 (`chest`) · 霓虹水母灯 (`jellylamps`, 顶挂) |
| **Lv.8** | `12,760` | `+8,000` | `10` | `10` | 古老船锚 (`anchor`) |
| **Lv.9** | `27,760` | `+15,000` | `11` | `11` | 海底城堡 (`castle`) |
| **Lv.10** | `57,760` | `+30,000` | `12` | `12` | 深海神像 (`statue`) |

---

## 3. Offspring Tier Probability Matrix / 亲代星级繁育概率表

Percentages for offspring tiers `1★` through `5★` given parent tiers `low + high`:

不同亲代星级组合（`低星 + 高星`）产出 `1★` 至 `5★` 子代的概率分布：

| Parent Pairing / 亲代组合 | 1★ 普通 (Common) | 2★ 高级 (Uncommon) | 3★ 稀有 (Rare) | 4★ 传说 (Legendary) | 5★ 神话 (Mythic) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| `初始 + 初始` (`0+0`) | **100%** | 0% | 0% | 0% | 0% |
| `初始 + 1★` (`0+1`) | **90%** | **10%** | 0% | 0% | 0% |
| `1★ + 1★` / `初始 + 2★` | **76%** | **20%** | **4%** | 0% | 0% |
| `1★ + 2★` / `初始 + 3★` | **48.9%** | **41.6%** | **9.5%** | 0% | 0% |
| `2★ + 2★` / `1★ + 3★` / `初始 + 4★` | **37.7%** | **44.3%** | **15%** | **3%** | 0% |
| `2★ + 3★` / `1★ + 4★` / `初始 + 5★` | 0% | **50.5%** | **43%** | **6.5%** | 0% |
| `3★ + 3★` / `2★ + 4★` / `1★ + 5★` | 0% | **40.5%** | **47.5%** | **10%** | **2%** |
| `3★ + 4★` / `2★ + 5★` | 0% | 0% | **52.1%** | **44.4%** | **3.5%** |
| `4★ + 4★` / `3★ + 5★` | 0% | 0% | **43.7%** | **51.3%** | **5%** |
| `4★ + 5★` (`4+5`) | 0% | 0% | 0% | **70%** | **30%** |
| `5★ + 5★` (`5+5`) | 0% | 0% | 0% | **45%** | **55%** |

The five previously unspecified pairings (`0+2`, `0+3`, `0+4`, `0+5`, `1+5`) follow this project's existing equal-tier-sum pattern. These are project-defined completions, not verified probabilities from the original game. All previously specified probabilities are unchanged.

原先缺失的五组组合（`0+2`、`0+3`、`0+4`、`0+5`、`1+5`）沿用本项目既有的“亲代星级总和相同，概率相同”规律补齐。这是本项目的规则补全，非已核实的原作概率；原有已配置概率保持不变。

### Offspring Species / 子代鱼种

After rolling the offspring tier using the matrix above, select uniformly from **all species in that tier**. A tier with `N` species gives each species a conditional probability of `1/N`, regardless of parent species or discovery history. Repeats remain possible. The former 45% parent-species preference was removed in a same-day update to `v1.4.10`; tier probabilities and grade weights are unchanged.

先按上表抽取子代星级，再从该星级的**全部鱼种中等概率抽取**。同星级有 `N` 种鱼时，每种在该星级内的概率均为 `1/N`，与亲代鱼种、是否已收集无关，仍可能重复。`v1.4.10` 的同日更新移除了原有的 45% 亲代鱼种优先；星级概率和品阶权重保持不变。

---

## 4. Rarity Tiers & Visual Grades / 稀有度星级与品阶属性

### Rarity Tier Base Stats / 星级基础参数

| Tier / 稀有度 | Growth Time / 成长时间 | Base EXP / 基础经验 | Breeding Uses / 可繁育次数 | Species Count / 鱼种数 |
| :--- | :---: | :---: | :---: | :---: |
| **— 初始 (Starter)** | `3 min` (cooldown) | `5 EXP` | `∞` (无限) | 2 (仅品阶 1 / Grade 1 only) |
| **★ 普通 (Common)** | `5 min` | `10 EXP` | `1–5` (均值 5) | 7 (各 5 个品阶变种) |
| **★★ 高级 (Uncommon)** | `7 min` | `40 EXP` | `1–5` (均值 4) | 6 (各 5 个品阶变种) |
| **★★★ 稀有 (Rare)** | `10 min` | `160 EXP` | `1–5` (均值 3) | 5 (各 5 个品阶变种) |
| **★★★★ 传说 (Legendary)** | `15 min` | `640 EXP` | `1–5` (均值 2) | 5 (各 5 个品阶变种) |
| **★★★★★ 神话 (Mythic)** | `20 min` | `2,560 EXP` | `1–5` (均值 2) | 3 (各 5 个品阶变种) |

### Visual Grade (`Grade 1–5`) / 品阶系统

- **EXP Multiplier / 经验倍率**: `1 + 0.25 × (Grade - 1)`
  - `Grade 1`: **1.00x** · `Grade 2`: **1.25x** · `Grade 3`: **1.50x** · `Grade 4`: **1.75x** · `Grade 5`: **2.00x**
- **Breeding Inheritance / 繁育品阶遗传**: Base weights `{ 1: 56, 2: 26, 3: 12, 4: 5, 5: 1 }`, shifted upward by parent average grade (`GRADE_PARENT_BIAS = 0.35`).
- **Synthesis Inheritance / 合成品阶继承**: 10-to-1 synthesis guarantees the output fish inherits the **highest grade (`Math.max`)** among all 10 input fish. Using **1 high-grade + 9 Grade-1 fish** is the optimal strategy.
