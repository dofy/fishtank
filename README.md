<div align="center">

<img src="public/favicon.svg" width="96" height="96" alt="Fishtank Logo" />

# Fishtank · 桌面放置水族箱

**在浏览器或桌面上养一缸安静游动的深海小鱼。**  
*A cozy idle aquarium for your browser and desktop — raise, breed, merge, and collect 29 marine creatures.*

[![Live Demo](https://img.shields.io/badge/🌊_立即游玩_/_Play_Now-fishtank.phpz.org-0284c7?style=for-the-badge)](https://fishtank.phpz.org)
[![PWA Ready](https://img.shields.io/badge/PWA-支持安装到桌面_/_离线游玩-10b981?style=for-the-badge)](https://fishtank.phpz.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](LICENSE)

</div>

---

## 预览 / Preview

<div align="center">
  <img src="docs/screenshots/preview.png" width="920" alt="Fishtank Dark & Light Mode Preview" />
</div>

### PixiJS 鱼缸与开发对照

从 v1.7.0 起，普通入口默认使用 **PixiJS** 渲染写实与 LCD 鱼缸；保留鱼体游动、原生背景与造景、水下光纹及原有玩法。WebGL 不可用时自动显示 Canvas；也可通过 `?renderer=canvas` 手动使用旧渲染器。两个线上入口均保留：[fishtank.phpz.org](https://fishtank.phpz.org/) 与 [fish.yahaha.net](https://fish.yahaha.net/)。若需要 Canvas，可打开 [原域名回退入口](https://fishtank.phpz.org/?renderer=canvas) 或 [备用域名回退入口](https://fish.yahaha.net/?renderer=canvas)。

运行 `pnpm dev` 后打开 [本地鱼缸对照](http://localhost:5173/?pixiLab=1)。支持 Canvas / PixiJS 切换、滑动分界、写实与 LCD 两种风格，以及水下光纹和鱼体摆动开关。可勾选「观察示例鱼群」比较 12 种鱼形，示例鱼不会加入背包。

实验共用原来的繁育、合成、存档与鱼缸互动。背景、18 件造景、灯光、背景鱼群、气泡、鱼食与水花均已使用 PixiJS 原生图形；LCD 保持单色点阵。对照工具栏仅在开发服务中启用；普通生产构建包含默认 GPU 渲染及 Canvas 回退。点击「运行性能对照」或按 `B`，分别播放同一场景并查看 JS 耗时、帧率和可用的 GPU 时间。操作方法、渲染边界及历史性能参考统一见 [PixiJS 开发说明](docs/PIXI_LAB.md)。

LCD 的结果标记、仪式光效与特殊观赏效果均使用单色方格；界面提示、焦点和滑块跟随昼夜配色，弹窗与沉浸栏不使用柔光模糊。系统开启“减少动态效果”时，PixiJS 的特殊观赏效果保留静态点阵提示。

---

## 产品简介 / About Fishtank

**Fishtank** 是一款灵感源自 Steam 桌面放置游戏《[PC FISH: Taskbar Aquarium](https://store.steampowered.com/app/4842670/PC_FISH_Taskbar_Aquarium/?l=tchinese)》的网页端放置养成水族箱。无需注册登录、即开即玩，既可以在工作间隙体验配对繁育与全图鉴收集的乐趣，也可以一键切换至**全屏沉浸模式**，伴随轻柔的海洋白噪音与 Lo-Fi 音乐作为桌面生态屏保。

当前版本 **v1.9.0**。版本更新记录见 [CHANGELOG](CHANGELOG.md)，完整玩法与数值见 [游戏帮助](docs/BALANCE.md)。

---

## 玩法与亮点 / Highlights

### 🐠 29 种独立海洋生物与 5 阶幻彩变种
- 收录从初始金鱼、月光水母、黄金海马、琥珀电鳗、蓝弧电鳗、天翼飞鱼到神话级**皇冠冥河水母**、**幻彩叶海龙**、**深海绿海龟**等 **29 种海洋生物**。
- 每种生物均拥有专属的生理轮廓与游动姿态（鱼群摆尾、水母脉冲舒缩、海马直立点头、海龙拟态漂浮、蝠鲼展翼滑翔）。
- 除初始鱼外，每种鱼拥有 **品阶 1 至 品阶 5** 五种色相变种，高品阶不仅外观独特，还可提供最高 **2.0x 经验加成**。

### 💕 亲代配对繁育与 10 合 1 聚变合成
- **推荐配对**：点击按钮或按 `A`，从未锁定、可繁育的成年鱼中按星级、品阶、剩余次数优先自动选两条；同等条件下先选较早获得的鱼。也可手动选鱼，不设推荐目标。
- **爱心繁育**：消耗 1 颗爱心（每 7 分钟自动恢复 1 颗，上限 5 颗）即可让两条成年鱼配对孵化后代。双亲星级越高，越容易孵化出高星级稀有鱼种；双亲品阶越高，后代遗传高品阶的概率越大。
- **10 合 1 合成**：将 10 条低星级或繁育次数耗尽（`0/n`）的鱼进行聚变合成，**100% 升级为高一星级的新鱼**，并 **100% 继承 10 条材料鱼中的最高品阶**（支持一键自动按“1 高品阶 + 9 低品阶”最优策略选鱼）。
- 完整繁育概率与等级数值表可查阅游戏内「帮助」面板或 [《游戏帮助与数值说明》](docs/BALANCE.md)。

### 🪸 18 件可拖拽海底造景与昼夜灯光系统
- 随着鱼缸等级从 **Lv.1 提升至 Lv.10**，鱼缸展示容量与装饰摆放槽位同步从 **3 个扩展至 12 个**，逐步解锁翠绿海草、鹿角珊瑚、沉船宝箱、海底城堡、深海神像以及星芒吊灯、霓虹水母灯等 **18 件非对称造景**。
- **自由拖拽布置**：直接在鱼缸画面中按住任意装饰即可左右拖动调整位置；已摆放造景可通过卡片右上角的图标左右翻转。
- **自动 / 日间 / 黑夜模式**：黑夜模式下，鱼缸顶部的氛围射灯与顶挂彩灯会自动点亮，向深海水域投射柔和的体积光束。

### ⚡ 更早遇见电鳗
- 2★「高级」新增 **琥珀电鳗**，初始鱼搭配 1★ 鱼也有机会繁育出它。同星级鱼种仍等概率抽取，星级与品阶规则不变。

### 🐠 珍藏与存档
- 鱼缸卡片点击鱼图可展示或收回，右上角 ⓘ 打开个体详情，可锁定保护或确认放生。锁定会阻止放生、手动合成、自动选材和自动推荐配对，仍可展示、喂食与手动繁育。图鉴鱼种卡片显示锁定个体数与持有总数；详情先列出持有个体，再显示当前个体预览与操作，品阶外观图鉴可单独展开预览。可一键锁定当前持有的同品种个体，仍能单条解锁，新获得的鱼不自动锁定。详情中的放置/收回与锁定并排显示，各有图标和文字；不再提供繁育/合成跳转、昵称或收藏；旧档的昵称与收藏数据仅兼容保留，不参与显示或操作。
- 设置中可导出 JSON 存档，在另一设备或域名导入；先预览等级、鱼数与图鉴数，确认后替换，不合并。导入前自动备份当前进度；普通保存至多每五分钟轮转一次最近备份，可在设置中预览恢复，并单独恢复最近一次导入前的进度。重置游戏会清除本地备份，请提前导出。
- 进度与备份仍保存在当前浏览器，各域名独立；导入支持当前导出文件和旧版原始存档，拒绝损坏或不兼容文件。单文件最多 5 MiB / 20,000 条鱼。v1.8.0 支持以上收集与存档工具。

### 🫧 鲜活的鱼缸互动
- **点水投喂**：点击鱼缸空白水域可一颗颗撒下鱼食，附近的鱼会争相游来抢食，吃饱后欢快游开。
- **受惊冲刺**：轻点正在游动的小鱼，它会受惊加速横穿鱼缸（鱼缸里还藏着意想不到的**隐藏彩蛋**等待发现）。
- **轻轻收回**：收回时，小鱼会短暂游开并淡出；LCD 使用整格点阵消隐。背包和鱼缸空位立即更新，再次放入可取消退场，兼容 PixiJS、Canvas 及系统“减少动态效果”。
- **鱼景互动**：海马靠近海草停歇，小鱼偶尔穿过石拱，同品种会随机聚成 **2–5 条的小鱼群**，游一阵后再散开。移走或拖动对应造景会中断停留，投喂、受惊和收鱼优先响应。仅改变观赏动作，不修改成长与繁育；减少动态效果会停用新增观赏行为，写实/LCD 与 PixiJS/Canvas 均支持。
- **偶遇小点心**：浮游生物会间歇随水流出现，附近小鱼发现后会游过去吃掉。最多同时 3 只，没被发现也会自然消失；手动投喂优先，不增加经验或改变成长。
- **全屏沉浸模式**：一键隐藏所有操作面板，将鱼缸铺满整个窗口；鼠标静置 3 秒后顶部状态栏自动半透明隐去。

### 🏅 成就勋章
- 图鉴内统一为「收藏」，分为「鱼种」与「勋章」两页，页签各自显示收集进度；品阶收集比例只在鱼种页显示。**14 项永久成就**覆盖鱼种收集、稀有星级、水母与鳗鱼家族、同种五品阶、25/60 种幻彩外观等，不设每日任务或期限。
- 每项都有独立勋章图案，写实使用金属浮雕与彩带，LCD 使用独立单色点阵图形。可以单独挂取，也能一键挂上全部已获得的勋章，不占造景名额；手机同样支持多枚展示。
- 已获得记录不会因放生或合成消失；挂载选择随存档导出、导入和备份保留。旧档按已有收集历史补齐新成就，原有单枚纪念牌会迁移为对应勋章，不自动挂上额外奖励。
- Fourteen permanent achievements each have a distinct medal. The Book separates species and medals; hang all earned medals or choose them individually. Saves with a single old plaque migrate automatically. Schooling and drifting plankton are cosmetic and do not change breeding odds or progression.

### 🎵 氛围音效与三首原创背景音乐
- 内置清脆的水滴、投喂、孵化、合成音效，以及三首可随时切换的轻音乐曲目：**《珊瑚礁 Lo-Fi》**、**《深海潮汐》**、**《液晶八音盒》**，支持独立调节音效与音乐音量。
- **双视觉主题**：内置 **写实珊瑚礁（Realistic Reef）** 与复古掌机风格的 **单色液晶屏（Monochrome LCD）** 两种画面主题。

### 📱 随处可玩（支持安装到桌面与离线运行）
- **立即在线游玩**：访问 **[https://fishtank.phpz.org](https://fishtank.phpz.org)** 即可直接开始。
- **安装为独立应用（PWA）**：支持通过 Chrome / Edge 地址栏右侧「安装应用」或手机浏览器「添加到主屏幕」，作为无边框独立桌面小组件运行；游戏进度自动保存在本地；首次在线打开并刷新一次，让资源完成缓存后，即可离线游玩与结算成长。

---

## 📖 游戏内帮助 / In-game Help

按 `H` / `?` 或点击底栏「帮助」，先看看游戏说明，再按需切换繁育概率、等级解锁、星级属性、品阶经验和快捷键。概率按双亲中较低的星级分组，等级表按等级段翻页，所有列和当前页数据都能完整阅读，无需横向滚动。小屏幕上，帮助、更新日志、繁育及合成结果使用满屏弹窗；底栏保留完整版本号，三个入口显示为旁边的图标，仍可悬停查看名称。桌面保留居中弹窗和文字入口。

勋章页按宽度使用四列、三列或两列陈列，鱼种页保持独立。触屏控件至少 44px，输入字号至少 16px；短屏改为整页滚动并固定导航，切页、鱼类详情和导入预览会定位到可操作区域。写实/LCD 与 PixiJS/Canvas 共用响应式布局。

Open Help with `H` / `?` or the footer button. Start with the game guide, then browse breeding odds, level unlocks, tier stats, grade EXP and shortcuts. Tables use tier or level pages so every column fits without horizontal scrolling. Help, Changelog, breeding and merge results fill small screens. Three labeled icons sit beside the full version in the footer, with names available on hover and to screen readers. Desktop keeps centered dialogs and text links.

Help 分页支持左右方向键切换、`Home` / `End` 跳至首尾页；按 `Esc` 关闭并返回原入口。

Use Left / Right arrows on Help tabs, Home / End for the first / last tab, and Esc to close and return to the opener.

---

<a id="keyboard-shortcuts"></a>

## ⌨️ 快捷键 / Keyboard Shortcuts

自 v1.5.0 起，直接按单键即可，无需 Ctrl 或 Cmd。游戏内「帮助」也有完整说明，按钮悬停提示会显示对应按键。

Available since v1.5.0. Use single keys without Ctrl or Cmd. The in-game Help and button tooltips show the same shortcuts.

| 按键 / Key | 操作 / Action |
| --- | --- |
| `1` | 鱼缸 / Tank |
| `2` | 繁育 / Breed |
| `3` | 合成 / Merge |
| `4` | 装饰 / Decor |
| `5` | 图鉴 / Book |
| `6` | 设置 / Settings |
| `F` | 进入或退出沉浸模式 / Toggle immersive mode |
| `D` | 自动 → 日间 → 黑夜 / Cycle Auto → Day → Night |
| `M` | 开关背景音乐 / Toggle background music |
| `S` | 开关操作音效 / Toggle sound effects |
| `L` | 切换中英文 / Switch Chinese and English |
| `H` / `?` | 打开帮助 / Open Help |
| `U` | 打开更新日志 / Open Changelog |
| `A` | 繁育页推荐配对 / 合成页自动选材 / Best Pair on Breed, auto-select materials on Merge |
| `C` | 清空当前繁育或合成选择 / Clear the current breeding or merge selection |
| `R` | 执行已就绪的繁育或合成，收下已展示的小鱼 / Run ready breeding or merge, or collect a revealed fish |
| `Enter` | 操作当前聚焦控件；无控件焦点时执行就绪动作或收下小鱼 / Activate the focused control; otherwise run a ready action or collect a result |
| `Esc` | 关闭弹窗、取消确认、返回图鉴列表或退出沉浸 / Close overlay, cancel confirmation, leave book details, or exit immersive mode |

- 切换 Tab 会自动退出沉浸模式；`A`、`C` 和开始繁育/合成的 `R` / `Enter` 只作用于当前操作页，未就绪的操作不会执行。
- 输入框、滑条、下拉菜单和输入法组字期间暂停快捷键；弹窗打开时暂停后台操作，避免误触。鼠标选鱼后按 `R` 可直接繁育；聚焦按钮时，`Enter` 保留按钮原有操作。
- 长按不会重复触发快捷键，Ctrl / Cmd / Alt 组合键不受影响。放生和重置没有全局执行快捷键。
- Tab switching leaves immersive mode. Context actions apply only to the current page and require a ready action. Inputs and IME composition pause shortcuts; overlays block background actions. Native button activation and browser modifier shortcuts remain available. Held keys do not repeat shortcuts; release and reset have no global execution shortcut.

---

## 界面组件 / UI components

鱼群、繁育、合成、装饰、图鉴及品阶/个体预览统一使用 [`itemCard`](src/ui/item-card.ts)，样式集中在 [`item-card.css`](src/ui/item-card.css)。页面提供内容、状态与回调，组件统一处理选中态、状态栏、次要操作、键盘焦点和触屏尺寸；选中使用顶部色条与浅色底；通过 regular / compact / mini 三种密度适应不同位置。新增卡片应复用此组件，避免另写选中样式。

---

## 五星重铸 / Mythic reforging

在「合成 → 五星重铸」选择 3 条已成年、次数耗尽、未锁定且未展示的五星鱼，生成继承最高品阶、重新获得繁育次数的五星幼鱼。20% 概率发现隐藏生物；连续 9 次未发现新隐藏，第 10 次必得尚未发现的一款。重复隐藏不重置保底，计数随存档保存。

已发现的隐藏生物直接展示在原生物图谱中，不另设标签页，未发现的隐藏生物不显示卡片，普通图鉴完成率保持不变。未发现的普通鱼种显示黑色剪影和 `???`。具体概率及保护规则见 [游戏规则](docs/BALANCE.md)。

Reforge three adult, exhausted, unlocked Mythics outside the tank into one fresh Mythic fry. There is a 20% secret chance, with an undiscovered secret guaranteed on the tenth consecutive reforge without a new discovery. Discovered secrets appear in the main species collection; undiscovered secrets have no cards.

## 满心系统提醒 / Full hearts reminder

在设置中开启「繁育满心提醒」并允许系统通知后，每次恢复到 5 颗爱心时提醒一次；关闭后可随时重新开启。提醒偏好仅保存在当前浏览器，不随鱼缸存档导出或导入。

应用需保持打开。后台冻结可能延迟提醒，完全退出应用后不能保证通知；当前版本不使用服务器推送。系统通知被拒绝时，可在浏览器或系统的网站通知设置中重新允许。

Enable **Full hearts reminder** in Settings and allow system notifications to receive one reminder per full-heart cycle. Keep the app open: background suspension may delay delivery, and delivery after closing is not guaranteed. This browser-only preference stays separate from game saves; no push server is used.

## 项目文档

- [更新日志](CHANGELOG.md)：玩家可见的版本变化。
- [玩法与数值](docs/BALANCE.md)：繁育、合成、成长和存档规则。
- [PixiJS 开发说明](docs/PIXI_LAB.md)：渲染结构、对照工具与性能参考。
- [UI 验证](scripts/ui/README.md)：`pnpm test:ui` 本地验证及 `pnpm test:ui:online` 双域名验证，统一使用无头浏览器。
- [部署记录](docs/DEPLOYMENTS.md)：当前部署、验收结论及历史版本索引。

## License

[MIT](LICENSE) © 2026 [Seven Yu](https://yahaha.net)
