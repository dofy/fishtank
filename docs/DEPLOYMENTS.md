# 部署记录

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
