# 部署记录

发布约定：同一天的小修补合并覆盖当前版本，并归入同一条 CHANGELOG；较大的功能或体验更新再升级版本号。同版重新发布可单独递增 Service Worker 缓存修订号，两个自定义域名必须同时保留。

## v1.4.10 — 2026-10-19

### 同日更新：可调节的夜间流光灯珠

| 项目 | 记录 |
| --- | --- |
| 部署时间 | 2026-10-19 12:51:01（Asia/Shanghai） |
| 生产地址 | https://fishtank.phpz.org/ 、https://fish.yahaha.net/ |
| Cloudflare Worker | `fishtank` |
| 部署源代码提交 | `58caac6f3c985877104b7613e66951f1b466e95b` |
| Cloudflare Deployment ID | `4d4e2fb7-f578-41be-8ef5-5bdcd82890f4` |
| Cloudflare Version ID | `4ac9304e-6046-4642-a971-54e80e2b8030` |
| 发布时流量 | 本次修订 100% |
| Service Worker 缓存 | `fishtank-pwa-v1.4.10-r4` |

- 在横梁内部增加小灯珠并避开原有灯罩，保持灯架高度；写实主题使用七色灯珠，LCD 主题使用单色灯珠。仅夜间绘制，日间完全熄灭。
- 设置的“横梁小彩灯”支持开关滚动闪烁、调整 0.2–2 次/秒的完整亮度周期，默认每秒 0.5 次；关闭动画或系统启用减少动态效果时保持夜间常亮。效果采用连续亮度波依次流转，不使用明灭跳变。
- 设置即时预览并保存至原存档；旧存档补默认值，非法配置会回退/限幅，重置进度时与原有音量等偏好一样保留。未更改繁育、经验、鱼群或图鉴规则。
- `pnpm test`：38 项通过，包括旧存档/非法配置兼容、设置保存恢复、动画周期和频率、关闭及减少动态效果；TypeScript 类型检查、构建及差异格式检查通过。
- 浏览器逐像素验证白天无灯珠、夜间有灯珠、动画不同时间有变化、关闭和减少动态效果时图像一致、频率缩放一致及 LCD 动画有效。
- 本地生产构建和线上验证设置滑条键盘操作、最小/最大值、关闭后滑条禁用、开关重绘后焦点恢复、设置刷新恢复及新版日志；320/390px 设置无横向溢出，中英文及 LCD 切换正常，无脚本运行异常。
- CF 发布输出确认保留两个 custom domain，部署列表确认本次 Version 承接 100% 流量。两个域名首页引用最终构建资源，JS、CSS 和 Service Worker 与本地构建逐字节一致。
- 域名跟进：本次最终检查时，系统 DNS 与公共 DNS 均能正常解析 `fish.yahaha.net`；已使用不指定解析地址的独立 Chrome 与普通 HTTPS 请求直接打开该域名，首页返回 200、显示 `v1.4.10`，新设置和 `r4` 缓存文件正常。之前的当前网络负缓存已不再复现。未修改系统 DNS、代理或用户浏览器设置；本次未验证完整离线启动。

#### 灯珠修订线上资源 SHA-256

| 资源 | SHA-256 |
| --- | --- |
| `sw.js` | `a43506de9522fe7541426c85b980b74d6661b0df81cd8a730fb81180732ffd31` |
| `assets/index-C_E8Mpa_.js` | `7cd296ade09ce6ccaff71ce1322781669908c36fa1d42342e1aa7ee396865ceb` |
| `assets/index-BOt-EITs.css` | `0106836dcebbec59755547343dac1bcb08dd07c0fb65c11449c7727831cb8c01` |

### 同日更新：轻巧圆润的顶部灯架

| 项目 | 记录 |
| --- | --- |
| 部署时间 | 2026-10-19 12:46:22（Asia/Shanghai） |
| 生产地址 | https://fishtank.phpz.org/ 、https://fish.yahaha.net/ |
| Cloudflare Worker | `fishtank` |
| 部署源代码提交 | `ca47cc3bd718cd700e713c03ddc16da227bbd922` |
| Cloudflare Deployment ID | `d743173a-1d62-4f18-9433-c31b6f62d9d3` |
| Cloudflare Version ID | `75a1235c-4239-41bf-87e7-f0f06287d821` |
| 发布时流量 | 本次修订 100% |
| Service Worker 缓存 | `fishtank-pwa-v1.4.10-r3` |

