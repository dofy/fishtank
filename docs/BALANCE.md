# Balance Provenance (`PC FISH: Taskbar Aquarium`)

This project reproduces the progression and breeding loop of **PC FISH: Taskbar Aquarium** ([Steam app 4842670](https://store.steampowered.com/app/4842670/PC_FISH_Taskbar_Aquarium/)).

Constants in `src/core/balance.ts` are tagged either **SOURCE** (taken directly from published community guides for *PC FISH*) or **TUNED** (chosen to fit the source curves where the original does not expose raw numbers).

## 1. Hearts & Breeding Economy (SOURCE)

| Parameter | Value | Provenance |
| :--- | :--- | :--- |
| `HEART_COST_PER_BREED` | `1` | 1 heart consumed per breeding attempt |
| `HEART_MAX` | `5` | Maximum heart capacity |
| `HEART_REGEN_MS` | `420,000` (7 min) | ~1 heart every 7 minutes (~8.57 hearts/hour) |
| `SYNTHESIS_INPUT_COUNT` | `10` | 10 same-tier fish merge into 1 fish of `tier + 1` |
| `TRADE_HUB_LEVEL` | `4` | Aquarium level gate for trading |

## 2. Aquarium Level & Tank Capacity (SOURCE)

| Level | Cumulative EXP | EXP Delta | Tank Capacity | Unlocks |
| :---: | :---: | :---: | :---: | :--- |
| 1 | 0 | — | 3 | 3 Starter Fish + 3 Starter Decos (`kelp`, `rocks`, `shell`) |
| 2 | 10 | +10 | 4 | Staghorn Coral (`coral`) |
| 3 | 60 | +50 | 5 | Starfish Rock (`starfish`) |
| 4 | 260 | +200 | 6 | Sunken Driftwood (`driftwood`) + Trade Hub |
| 5 | 760 | +500 | 7 | Glowing Anemone (`anemone`) |
| 6 | 1,760 | +1,000 | 8 | Stone Archway (`arch`) |
| 7 | 4,760 | +3,000 | 9 | Treasure Chest (`chest`) |
| 8 | 12,760 | +8,000 | 10 | Ancient Anchor (`anchor`) |
| 9 | 27,760 | +15,000 | 11 | Sunken Castle (`castle`) |
| 10 | 57,760 | +30,000 | 12 | Abyssal Idol (`statue`) |

## 3. Offspring Tier Probability Matrix (SOURCE)

Percentages for offspring tiers `1★` through `5★` given parent tiers `low+high`:

| Parent Pairing | 1★ Common | 2★ Uncommon | 3★ Rare | 4★ Legendary | 5★ Mythic |
| :---: | :---: | :---: | :---: | :---: | :---: |
| `0+0` | 100% | 0% | 0% | 0% | 0% |
| `0+1` | 90% | 10% | 0% | 0% | 0% |
| `1+1` | 76% | 20% | 4% | 0% | 0% |
| `1+2` | 48.9% | 41.6% | 9.5% | 0% | 0% |
| `2+2` / `1+3` | 37.7% | 44.3% | 15% | 3% | 0% |
| `2+3` / `1+4` | 0% | 50.5% | 43% | 6.5% | 0% |
| `3+3` / `2+4` | 0% | 40.5% | 47.5% | 10% | 2% |
| `3+4` / `2+5` | 0% | 0% | 52.1% | 44.4% | 3.5% |
| `4+4` / `3+5` | 0% | 0% | 43.7% | 51.3% | 5% |
| `4+5` | 0% | 0% | 0% | 70% | 30% |
| `5+5` | 0% | 0% | 0% | 45% | 55% |

## 4. Tuned Parameters (TUNED)

- **Breeding uses per fish (`USES_BY_TIER`)**: `{ 0: 8, 1: 5, 2: 4, 3: 3, 4: 2, 5: 2 }`. Higher-tier fish have fewer uses, feeding exhausted duplicates into the 10-to-1 synthesis loop.
- **Maturation time (`GROWTH_MS_BY_TIER`)**: scales from 2m (Starter) and 5m (1★) up to 60m (5★), matching the 7-minute heart cadence.
- **Maturation EXP (`EXP_BY_TIER`)**: `{ 0: 4, 1: 10, 2: 40, 3: 160, 4: 640, 5: 2560 }` (`4x` per tier), multiplied by `1 + 0.25 * (grade - 1)`. Your first 1★ fry maturing reaches Level 2 (`10 EXP`) immediately.
- **Season crafting (`SEASON_RECIPES`)**: mirrors the original Season 1 structure (1 keystone material + 3 stacks of 3 materials at required minimum tiers = 10 fish per craft).
