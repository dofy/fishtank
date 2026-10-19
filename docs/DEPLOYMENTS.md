# 部署记录

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