- 横梁由 4 缩至 3 个逻辑像素，改为圆角灯轨；灯罩收窄、边缘圆润，增加柔和材质高光和磨砂灯片，降低灯片附近的光晕范围。
- 安装高度、灯位、彩色灯光及水中光束保持原有规则，未改动装饰槽位、摆放和游戏逻辑。本次内容合并至 `v1.4.10` 更新日志。
- 在 280、320、390、960、2560 五种逻辑宽度下直接检查灯架绘制：日间不透明灯架像素仍位于顶部 y=2..10，未向下侵占更多水面；窄屏两灯、宽屏三灯布局保持不变。
- 检查 1280×900、390×844、320×568 和 2560×1440 布局，以及明暗、沉浸、减少动态效果和 LCD/写实主题切换。生产构建及最终线上页面的 2560×1440 沉浸模式均正常，更新日志可展示新条目，无脚本运行异常。
- `pnpm test`：35 项通过；TypeScript 类型检查、生产构建及差异格式检查通过。
- CF 发布输出确认保留两个 custom domain，部署列表确认本次 Version 承接 100% 流量。两个域名首页均引用最终构建资源，JS、CSS 和 Service Worker 与本地构建逐字节一致；同版缓存修订号为 `r3`。
- 主站使用普通 DNS 访问；`fish.yahaha.net` 的公共 DNS 正常，但当前网络系统解析仍返回 `ENOTFOUND`，因此浏览器及 HTTPS 验证仅在独立进程/单次请求中指定公共解析地址，并保留正常 TLS 校验。未更改系统 DNS、代理或用户浏览器设置；本次未验证完整离线启动。

#### 顶灯修订线上资源 SHA-256

| 资源 | SHA-256 |
| --- | --- |
| `sw.js` | `837ac7d4940d40bf3d01ae8b380b4a71532ddf397cf74a16762a3c48737c5323` |
| `assets/index-DIYVlijf.js` | `b06901f6c154aee44379b2eea2018e65b02b25b996476aa869a76777b92d4fc1` |
| `assets/index-BOt-EITs.css` | `0106836dcebbec59755547343dac1bcb08dd07c0fb65c11449c7727831cb8c01` |

### 同日更新：鱼种等概率抽取

| 项目 | 记录 |
| --- | --- |
| 部署时间 | 2026-10-19 12:37:46（Asia/Shanghai） |
| 生产地址 | https://fishtank.phpz.org/ 、https://fish.yahaha.net/ |
| Cloudflare Worker | `fishtank` |
| 部署源代码提交 | `158ae471343ef0504aa71f8f213f7ac2eb2c95b1` |
| 规则修复提交 | `2d6697f` |
| Cloudflare Deployment ID | `a05c559e-dc85-4d4c-8fa2-f432726612aa` |
| Cloudflare Version ID | `7a160945-b3ba-4041-9faa-2040ffdde843` |
| 发布时流量 | 本次修订 100% |
| Service Worker 缓存 | `fishtank-pwa-v1.4.10-r2` |

- 移除 45% 亲代鱼种优先，抽中星级后从该星级全部鱼种中等概率抽取；不按收集情况加权，仍允许重复。星级矩阵、品阶权重、成长、次数、经验及存档规则保持不变。
- 同步中英文繁育指南和数值文档，将本次内容合并至现有 `v1.4.10` 更新日志，并删除描述文案语气及 emoji 调整的条目。
- 新增三项回归：所有 21 组无序亲代星级组合可产出鱼种的等分区间、25 组亲代品阶权重、固定种子 70,000 次繁育的鱼种及星级/品阶分布。规则修改前两项公平性测试失败，修改后 35 项测试全部通过。
- TypeScript 类型检查、生产构建及差异格式检查通过；本地生产构建完成“初始鱼 + 霓虹清洁隆头鱼”的实际繁育、扣除爱心/次数、收下小鱼及刷新读档验证。
- 最终线上构建在两个域名的隔离浏览器上下文中完成繁育与读档验证，均显示 `v1.4.10`；更新日志共九个版本，已合并本次内容，无 `v1.4.11` 条目或已删除文案，390×844 正文无横向溢出，无脚本运行异常。验证只使用独立测试存档，未更改用户进度。
- 发布输出确认同时保留两个 custom domain；主站正常解析访问，自定义域名使用公共 DNS 返回的地址在独立浏览器进程内指定解析，并保留正常 TLS 校验，均返回 HTTP 200。
- 验证时 Google 与 Cloudflare 公共 DNS 已正常解析 `fish.yahaha.net`，但当前网络系统解析仍返回 `ENOTFOUND`。本次未更改系统 DNS、代理或用户浏览器配置。
- 两个域名首页均引用最终构建资源，JS、CSS 和 Service Worker 与本地构建逐字节一致。隔离浏览器在 `fish.yahaha.net` 上确认 Service Worker 已激活并创建 `r2` 缓存；主站本次未观察到自动注册，未据此扩大修改既有注册流程，也未验证完整离线启动。

