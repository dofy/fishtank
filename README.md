# Fishtank

A browser idle aquarium inspired by [PC FISH: Taskbar Aquarium](https://store.steampowered.com/app/4842670/PC_FISH_Taskbar_Aquarium/). Breed, mature, merge, and craft fish across two swappable art styles:

- **Realistic Reef (`realistic`)** — soft-shaded reef aquarium with caustics, swaying kelp, drifting bubbles, and dorsal sheen on high-grade fish.
- **Monochrome LCD (`lcd`)** — retro handheld dot-matrix screen with pixel dithering, unlit LCD grid cells, and flank notches for visual grade.

## Features

- **Authentic Balance & Progression**: Reproduces the heart regeneration cadence (1 heart / 7 min, cap 5), cumulative EXP & tank capacity curve (Levels 1–10), two-axis quality system (Tier `1★–5★` + Visual Grade `1–5`), and the exact parent-tier breeding probability matrix. See [`docs/BALANCE.md`](docs/BALANCE.md).
- **10-to-1 Synthesis & Season Crafting**: Exhausted fish with 0 breeding attempts can be merged 10-for-1 into the next tier or spent on limited Season recipes.
- **Offline Progress**: Time-based heart regeneration and fry maturation automatically catch up when you reopen the tab.
- **Swappable Asset Themes**: Every theme lives in `public/themes/<id>/manifest.json`. Dropping a `<speciesId>.png` into `public/themes/<id>/sprites/` automatically overrides the procedural renderer for that species without touching any code.

## Development

```bash
pnpm install
pnpm dev
```

Build and typecheck for production:

```bash
pnpm typecheck
pnpm build
pnpm preview
```

## Replacing Art / Adding Themes

Each theme under `public/themes/<theme-id>/` consists of:

1. `manifest.json` — defines `renderer` (`"realistic"` or `"lcd"`), CSS palette tokens (`palette`), canvas scene colors (`scene`), and `spriteDir` (`"sprites/"`).
2. `sprites/<speciesId>.png` *(optional)* — per-species sprite override. Any species with a matching PNG in `sprites/` is drawn from that image; missing files fall back seamlessly to the procedural renderer.
