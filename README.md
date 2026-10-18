# Fishtank

A browser idle aquarium game inspired by [PC FISH: Taskbar Aquarium](https://store.steampowered.com/app/4842670/PC_FISH_Taskbar_Aquarium/). Raise, breed, merge, and collect marine creatures across two swappable art styles (**Realistic Reef** and **Monochrome LCD**), with full **Simplified Chinese / English (`zh` / `en`)** localization.

一款受 Steam《[PC FISH: Taskbar Aquarium](https://store.steampowered.com/app/4842670/PC_FISH_Taskbar_Aquarium/?l=tchinese)》启发的网页端桌面放置水族箱游戏。支持繁育、10 合 1 合成、品阶变种图鉴收集、海底与顶挂造景拖拽布置，内置**写实珊瑚礁**与**单色液晶屏**两种可热替换素材的视觉主题。

---

## Live Demo / 在线体验

**[https://fishtank.phpz.org](https://fishtank.phpz.org)**

---

## Features / 核心特性

- **Authentic Progression & Balance / 还原核心数值平衡**
  - **Hearts & Breeding**: 1 heart per breeding attempt, regenerates 1 heart every 7 minutes (cap 5). Starter fish have infinite (`∞`) breeding uses; bred fish roll `1–5` uses.
  - **Aquarium Level (`Lv.1–Lv.10`)**: Breeding and fry maturation grant EXP, expanding both visual fish display slots and decoration placement slots from `3` up to `12` while keeping inventory unlimited.
  - **Two-Axis Quality**: Rarity Tier (`Starter` / `1★ Common` → `5★ Mythic`) × Visual Grade (`Grade 1–5`, granting up to `2.0x` EXP and distinct color variants).
  - **Exact Breeding Matrix & 10-to-1 Synthesis**: Reproduces the official parent-tier probability matrix and 10-fish synthesis (with rarity/0-use filters and optimal `1+9` grade inheritance auto-select). See [`docs/BALANCE.md`](docs/BALANCE.md).
- **28 Distinct Species Silhouettes & Interactive Tank / 28 种独立生物外轮廓与鱼缸互动**
  - Every species has a bespoke anatomical silhouette (beak butterflyfish, unicorn tang, Moorish idol whip-streamer, spiky puffer, glider flying fish, leafy sea dragon, saucer/ribbon/crown jellyfish, electric/ribbon eels, manta ray, sea turtle, etc.) and locomotion trajectory.
  - **Interactive Feeding & Startle**: Click empty water to drop sinking food pellets one by one (nearby fish chase and eat 1 pellet per 9s satiety cooldown then swim away); click a fish to startle it into a long horizontal dash.
  - **Electric Eel Discharge**: A *Volt Electric Eel* in the tank occasionally discharges (or immediately when clicked 6 times within 30s), stunning all other fish with lightning arcs for 3 seconds!
- **18 Asymmetric Draggable Decorations & Night Lamps / 非对称可拖拽造景与夜晚灯光联动**
  - Unlocks 18 asymmetric floor ornaments (with wide height contrast from low clams/pebbles up to towering kelp & sunken castles exceeding 50% tank height) and **top-hanging lights** across `Lv.1–Lv.10` (up to `3 → 12` placed at once by level).
  - Drag any placed decoration directly inside the tank canvas (last dragged item automatically rises to the top layer).
- **Auto / Day / Night Color Modes & Immersive Mode / 昼夜模式与全屏沉浸模式**
  - Supports **Auto** (follows system appearance), **Day (Light)**, and **Night (Dark)** modes. In Night mode, aquarium overhead lamps and top-hanging fairy lights automatically illuminate the water with volumetric light cones.
  - **Immersive Mode**: One-click full-viewport aquarium view hiding bottom tabs and panels.
- **Web Audio SFX & 3 Procedural BGM Tracks / 交互音效与三首背景音乐**
  - Zero-dependency Web Audio synthesizer providing tactile click/select/splash/hatch SFX and 3 selectable background tracks (*Coral Lo-Fi*, *Deep Sea Tide*, *Pixel Chiptune*) with independent volume sliders and mute toggles.
- **Swappable Theme & Sprite Assets / 零代码素材替换**
  - Two built-in renderers: **Realistic Reef (`realistic`)** and **Monochrome LCD (`lcd`)**.
  - Dropping `<speciesId>.png` or `decor-<decorId>.png` into `public/themes/<theme>/sprites/` automatically replaces the procedural artwork for that creature or decoration without code changes.

---

## Development / 本地开发

**Tech Stack:** TypeScript · Vite 6 · Tailwind CSS v4 (`@tailwindcss/vite`) · HTML5 Canvas · Web Audio API

```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:5173)
pnpm dev

# Typecheck & build for production (outputs to dist/)
pnpm typecheck
pnpm build
pnpm preview
```

---

## Customizing Themes & Sprites / 主题与素材替换说明

Each theme lives in `public/themes/<theme-id>/`:

```text
public/themes/
├── realistic/
│   ├── manifest.json       # Palette tokens (dark & light), scene colors, renderer: "realistic"
│   └── sprites/            # Optional PNG overrides
└── lcd/
    ├── manifest.json       # Dot-matrix cell size, monochrome palettes, renderer: "lcd"
    └── sprites/            # Optional PNG overrides
```

- **Fish Sprite Override**: Place `public/themes/<theme-id>/sprites/<speciesId>.png` (e.g. `goldfin.png`, `goldenseahorse.png`, `moonjelly.png`).
- **Decoration Sprite Override**: Place `public/themes/<theme-id>/sprites/decor-<decorId>.png` (e.g. `decor-shell.png`, `decor-castle.png`, `decor-fairylights.png`).
- Any missing PNG automatically falls back to the built-in procedural renderer.

---

## License

[MIT](LICENSE) © Seven Yu