#### 本次修订线上资源 SHA-256

| 资源 | SHA-256 |
| --- | --- |
| `sw.js` | `7157970b3aa808955f81fe4ac7901273728bdc738801e06aaa8a17b2616d55be` |
| `assets/index-DaQeOZy1.js` | `8e153eb882122d42eabf511cddf6cd45e0069a50fa20aa8822d89096181bfe3a` |
| `assets/index-BOt-EITs.css` | `0106836dcebbec59755547343dac1bcb08dd07c0fb65c11449c7727831cb8c01` |

### 首次发布

| 项目 | 记录 |
| --- | --- |
| 部署时间 | 2026-10-19 12:24:33（Asia/Shanghai） |
| 生产地址 | https://fishtank.phpz.org/ 、https://fish.yahaha.net/ |
| Cloudflare Worker | `fishtank` |
| 部署源代码提交 | `2d41c18e945d4237e85d2441fb2ed617f5813d9c` |
| Cloudflare Deployment ID | `1a96a7ea-de59-46fc-8e32-287a9209c642` |
| Cloudflare Version ID | `6a8858ca-e3a2-44b0-997e-a450dd886b7c` |
| 发布时流量 | 新版本 100% |

### 发布内容与验证

- 更新日志改为版本时间线，桌面使用左侧目录，手机使用横向版本栏；滚动正文时同步高亮所在版本。
- 正文字号、行高和条目间距增大，增加简短摘要、重点加粗和少量 emoji；整理全部历史文案，保留原有日期、tag 及提交范围。
- 历史源码链接收进可展开的“版本记录”。开发验证和兼容细节继续保留在 Markdown 中，游戏内侧重玩家可见的变化。
- 检查 1280×900、390×844、320×568 三种尺寸：对话框不超出视口，正文无横向溢出，手机版本栏横向滚动且能保持选中版本可见。
- 检查明暗模式、LCD 主题、中英文操作文案、平滑滚动及减少动态效果；版本跳转、滚动高亮、历史链接展开、Esc 关闭、关闭后入口焦点恢复和原生对话框焦点约束正常；原有帮助内容仍可打开。
- `pnpm test`：32 项通过；TypeScript 类型检查、生产构建和差异格式检查通过。本次未改动游戏规则或存档逻辑。
- 主站使用普通 DNS 访问，隔离浏览器确认手机页面显示 `v1.4.10`，更新日志可打开且无横向溢出。
- 两个域名首页均引用本次构建资源，JS、CSS 和 Service Worker 与本地构建逐字节一致。首页可被 Cloudflare 注入分析脚本，因此核对其游戏资源引用，不以 HTML 全文哈希作为一致性判断。
- 自定义域名 `fish.yahaha.net` 的隔离浏览器验证使用 Cloudflare 公共 DNS 返回的 IP，仅在独立进程内指定解析，保留正常 TLS 校验；首页返回 200，九个版本条目和当前版本标记正常，Esc 可关闭，无脚本运行异常。完整离线启动未在本次验证。

### 域名解析跟进

- 上次发布时覆盖了未写入仓库的控制台域名绑定，造成短暂 NXDOMAIN；本次检查时两个域名均已纳入 `wrangler.jsonc`，发布输出确认同时保留两个 custom domain。
- 使用 Google 官方 DNS 缓存刷新页面，为 `fish.yahaha.net` 的 A 记录执行刷新，页面返回 `Success!`。随后 Google DNS 与 Cloudflare DNS over HTTPS 均正常返回 A 和 AAAA 记录。
- 验证时当前网络的系统解析仍返回 `ENOTFOUND`；清理本机查询缓存后仍未恢复，不能据此声称所有网络已恢复访问。未更改系统 DNS、代理、浏览器设置或用户存档。
- 绑定、TLS 和站点资源已正常；仍受旧 NXDOMAIN 缓存影响的网络需等待其递归解析缓存过期，期间可使用主站 `fishtank.phpz.org`。

### 线上资源 SHA-256

| 资源 | SHA-256 |
| --- | --- |
| `sw.js` | `7b4ae3da4e5703a0d28246b707daa139271bdf03c3c6b241d60402cb4fb45e7f` |
| `assets/index-zl-XM2u5.js` | `8b2c28e9af1536960765d9de13280dc05ab43416a2085ae691b9f485b7d6f54c` |
| `assets/index-BOt-EITs.css` | `0106836dcebbec59755547343dac1bcb08dd07c0fb65c11449c7727831cb8c01` |

## v1.4.9 — 2026-10-19

| 项目 | 记录 |
| --- | --- |
| 部署时间 | 2026-10-19 12:12:53（Asia/Shanghai） |
| 生产地址 | https://fishtank.phpz.org/ 、https://fish.yahaha.net/ |
| Cloudflare Worker | `fishtank` |
| 部署源代码提交 | `756dc32a017fcf4be30bc4a0961c03b57b06e8fd` |
| 域名配置修复提交 | `533b9436fcf4fd8cf1b161bf0926b88fdb295268` |
| Cloudflare Deployment ID | `a852dc03-2a44-44b0-9d51-53f48da45b00` |
| Cloudflare Version ID | `cd06d9d2-d13c-4468-9688-8cd377c096e5` |
| 发布时流量 | 新版本 100% |

### 发布内容与验证

- 取消侧边背景的 280px 宽度上限，按视口与主界面之间的实际空间铺开。2560×1440 下原本每侧 510px 的空带缩减为 0；主界面仍为 980px 宽。
- 光束、远景海床和生物使用独立 SVG 图层，鱼、水母、气泡、海草和珊瑚保持等比缩放；靠近主界面处平滑淡出。
- 检查 1280×800、1920×1080、2560×1440、3440×1440、3840×2160、5120×1440、1080×1920 和 390×844 八种视口：侧边无覆盖空带，无额外页面溢出，生物图层横纵缩放比例一致。
- 检查明暗模式、LCD 主题、沉浸模式、正常动画和“减少动态效果”。手机及沉浸模式继续隐藏侧边装饰。
- `pnpm test`：32 项通过；`pnpm build`、类型检查及差异格式检查通过。
- 主站 HTML、JS、CSS 和 Service Worker 与本地构建逐字节一致；隔离浏览器确认页脚 `v1.4.9`，两侧背景宽度均为 790px，覆盖空带为 0。

### 域名恢复与验证边界

- 用户截图中的 `fish.yahaha.net` 在部署前可正常访问，但没有记录在仓库的 Wrangler 自定义域名列表中。本次部署覆盖域名列表后，其绑定短暂丢失。
- 将该既有域名补入 `wrangler.jsonc`，保留 `fishtank.phpz.org`，并使用 `wrangler triggers deploy` 恢复两个域名绑定；未重新上传游戏资源或改变 Version ID。
- Cloudflare DNS over HTTPS 已返回 `fish.yahaha.net` 的正常 A 记录。验证时本地解析器及 Google DNS 仍缓存此前的 NXDOMAIN，需要等待负缓存到期。
- 使用 Cloudflare DNS 返回的地址进行独立 HTTPS 验证（保留域名与正常 TLS 证书校验）：该域名首页返回 200、引用新版资源；JS、CSS 和 Service Worker 与本地构建逐字节一致。
- 独立 Chrome 测试进程使用上述解析地址打开截图域名，确认显示 `v1.4.9`，2560×1440 下背景完整覆盖。该测试仅对独立进程指定解析地址，未更改系统或用户浏览器的 DNS 设置。
- 域名清单现已纳入版本控制，后续 Wrangler 部署将同时保留两个入口。完整离线启动未在本次验证。

### 线上资源 SHA-256

| 资源 | SHA-256 |
| --- | --- |
| `sw.js` | `67e3b287cce6f50e6b9c16da55513124e8da153fe8b076c29397f10def1b9eff` |
| `assets/index-DlUtGKMk.js` | `822c228f38de39aea1062450f261eb0d55fbea403a7246be3e11891290b6c0ce` |
| `assets/index-DtydXGg-.css` | `089ba0f3fb81e3414cbc0768209af7f3f9cacbd5127784e772e60ca35a3bd26a` |

## v1.4.8 — 2026-10-19

| 项目 | 记录 |
| --- | --- |
| 部署时间 | 2026-10-19 12:02:41（Asia/Shanghai） |
| 生产地址 | https://fishtank.phpz.org/ |
| Cloudflare Worker | `fishtank` |
| 来源分支 | `main` |
| 部署源代码提交 | `9bdcfc2cf4bb68d07c345f167def43fd491a0ce4` |
| Cloudflare Deployment ID | `d57ebb58-06c2-4812-9c93-ce2cb588d82c` |
| Cloudflare Version ID | `bc260bf2-5684-4a4e-9db1-d4e8def47c1b` |
| 发布时流量 | 新版本 100% |

### 发布内容与验证

- 补录五个实际存在的历史 tag：`v1.2.3`、`v1.3.0`、`v1.3.6`、`v1.3.7`、`v1.4.6`。已核对本地与远端 tag，并按相邻 tag 的提交范围整理记录。
- 在“帮助”旁增加“更新日志”，直接读取仓库 CHANGELOG，支持版本跳转、当前版本标记、Esc 和关闭按钮返回、原生对话框焦点约束，以及关闭后恢复入口焦点。
- 页面包含 `v1.4.8`、`v1.4.7` 和五个历史 tag 的条目；没有将未打 tag 的版本标记为已有 tag。
- `pnpm test`：32 项通过；`pnpm build`、类型检查及差异格式检查通过。
- 本地生产构建检查了 1280×800、390×844、320×568 三种尺寸，明暗及 LCD 主题，中英文操作文案，版本跳转、关闭与原有帮助功能。
- 生产域名的 HTML、JS、CSS、Service Worker 与本地构建逐字节一致；Cloudflare 部署列表确认上述 Version ID 承接 100% 流量。
- 隔离浏览器实测线上页脚为 `Fishtank v1.4.8`，入口顺序为“帮助 / 更新日志 / GitHub”，更新日志可打开并通过 Esc 关闭，七个版本条目、五个 tag 链接和当前版本标记正常。
- 线上控制台观察到五个可选贴图请求返回 404（初始鱼和装饰的 PNG），程序绘制仍正常。本次未修改对应渲染与贴图回退逻辑，未出现更新日志脚本异常；完整离线启动未在本次验证。
- 工作期间发现 `game.ts` 内容与 `v1.4.6` 旧文件完全一致的未提交回退；经用户确认后恢复至已提交的 `v1.4.7` 修复版本。本次发布保留四项规则修复。

### 线上资源 SHA-256

| 资源 | SHA-256 |
| --- | --- |
| `sw.js` | `2e39f5a252538f4b4cdeae914162d1657d0b9826f0d2967955df323ccc6173b1` |
| `assets/index-BcROR0zU.js` | `ea38b7d5ed12539da635090984bbb9972a8ddfd2fa0f52437bf5eb33eb7b9206` |
| `assets/index-BjWk3t5p.css` | `889ecd1683b09e804b6fe9daeb01e5df469281102a272b815e75f7298316a2c9` |

## v1.4.7 — 2026-10-19

| 项目 | 记录 |
| --- | --- |
| 部署时间 | 2026-10-19 11:52:38（Asia/Shanghai） |
| 生产地址 | https://fishtank.phpz.org/ |
| Workers 地址 | https://fishtank.seven-yu.workers.dev/ |
| Cloudflare Worker | `fishtank` |
| 来源分支 | `main` |
| 部署源代码提交 | `698f58743b649dd616870c02fa02c7d5e4fd1b92` |
| Cloudflare Deployment ID | `3d90f36f-ab87-40a9-8d86-f056c637c1a4` |
| Cloudflare Version ID | `252e5c1e-6695-417c-830b-0aa020c7dea4` |
| 发布时流量 | 新版本 100% |
| 部署命令 | `pnpm run deploy`（使用本机已缓存的 Wrangler 4.147.0） |

### 验证结果

- `pnpm test`：32 项全部通过。
- `pnpm build`：TypeScript 类型检查和 Vite 生产构建通过。
- 部署前完成本地生产构建的真实繁育、保存及模拟离线成年结算检查。
- Cloudflare 部署列表确认上述 Version ID 承接 100% 流量。
- 生产域名首页、JS、CSS 和 Service Worker 均返回 HTTP 200，内容与本地构建逐字节一致。
- 隔离浏览器打开生产首页，页脚显示 `Fishtank v1.4.7`，初始鱼缸和六个功能入口正常呈现。
- 本次未完成浏览器 Service Worker 激活及完整离线启动验证；下表仅确认线上所提供的 Service Worker 文件内容。

### 线上资源 SHA-256

| 资源 | SHA-256 |
| --- | --- |
| `sw.js` | `fb19cc578a15135aca33fa4ca7c754851be1d6efb78210ece31698f858ec6b0e` |
| `assets/index-JQ_YzqhC.js` | `5e986d883a5789c93c4786c78ca65c9520b705ffc3c71dc893cf2cc98ad5a6ed` |
| `assets/index-CJngTF_Y.css` | `d9ca14c9ac496c6ca6d06b1e573b3f93260c44eda25e0a7350da58aaa6a8e589` |

完整修复内容和旧存档兼容说明见 [CHANGELOG](../CHANGELOG.md)。本部署记录在发布验证后补充，以上源代码提交标识对应实际构建部署的代码。
